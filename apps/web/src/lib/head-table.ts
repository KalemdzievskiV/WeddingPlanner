import "server-only";
import { prisma } from "@svadba/db";
import { FLOOR_ITEM_SIZE, HEAD_TABLE_ROLES, PLAN_WIDTH, type FloorItemKind, type Locale } from "@svadba/shared";
import { getTranslations } from "next-intl/server";
import { newToken } from "@/lib/business";
import { freeSeats } from "@/lib/seating";

/**
 * Seats the wedding party (Старосватица, Старосват, Кум, Младоженец, Невеста, Кума) at the head table
 * of every seating event (decision 102). The head table is the event's first HEAD-shaped table.
 * - `create`: add a "Главна маса" where an event has none (new plans and the Seating button).
 * - `guestIds`: only seat these guests (a role was just given); otherwise everyone with a head-table role.
 * - `eventId`: only this event.
 * Seating moves a guest from any other table onto their role's chair; the table grows if the party doesn't fit.
 * With `create`, Reception plans also get a dance floor and a band area if they have none (decision 120).
 */
export async function fillHeadTable(
  weddingId: string,
  opts: { create: false; guestIds?: string[]; eventId?: string } | { create: true; locale: Locale; eventId?: string },
) {
  const events = await prisma.weddingEvent.findMany({
    where: { weddingId, hasSeating: true, ...(opts.eventId ? { id: opts.eventId } : {}) },
    select: { id: true, type: true },
  });
  const guestIds = opts.create ? undefined : opts.guestIds;
  const t = opts.create ? await getTranslations({ locale: opts.locale, namespace: "plan.seating" }) : null;
  const name = t ? t("headTableName") : "";
  for (const event of events) {
    const party = await prisma.guestInvitation.findMany({
      where: {
        eventId: event.id,
        rsvp: { not: "NO" },
        guest: { weddingId, role: { in: [...HEAD_TABLE_ROLES] }, ...(guestIds ? { id: { in: guestIds } } : {}) },
      },
      select: { guestId: true, guest: { select: { role: true } } },
    });
    let table = await prisma.seatingTable.findFirst({
      where: { eventId: event.id, shape: "HEAD" },
      orderBy: { sortOrder: "asc" },
    });
    if (!table && opts.create) {
      table = await prisma.seatingTable.create({
        data: {
          weddingId,
          eventId: event.id,
          name,
          shape: "HEAD",
          seats: HEAD_TABLE_ROLES.length,
          x: PLAN_WIDTH / 2,
          y: 70,
          sortOrder: -1,
        },
      });
    }
    if (table && t && event.type === "RECEPTION") {
      // Dance floor in front of the head table, band to its right (decision 120).
      const defaults: [FloorItemKind, number, number][] = [
        ["DANCE_FLOOR", table.x, table.y + 220],
        ["BAND", Math.min(PLAN_WIDTH - 140, table.x + 400), table.y + 20],
      ];
      for (const [kind, x, y] of defaults) {
        if (await prisma.floorItem.count({ where: { eventId: event.id, kind } })) continue;
        await prisma.floorItem.create({
          data: { weddingId, eventId: event.id, kind, name: t(`items.${kind}`), x, y, ...FLOOR_ITEM_SIZE[kind] },
        });
      }
    }
    if (!table || party.length === 0) continue;
    const tableId = table.id;
    // Each role has its own chair at the head table, left to right (decision 102); taken ones fall back to a free chair.
    const roleIndex = new Map(party.map((p) => [p.guestId, (HEAD_TABLE_ROLES as readonly (string | null)[]).indexOf(p.guest.role)]));
    const ids = party.map((p) => p.guestId);
    const current = await prisma.tableSeat.findMany({ where: { tableId }, select: { guestId: true, seat: true } });
    const already = new Set(current.filter((c) => ids.includes(c.guestId)).map((c) => c.guestId));
    const taken = new Set(current.map((c) => c.seat));
    const toSeat = ids
      .filter((id) => !already.has(id))
      .sort((a, b) => roleIndex.get(a)! - roleIndex.get(b)!);
    const seatFor = new Map<string, number>();
    for (const id of toSeat) {
      const want = roleIndex.get(id)!;
      const seat =
        want >= 0 && want < table.seats && !taken.has(want) && !table.hiddenSeats.includes(want)
          ? want
          : freeSeats(table.seats, table.hiddenSeats, taken, 1)[0]!;
      taken.add(seat);
      seatFor.set(id, seat);
    }
    const top = taken.size ? Math.max(...taken) + 1 : 0;
    await prisma.$transaction([
      ...toSeat.map((guestId) =>
        prisma.tableSeat.upsert({
          where: { guestId_eventId: { guestId, eventId: event.id } },
          update: { tableId, seat: seatFor.get(guestId)! },
          create: { guestId, tableId, eventId: event.id, seat: seatFor.get(guestId)! },
        }),
      ),
      // The table grows if the party doesn't fit.
      ...(top > table.seats ? [prisma.seatingTable.update({ where: { id: tableId }, data: { seats: top } })] : []),
    ]);
  }
}

