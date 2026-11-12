"use server";

import { prisma } from "@svadba/db";
import {
  FLOOR_ITEM_KINDS,
  FLOOR_ITEM_MIN,
  FLOOR_ITEM_SIZE,
  floorItemSchema,
  isLocale,
  PLAN_HEIGHT,
  PLAN_WIDTH,
  TABLE_SHAPES,
  tableSchema,
  type FloorItemKind,
  type TableShape,
} from "@svadba/shared";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { zodFieldErrors, type FormState } from "@/lib/form";
import { ensureCouple, fillHeadTable } from "@/lib/head-table";
import { autoSeatPlan } from "@/lib/auto-seat";
import { freeSeats, takenSeats } from "@/lib/seating";
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

  let becameHead = false;
  if (id) {
    const before = await prisma.seatingTable.findFirst({ where: { id, weddingId }, select: { shape: true } });
    if (!before) return { formError: "generic" };
    await prisma.seatingTable.update({ where: { id }, data: parsed.data });
    becameHead = before.shape !== "HEAD" && parsed.data.shape === "HEAD";
  } else {
    becameHead = parsed.data.shape === "HEAD";
    const n = await prisma.seatingTable.count({ where: { eventId } });
    // New tables appear in a loose grid so they don't stack on top of each other.
    const col = n % 9;
    const row = Math.floor(n / 9) % 8;
    await prisma.seatingTable.create({
      data: {
        ...parsed.data,
        weddingId,
        eventId,
        sortOrder: n,
        x: parsed.data.shape === "HEAD" ? PLAN_WIDTH / 2 : 130 + col * 215,
        y: parsed.data.shape === "HEAD" ? 70 : 230 + row * 145,
      },
    });
  }
  // A head table added by hand gets the couple and the wedding party when it is the event's only one (decision 121).
  if (becameHead && (await prisma.seatingTable.count({ where: { eventId, shape: "HEAD" } })) === 1) {
    await ensureCouple(weddingId);
    await fillHeadTable(weddingId, { create: false, eventId });
  }
  refresh();
  return { ok: true };
}

/** "Постави главна маса": creates the head table if missing and seats the wedding party there (decision 102). */
export async function headTableAction(eventId: string, locale: string): Promise<FormState> {
  const access = await seatingAccess();
  if (!access || !isLocale(locale)) return { formError: "forbidden" };
  const event = await prisma.weddingEvent.findFirst({ where: { id: eventId, weddingId: access.wedding.id, hasSeating: true } });
  if (!event) return { formError: "generic" };
  await ensureCouple(access.wedding.id);
  await fillHeadTable(access.wedding.id, { create: true, locale, eventId });
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
      rotation: ((Math.round(rotation) % 360) + 360) % 360,
    },
  });
  return { ok: true };
}

/** Seats guests at a table on its first free chairs, in the given order (moving them from any other table). */
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
  const allowed = new Set(invited.map((i) => i.guestId));
  // Guests already at this table keep their chairs.
  const here = await prisma.tableSeat.findMany({ where: { tableId, guestId: { in: [...allowed] } }, select: { guestId: true } });
  const ids = guestIds.filter((id, i) => allowed.has(id) && guestIds.indexOf(id) === i && !here.some((h) => h.guestId === id));
  const free = freeSeats(table.seats, table.hiddenSeats, await takenSeats(tableId), ids.length);
  await prisma.$transaction(
    ids.map((guestId, i) =>
      prisma.tableSeat.upsert({
        where: { guestId_eventId: { guestId, eventId: table.eventId } },
        update: { tableId, seat: free[i]! },
        create: { guestId, tableId, eventId: table.eventId, seat: free[i]! },
      }),
    ),
  );
  refresh();
  return { ok: true };
}

/**
 * Puts a guest on a chair (decision 133). `seat` null: the table's first free chair. A taken chair swaps:
 * its guest moves to the chair this guest came from, or becomes unseated if this guest had none.
 */
export async function placeGuestAction(guestId: string, tableId: string, seat: number | null): Promise<FormState> {
  const access = await seatingAccess();
  if (!access || typeof guestId !== "string" || (seat !== null && (!Number.isInteger(seat) || seat < 0 || seat > 500))) {
    return { formError: "forbidden" };
  }
  const weddingId = access.wedding.id;
  const table = await prisma.seatingTable.findFirst({ where: { id: tableId, weddingId } });
  if (!table) return { formError: "generic" };
  const eventId = table.eventId;
  const invited = await prisma.guestInvitation.findFirst({ where: { guestId, eventId, rsvp: { not: "NO" }, guest: { weddingId } } });
  if (!invited) return { formError: "generic" };
  if (seat !== null && table.hiddenSeats.includes(seat)) return { formError: "generic" };
  const target = seat ?? freeSeats(table.seats, table.hiddenSeats, await takenSeats(tableId, [guestId]), 1)[0]!;
  await prisma.$transaction(async (tx) => {
    const mine = await tx.tableSeat.findUnique({ where: { guestId_eventId: { guestId, eventId } } });
    if (mine && mine.tableId === tableId && mine.seat === target) return;
    const other = await tx.tableSeat.findUnique({ where: { tableId_seat: { tableId, seat: target } } });
    if (mine) await tx.tableSeat.delete({ where: { guestId_eventId: { guestId, eventId } } });
    if (other) {
      await (mine
        ? tx.tableSeat.update({ where: { guestId_eventId: { guestId: other.guestId, eventId } }, data: { tableId: mine.tableId, seat: mine.seat } })
        : tx.tableSeat.delete({ where: { guestId_eventId: { guestId: other.guestId, eventId } } }));
    }
    await tx.tableSeat.create({ data: { guestId, tableId, eventId, seat: target } });
  });
  refresh();
  return { ok: true };
}

