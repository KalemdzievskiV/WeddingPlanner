import "server-only";
import { prisma } from "@svadba/db";
import type { FloorItemRow, MeasureLineRow, SeatGuest, TableRow } from "@/components/plan/seating-planner";

/** Seating events of a plan, in order. */
export function seatingEvents(weddingId: string) {
  return prisma.weddingEvent.findMany({ where: { weddingId, hasSeating: true }, orderBy: { sortOrder: "asc" } });
}

/** Tables, room elements and seatable guests of one event, shaped for the seating planner. */
export async function loadSeating(
  eventId: string,
): Promise<{ tables: TableRow[]; items: FloorItemRow[]; guests: SeatGuest[]; lines: MeasureLineRow[]; roomWidthM: number }> {
  const [tables, items, invitations, lines, event] = await Promise.all([
    prisma.seatingTable.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: "asc" }],
      include: { guests: { select: { guestId: true, seat: true }, orderBy: { seat: "asc" } } },
    }),
    prisma.floorItem.findMany({ where: { eventId }, orderBy: { createdAt: "asc" } }),
    prisma.guestInvitation.findMany({
      where: { eventId, rsvp: { not: "NO" } },
      include: { guest: { include: { household: { select: { id: true, name: true, side: true } } } } },
      orderBy: [{ guest: { household: { createdAt: "asc" } } }, { guest: { sortOrder: "asc" } }],
    }),
    prisma.measureLine.findMany({ where: { eventId }, orderBy: { createdAt: "asc" }, select: { id: true, x1: true, y1: true, x2: true, y2: true } }),
    prisma.weddingEvent.findUnique({ where: { id: eventId }, select: { roomWidthM: true } }),
  ]);
  return {
    lines,
    roomWidthM: event?.roomWidthM ?? 30,
    tables: tables.map((tb) => ({
      id: tb.id,
      name: tb.name,
      shape: tb.shape,
      seats: tb.seats,
      x: tb.x,
      y: tb.y,
      rotation: tb.rotation,
      guestIds: tb.guests.map((g) => g.guestId),
      chairs: tb.guests.map((g) => ({ guestId: g.guestId, seat: g.seat })),
      hidden: tb.hiddenSeats,
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
      side: i.guest.household.side,
      rsvp: i.rsvp,
    })),
  };
}

/**
 * The first `count` free chair numbers of a table, lowest first (decision 133). Hidden chairs are skipped;
 * when the table is full the numbers continue past its seats (shown as over capacity).
 */
export function freeSeats(seats: number, hidden: readonly number[], taken: ReadonlySet<number>, count: number): number[] {
  const out: number[] = [];
  const skip = new Set(hidden);
  for (let i = 0; out.length < count && i < seats; i++) if (!taken.has(i) && !skip.has(i)) out.push(i);
  for (let i = seats; out.length < count; i++) if (!taken.has(i)) out.push(i);
  return out;
}

/** Chair numbers already used at a table. */
export async function takenSeats(tableId: string, except: readonly string[] = []) {
  const rows = await prisma.tableSeat.findMany({ where: { tableId, guestId: { notIn: [...except] } }, select: { seat: true } });
  return new Set(rows.map((r) => r.seat));
}
