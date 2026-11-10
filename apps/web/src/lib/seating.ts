import "server-only";
import { prisma } from "@svadba/db";
import type { FloorItemRow, SeatGuest, TableRow } from "@/components/plan/seating-planner";

/** Seating events of a plan, in order. */
export function seatingEvents(weddingId: string) {
  return prisma.weddingEvent.findMany({ where: { weddingId, hasSeating: true }, orderBy: { sortOrder: "asc" } });
}

/** Tables, room elements and seatable guests of one event, shaped for the seating planner. */
export async function loadSeating(eventId: string): Promise<{ tables: TableRow[]; items: FloorItemRow[]; guests: SeatGuest[] }> {
  const [tables, items, invitations] = await Promise.all([
    prisma.seatingTable.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: "asc" }],
      include: { guests: { select: { guestId: true } } },
    }),
    prisma.floorItem.findMany({ where: { eventId }, orderBy: { createdAt: "asc" } }),
    prisma.guestInvitation.findMany({
      where: { eventId, rsvp: { not: "NO" } },
      include: { guest: { include: { household: { select: { id: true, name: true } } } } },
      orderBy: [{ guest: { household: { createdAt: "asc" } } }, { guest: { sortOrder: "asc" } }],
    }),
  ]);
  return {
    tables: tables.map((tb) => ({
      id: tb.id,
      name: tb.name,
      shape: tb.shape,
      seats: tb.seats,
      x: tb.x,
      y: tb.y,
      rotation: tb.rotation,
      guestIds: tb.guests.map((g) => g.guestId),
    })),
    items: items.map((it) => ({
      id: it.id,
      kind: it.kind,
      name: it.name,
      x: it.x,
      y: it.y,
      width: it.width,
      height: it.height,
      rotation: it.rotation,
    })),
    guests: invitations.map((i) => ({
      id: i.guest.id,
      name: i.guest.name,
      household: i.guest.household.name,
      householdId: i.guest.household.id,
      child: i.guest.ageGroup === "CHILD",
      role: i.guest.role,
    })),
  };
}