/** Hides an empty chair from the plan, or shows it again (decision 133). */
export async function hideSeatAction(tableId: string, seat: number, hidden: boolean): Promise<FormState> {
  const access = await seatingAccess();
  if (!access || !Number.isInteger(seat) || seat < 0) return { formError: "forbidden" };
  const table = await prisma.seatingTable.findFirst({ where: { id: tableId, weddingId: access.wedding.id } });
  if (!table || seat >= table.seats) return { formError: "generic" };
  if (hidden && (await prisma.tableSeat.count({ where: { tableId, seat } }))) return { formError: "generic" };
  const rest = table.hiddenSeats.filter((s) => s !== seat && s < table.seats);
  await prisma.seatingTable.update({ where: { id: tableId }, data: { hiddenSeats: hidden ? [...rest, seat].sort((a, b) => a - b) : rest } });
  refresh();
  return { ok: true };
}

/**
 * "Seat guests automatically" (decision 134): unseated guests who are coming (Yes first, then waiting) go on free
 * chairs. A family stays at one table when one has room; bride's and groom's sides aren't mixed where possible.
 * Head tables are left alone and nobody already seated moves. Returns who was seated, for Undo.
 */
export async function autoSeatAction(eventId: string): Promise<FormState & { seated?: string[]; left?: number }> {
  const access = await seatingAccess();
  if (!access) return { formError: "forbidden" };
  const weddingId = access.wedding.id;
  const event = await prisma.weddingEvent.findFirst({ where: { id: eventId, weddingId, hasSeating: true } });
  if (!event) return { formError: "generic" };
  const [tables, invitations] = await Promise.all([
    prisma.seatingTable.findMany({
      where: { eventId, shape: { not: "HEAD" } },
      orderBy: { sortOrder: "asc" },
      include: { guests: { select: { seat: true, guest: { select: { household: { select: { side: true } } } } } } },
    }),
    prisma.guestInvitation.findMany({
      where: { eventId, rsvp: { not: "NO" }, guest: { weddingId, seats: { none: { eventId } } } },
      select: { rsvp: true, guest: { select: { id: true, householdId: true, household: { select: { side: true } } } } },
      orderBy: [{ guest: { household: { createdAt: "asc" } } }, { guest: { sortOrder: "asc" } }],
    }),
  ]);
  const plan = autoSeatPlan(
    tables.map((tb) => ({
      id: tb.id,
      seats: tb.seats,
      hidden: tb.hiddenSeats,
      taken: tb.guests.map((g) => g.seat),
      sides: tb.guests.map((g) => g.guest.household.side),
    })),
    invitations.map((i) => ({ id: i.guest.id, family: i.guest.householdId, side: i.guest.household.side, yes: i.rsvp === "YES" })),
  );
  await prisma.$transaction(
    plan.map((p) => prisma.tableSeat.create({ data: { guestId: p.guestId, tableId: p.tableId, eventId, seat: p.seat } })),
  );
  refresh();
  return { ok: true, seated: plan.map((p) => p.guestId), left: invitations.length - plan.length };
}

/** Undo for "Seat guests automatically": unseats exactly the guests it seated. */
export async function undoAutoSeatAction(eventId: string, guestIds: string[]): Promise<FormState> {
  const access = await seatingAccess();
  if (!access || !Array.isArray(guestIds) || guestIds.length > 2000) return { formError: "forbidden" };
  await prisma.tableSeat.deleteMany({ where: { eventId, guestId: { in: guestIds }, guest: { weddingId: access.wedding.id } } });
  refresh();
  return { ok: true };
}

