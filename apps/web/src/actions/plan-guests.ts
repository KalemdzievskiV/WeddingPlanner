"use server";

import { prisma } from "@svadba/db";
import { householdSchema, importSchema, RSVP_VALUES, type Rsvp } from "@svadba/shared";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { newToken } from "@/lib/business";
import { zodFieldErrors, type FormState } from "@/lib/form";
import { editableWedding, guestLimitReached } from "@/lib/wedding";

const refresh = () => revalidatePath("/", "layout");

/** Only event ids that belong to this wedding. */
async function validEventIds(weddingId: string, ids: string[]) {
  const events = await prisma.weddingEvent.findMany({ where: { weddingId, id: { in: ids } }, select: { id: true } });
  return events.map((e) => e.id);
}

/** Creates or updates a household with its members and the events they're invited to. */
export async function saveHouseholdAction(id: string | null, input: unknown): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  const parsed = householdSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const { name, side, notes, guests } = parsed.data;
  const weddingId = access.wedding.id;
  const eventIds = await validEventIds(weddingId, parsed.data.eventIds);

  const existing = id
    ? await prisma.household.findFirst({ where: { id, weddingId }, include: { guests: { select: { id: true } } } })
    : null;
  if (id && !existing) return { formError: "generic" };

  const newCount = guests.filter((g) => !g.id).length;
  const total = await prisma.guest.count({ where: { weddingId } });
  if (guestLimitReached(access.wedding, total, newCount)) return { formError: "guestLimit" };

  await prisma.$transaction(async (tx) => {
    const household = existing
      ? await tx.household.update({ where: { id: existing.id }, data: { name, side, notes } })
      : await tx.household.create({ data: { weddingId, name, side, notes, rsvpToken: newToken() } });

    const keep = new Set(guests.map((g) => g.id).filter(Boolean) as string[]);
    const removed = (existing?.guests ?? []).map((g) => g.id).filter((gid) => !keep.has(gid));
    if (removed.length) await tx.guest.deleteMany({ where: { id: { in: removed }, householdId: household.id } });

    for (const [i, g] of guests.entries()) {
      const guest =
        g.id && keep.has(g.id) && existing?.guests.some((x) => x.id === g.id)
          ? await tx.guest.update({ where: { id: g.id }, data: { name: g.name, ageGroup: g.ageGroup, sortOrder: i } })
          : await tx.guest.create({
              data: { weddingId, householdId: household.id, name: g.name, ageGroup: g.ageGroup, sortOrder: i },
            });
      // Same events for the whole household; keep existing answers.
      await tx.guestInvitation.deleteMany({ where: { guestId: guest.id, eventId: { notIn: eventIds } } });
      await tx.guestInvitation.createMany({
        data: eventIds.map((eventId) => ({ guestId: guest.id, eventId })),
        skipDuplicates: true,
      });
      // Seats only make sense for events the guest is invited to.
      await tx.tableSeat.deleteMany({ where: { guestId: guest.id, eventId: { notIn: eventIds } } });
    }
  });
  refresh();
  return { ok: true };
}

export async function deleteHouseholdAction(id: string): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  await prisma.household.deleteMany({ where: { id, weddingId: access.wedding.id } });
  refresh();
  return { ok: true };
}

/** Clears the whole guest list (e.g. to redo an import). Answers and seats go with the guests. */
export async function deleteAllGuestsAction(): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  await prisma.household.deleteMany({ where: { weddingId: access.wedding.id } });
  refresh();
  return { ok: true };
}

/** Bulk add from a pasted list or a CSV/Excel file (decision 65). */
export async function importGuestsAction(rows: unknown, eventIdsInput: unknown): Promise<FormState & { added?: number }> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  const parsed = importSchema.safeParse(rows);
  if (!parsed.success) return { formError: "importInvalid" };
  const ids = z.array(z.string()).max(20).safeParse(eventIdsInput);
  const weddingId = access.wedding.id;
  const eventIds = await validEventIds(weddingId, ids.success ? ids.data : []);

  const adding = parsed.data.reduce((n, r) => n + r.guests.length, 0);
  const total = await prisma.guest.count({ where: { weddingId } });
  if (guestLimitReached(access.wedding, total, adding)) return { formError: "guestLimit" };

  await prisma.$transaction(
    async (tx) => {
      for (const row of parsed.data) {
        const household = await tx.household.create({
          data: { weddingId, name: row.household, side: row.side, rsvpToken: newToken() },
        });
        for (const [i, g] of row.guests.entries()) {
          await tx.guest.create({
            data: {
              weddingId,
              householdId: household.id,
              name: g.name,
              ageGroup: g.ageGroup,
              sortOrder: i,
              invitations: { create: eventIds.map((eventId) => ({ eventId })) },
            },
          });
        }
      }
    },
    { timeout: 30_000 },
  );
  refresh();
  return { ok: true, added: adding };
}

/** The couple marks an answer themselves (most RSVPs in Macedonia come by phone). */
export async function setRsvpAction(guestId: string, eventId: string, rsvp: Rsvp): Promise<FormState> {
  const access = await editableWedding();
  if (!access || !RSVP_VALUES.includes(rsvp)) return { formError: "forbidden" };
  const guest = await prisma.guest.findFirst({ where: { id: guestId, weddingId: access.wedding.id } });
  if (!guest) return { formError: "generic" };
  await prisma.guestInvitation.updateMany({ where: { guestId, eventId }, data: { rsvp } });
  if (rsvp === "NO") await prisma.tableSeat.deleteMany({ where: { guestId, eventId } });
  refresh();
  return { ok: true };
}

const rsvpAnswersSchema = z.object({
  answers: z
    .array(z.object({ guestId: z.string(), eventId: z.string(), rsvp: z.enum(["YES", "NO"]) }))
    .max(300),
  note: z.string().trim().max(500),
});

/** Public RSVP page (no login): the household's token is the key. */
export async function submitRsvpAction(token: string, input: unknown): Promise<FormState> {
  const parsed = rsvpAnswersSchema.safeParse(input);
  if (!parsed.success || typeof token !== "string") return { formError: "generic" };
  const household = await prisma.household.findUnique({
    where: { rsvpToken: token },
    include: { guests: { include: { invitations: true } }, wedding: { select: { archivedAt: true } } },
  });
  if (!household) return { formError: "invalidLink" };
  if (household.wedding.archivedAt) return { formError: "rsvpClosed" };

  const allowed = new Set(household.guests.flatMap((g) => g.invitations.map((i) => `${g.id}:${i.eventId}`)));
  const answers = parsed.data.answers.filter((a) => allowed.has(`${a.guestId}:${a.eventId}`));
  await prisma.$transaction([
    ...answers.map((a) =>
      prisma.guestInvitation.update({
        where: { guestId_eventId: { guestId: a.guestId, eventId: a.eventId } },
        data: { rsvp: a.rsvp },
      }),
    ),
    ...answers
      .filter((a) => a.rsvp === "NO")
      .map((a) => prisma.tableSeat.deleteMany({ where: { guestId: a.guestId, eventId: a.eventId } })),
    prisma.household.update({
      where: { id: household.id },
      data: { guestNote: parsed.data.note || null, respondedAt: new Date() },
    }),
  ]);
  refresh();
  return { ok: true };
}
