"use server";

import { prisma } from "@svadba/db";
import { PLAN_HEIGHT, PLAN_WIDTH, tableSchema } from "@svadba/shared";
import { revalidatePath } from "next/cache";
import { zodFieldErrors, type FormState } from "@/lib/form";
import { editableWedding, premiumLocked } from "@/lib/wedding";

const refresh = () => revalidatePath("/", "layout");

async function seatingAccess() {
  const access = await editableWedding();
  // Seating is a premium feature (decision 21); free while the paywall is off.
  if (!access || premiumLocked(access.wedding)) return null;
  return access;
}

export async function saveTableAction(
  eventId: string,
  id: string | null,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const access = await seatingAccess();
  if (!access) return { formError: "forbidden" };
  const weddingId = access.wedding.id;
  const event = await prisma.weddingEvent.findFirst({ where: { id: eventId, weddingId } });
  if (!event) return { formError: "generic" };
  const parsed = tableSchema.safeParse({ name: fd.get("name"), shape: fd.get("shape"), seats: fd.get("seats") });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  if (id) {
    const { count } = await prisma.seatingTable.updateMany({ where: { id, weddingId }, data: parsed.data });
    if (!count) return { formError: "generic" };
  } else {
    const n = await prisma.seatingTable.count({ where: { eventId } });
    // New tables appear in a loose grid so they don't stack on top of each other.
    const col = n % 5;
    const row = Math.floor(n / 5) % 4;
    await prisma.seatingTable.create({
      data: {
        ...parsed.data,
        weddingId,
        eventId,
        sortOrder: n,
        x: parsed.data.shape === "HEAD" ? PLAN_WIDTH / 2 : 110 + col * 190,
        y: parsed.data.shape === "HEAD" ? 70 : 220 + row * 130,
      },
    });
  }
  refresh();
  return { ok: true };
}

export async function deleteTableAction(id: string): Promise<FormState> {
  const access = await seatingAccess();
  if (!access) return { formError: "forbidden" };
  await prisma.seatingTable.deleteMany({ where: { id, weddingId: access.wedding.id } });
  refresh();
  return { ok: true };
}

/** Saves a table's position after dragging on the floor plan. */
export async function moveTableAction(id: string, x: number, y: number, rotation: number): Promise<FormState> {
  const access = await seatingAccess();
  if (!access || ![x, y, rotation].every(Number.isFinite)) return { formError: "forbidden" };
  await prisma.seatingTable.updateMany({
    where: { id, weddingId: access.wedding.id },
    data: {
      x: Math.min(PLAN_WIDTH, Math.max(0, x)),
      y: Math.min(PLAN_HEIGHT, Math.max(0, y)),
      rotation: ((Math.round(rotation / 15) * 15) % 360 + 360) % 360,
    },
  });
  return { ok: true };
}

/** Seats guests at a table (moving them from any other table for the same event). */
export async function seatGuestsAction(tableId: string, guestIds: string[]): Promise<FormState> {
  const access = await seatingAccess();
  if (!access || !Array.isArray(guestIds) || guestIds.length > 60) return { formError: "forbidden" };
  const weddingId = access.wedding.id;
  const table = await prisma.seatingTable.findFirst({ where: { id: tableId, weddingId } });
  if (!table) return { formError: "generic" };
  // Only guests invited to this event who haven't declined.
  const invited = await prisma.guestInvitation.findMany({
    where: { eventId: table.eventId, guestId: { in: guestIds }, rsvp: { not: "NO" }, guest: { weddingId } },
    select: { guestId: true },
  });
  await prisma.$transaction(
    invited.map(({ guestId }) =>
      prisma.tableSeat.upsert({
        where: { guestId_eventId: { guestId, eventId: table.eventId } },
        update: { tableId },
        create: { guestId, tableId, eventId: table.eventId },
      }),
    ),
  );
  refresh();
  return { ok: true };
}

export async function unseatGuestAction(guestId: string, eventId: string): Promise<FormState> {
  const access = await seatingAccess();
  if (!access) return { formError: "forbidden" };
  await prisma.tableSeat.deleteMany({ where: { guestId, eventId, guest: { weddingId: access.wedding.id } } });
  refresh();
  return { ok: true };
}