const firstName = (name: string) => name.trim().split(/\s+/)[0]?.toLocaleLowerCase() ?? "";

/**
 * Every plan keeps a Bride and a Groom guest (decision 121). A missing one is taken from a guest on that side
 * whose first name is the plan's partner name (only when exactly one matches), or created as a one-person family.
 * The couple is invited to every event with the answer "coming".
 * Returns the couple guests that changed (new, given the role or newly invited), so the caller can seat them.
 */
export async function ensureCouple(weddingId: string): Promise<string[]> {
  const wedding = await prisma.wedding.findUnique({ where: { id: weddingId }, select: { partner1: true, partner2: true } });
  if (!wedding) return [];
  const events = await prisma.weddingEvent.findMany({ where: { weddingId }, select: { id: true } });
  const changed = new Set<string>();
  for (const [role, partner] of [
    ["BRIDE", wedding.partner1],
    ["GROOM", wedding.partner2],
  ] as const) {
    let guest = await prisma.guest.findFirst({
      where: { weddingId, role },
      select: { id: true, invitations: { select: { eventId: true, rsvp: true } } },
    });
    if (!guest) {
      const first = firstName(partner);
      const candidates = first
        ? await prisma.guest.findMany({ where: { weddingId, role: null, household: { side: role } }, select: { id: true, name: true } })
        : [];
      const hits = candidates.filter((g) => firstName(g.name) === first);
      const select = { id: true, invitations: { select: { eventId: true, rsvp: true } } } as const;
      guest =
        hits.length === 1
          ? await prisma.guest.update({ where: { id: hits[0]!.id }, data: { role }, select })
          : (
              await prisma.household.create({
                data: {
                  weddingId,
                  name: partner,
                  side: role,
                  rsvpToken: newToken(),
                  guests: { create: { weddingId, name: partner, role } },
                },
                select: { guests: { select } },
              })
            ).guests[0]!;
      changed.add(guest.id);
    }
    const g = guest;
    const missing = events.filter((e) => !g.invitations.some((i) => i.eventId === e.id && i.rsvp === "YES"));
    if (missing.length) {
      changed.add(g.id);
      await prisma.$transaction(
        missing.map((e) =>
          prisma.guestInvitation.upsert({
            where: { guestId_eventId: { guestId: g.id, eventId: e.id } },
            update: { rsvp: "YES" },
            create: { guestId: g.id, eventId: e.id, rsvp: "YES" },
          }),
        ),
      );
    }
  }
  return [...changed];
}

/** Makes sure the couple exists and is invited, and seats whoever changed at their head tables (decision 121). */
export async function ensureCoupleSeated(weddingId: string) {
  const changed = await ensureCouple(weddingId);
  if (changed.length) await fillHeadTable(weddingId, { create: false, guestIds: changed });
}