/** Seating plan look (decision 132): coloured or plain figures, full or first names. */
export async function seatingDisplayAction(display: { plain: boolean; firstNames: boolean }): Promise<FormState> {
  const access = await editableWedding();
  if (!access || typeof display?.plain !== "boolean" || typeof display.firstNames !== "boolean") return { formError: "forbidden" };
  await prisma.wedding.update({
    where: { id: access.wedding.id },
    data: { seatPlainFigures: display.plain, seatFirstNames: display.firstNames },
  });
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

// ─── Room elements (decision 119) ───

/** Adds a dance floor, band or labelled box (placed in the middle of the plan), or renames one. */
export async function saveFloorItemAction(eventId: string, id: string | null, input: unknown): Promise<FormState> {
  const access = await seatingAccess();
  if (!access) return { formError: "forbidden" };
  const weddingId = access.wedding.id;
  const parsed = floorItemSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  if (id) {
    const { count } = await prisma.floorItem.updateMany({ where: { id, weddingId }, data: { name: parsed.data.name } });
    if (!count) return { formError: "generic" };
  } else {
    const event = await prisma.weddingEvent.findFirst({ where: { id: eventId, weddingId, hasSeating: true } });
    if (!event) return { formError: "generic" };
    await prisma.floorItem.create({
      data: { ...parsed.data, weddingId, eventId, x: PLAN_WIDTH / 2, y: PLAN_HEIGHT / 2, ...FLOOR_ITEM_SIZE[parsed.data.kind] },
    });
  }
  refresh();
  return { ok: true };
}

/** Saves a room element's position, size and rotation after dragging, resizing or rotating. */
export async function moveFloorItemAction(
  id: string,
  box: { x: number; y: number; width: number; height: number; rotation: number },
): Promise<FormState> {
  const access = await seatingAccess();
  const { x, y, width, height, rotation } = box ?? {};
  if (!access || ![x, y, width, height, rotation].every(Number.isFinite)) return { formError: "forbidden" };
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  await prisma.floorItem.updateMany({
    where: { id, weddingId: access.wedding.id },
    data: {
      x: clamp(x, 0, PLAN_WIDTH),
      y: clamp(y, 0, PLAN_HEIGHT),
      width: clamp(width, FLOOR_ITEM_MIN, PLAN_WIDTH),
      height: clamp(height, FLOOR_ITEM_MIN, PLAN_HEIGHT),
      rotation: ((Math.round(rotation) % 360) + 360) % 360,
    },
  });
  return { ok: true };
}

export async function deleteFloorItemAction(id: string): Promise<FormState> {
  const access = await seatingAccess();
  if (!access) return { formError: "forbidden" };
  await prisma.floorItem.deleteMany({ where: { id, weddingId: access.wedding.id } });
  refresh();
  return { ok: true };
}

// ─── "Add element" picker (decision 128) ───

const clampPoint = (x: number, y: number) => ({
  x: Math.min(PLAN_WIDTH, Math.max(0, Number.isFinite(x) ? x : PLAN_WIDTH / 2)),
  y: Math.min(PLAN_HEIGHT, Math.max(0, Number.isFinite(y) ? y : PLAN_HEIGHT / 2)),
});
const DEFAULT_SEATS: Record<TableShape, number> = { LONG: 12, ROUND: 10, HEAD: 6, SQUARE: 8, ELLIPSE: 10, HALF_ROUND: 6, ROW: 8 };

/** Adds a table of this shape at (x, y) with a numbered name and default seats. A first head table gets the party. */
export async function addTableAction(eventId: string, shape: TableShape, x: number, y: number): Promise<FormState & { id?: string }> {
  const access = await seatingAccess();
  if (!access || !TABLE_SHAPES.includes(shape)) return { formError: "forbidden" };
  const weddingId = access.wedding.id;
  const event = await prisma.weddingEvent.findFirst({ where: { id: eventId, weddingId, hasSeating: true } });
  if (!event) return { formError: "generic" };
  const t = await getTranslations("plan.seating");
  const n = await prisma.seatingTable.count({ where: { eventId } });
  const numbered = await prisma.seatingTable.count({ where: { eventId, shape: { not: "HEAD" } } });
  const table = await prisma.seatingTable.create({
    data: {
      weddingId,
      eventId,
      shape,
      seats: DEFAULT_SEATS[shape],
      name: shape === "HEAD" ? t("headTableName") : t("tableNumber", { n: numbered + 1 }),
      sortOrder: n,
      ...clampPoint(x, y),
    },
  });
  if (shape === "HEAD" && (await prisma.seatingTable.count({ where: { eventId, shape: "HEAD" } })) === 1) {
    await ensureCouple(weddingId);
    await fillHeadTable(weddingId, { create: false, eventId });
  }
  refresh();
  return { ok: true, id: table.id };
}

/** Adds a room element of this kind at (x, y) with its default name and size. */
export async function addFloorItemAction(eventId: string, kind: FloorItemKind, x: number, y: number): Promise<FormState & { id?: string }> {
  const access = await seatingAccess();
  if (!access || !FLOOR_ITEM_KINDS.includes(kind)) return { formError: "forbidden" };
  const weddingId = access.wedding.id;
  const event = await prisma.weddingEvent.findFirst({ where: { id: eventId, weddingId, hasSeating: true } });
  if (!event) return { formError: "generic" };
  const t = await getTranslations("plan.seating");
  const item = await prisma.floorItem.create({
    data: { weddingId, eventId, kind, name: t(`items.${kind}`), ...clampPoint(x, y), ...FLOOR_ITEM_SIZE[kind] },
  });
  refresh();
  return { ok: true, id: item.id };
}
