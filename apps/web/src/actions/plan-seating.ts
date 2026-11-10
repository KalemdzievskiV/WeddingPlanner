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
