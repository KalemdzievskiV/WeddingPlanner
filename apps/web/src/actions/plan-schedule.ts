"use server";

import { prisma } from "@svadba/db";
import { isLocale, pickLocalized, scheduleDaySchema, scheduleItemSchema } from "@svadba/shared";
import { revalidatePath } from "next/cache";
import { zodFieldErrors, type FormState } from "@/lib/form";
import { getTypicalDay } from "@/lib/typical-day";
import { editableWedding } from "@/lib/wedding";

// Day timeline (decisions 105–107).

const refresh = () => revalidatePath("/", "layout");

/** Creates the first day on the wedding date. */
export async function startTimelineAction(): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  await prisma.scheduleDay.create({ data: { weddingId: access.wedding.id, date: access.wedding.date } });
  refresh();
  return { ok: true };
}

export async function saveScheduleDayAction(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  const parsed = scheduleDaySchema.safeParse({ date: fd.get("date") ?? "", startTime: fd.get("startTime") ?? "" });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const weddingId = access.wedding.id;
  if (id) {
    const { count } = await prisma.scheduleDay.updateMany({ where: { id, weddingId }, data: parsed.data });
    if (!count) return { formError: "generic" };
  } else await prisma.scheduleDay.create({ data: { ...parsed.data, weddingId } });
  refresh();
  return { ok: true };
}

export async function deleteScheduleDayAction(id: string): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  await prisma.scheduleDay.deleteMany({ where: { id, weddingId: access.wedding.id } });
  refresh();
  return { ok: true };
}

export async function saveScheduleItemAction(dayId: string, id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  const weddingId = access.wedding.id;
  if (!(await prisma.scheduleDay.findFirst({ where: { id: dayId, weddingId } }))) return { formError: "generic" };
  const parsed = scheduleItemSchema.safeParse({
    title: fd.get("title") ?? "",
    durationMin: fd.get("durationMin") ?? "",
    responsible: fd.get("responsible") ?? "",
    place: fd.get("place") ?? "",
    eventId: fd.get("eventId") ?? "",
    isMain: fd.get("isMain") === "on",
    forAll: fd.get("forAll") === "on",
    forSides: fd.getAll("forSides"),
    forRoles: fd.getAll("forRoles"),
    guestIds: fd.getAll("guestIds"),
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const { guestIds, ...data } = parsed.data;
  // Only this wedding's events and guests.
  if (data.eventId && !(await prisma.weddingEvent.findFirst({ where: { id: data.eventId, weddingId } }))) data.eventId = null;
  const guests = guestIds.length
    ? await prisma.guest.findMany({ where: { id: { in: guestIds }, weddingId }, select: { id: true } })
    : [];
  const guestRows = guests.map((g) => ({ guestId: g.id }));

  if (id) {
    const item = await prisma.scheduleItem.findFirst({ where: { id, weddingId, dayId } });
    if (!item) return { formError: "generic" };
    await prisma.scheduleItem.update({ where: { id }, data: { ...data, guests: { deleteMany: {}, create: guestRows } } });
  } else {
    const last = await prisma.scheduleItem.aggregate({ where: { dayId }, _max: { sortOrder: true } });
    await prisma.scheduleItem.create({
      data: { ...data, weddingId, dayId, sortOrder: (last._max.sortOrder ?? -1) + 1, guests: { create: guestRows } },
    });
  }
  refresh();
  return { ok: true };
}

export async function deleteScheduleItemAction(id: string): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  await prisma.scheduleItem.deleteMany({ where: { id, weddingId: access.wedding.id } });
  refresh();
  return { ok: true };
}

/** Marks an item as a main moment of the day (shown on the overview) or clears the mark. */
export async function setScheduleItemMainAction(id: string, isMain: boolean): Promise<FormState> {
  const access = await editableWedding();
  if (!access || typeof isMain !== "boolean") return { formError: "forbidden" };
  const { count } = await prisma.scheduleItem.updateMany({ where: { id, weddingId: access.wedding.id }, data: { isMain } });
  if (!count) return { formError: "generic" };
  refresh();
  return { ok: true };
}

/** Saves a new order for a day's items; ids not in the day are ignored. */
export async function reorderScheduleAction(dayId: string, ids: string[]): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  const items = await prisma.scheduleItem.findMany({ where: { dayId, weddingId: access.wedding.id }, select: { id: true } });
  const known = new Set(items.map((i) => i.id));
  const order = ids.filter((id) => known.has(id));
  if (order.length !== known.size) return { formError: "generic" };
  await prisma.$transaction(order.map((id, i) => prisma.scheduleItem.update({ where: { id }, data: { sortOrder: i } })));
  refresh();
  return { ok: true };
}

/** Replaces a day's items with the typical MK wedding day: the admin template, or the built-in one (decisions 107, 111). */
export async function fillTypicalDayAction(dayId: string, locale: string): Promise<FormState> {
  const access = await editableWedding();
  if (!access || !isLocale(locale)) return { formError: "forbidden" };
  const weddingId = access.wedding.id;
  const day = await prisma.scheduleDay.findFirst({ where: { id: dayId, weddingId } });
  if (!day) return { formError: "generic" };
  const template = await getTypicalDay();
  const events = await prisma.weddingEvent.findMany({ where: { weddingId }, orderBy: { sortOrder: "asc" }, select: { id: true, type: true } });
  const eventOf = (type: string | null) => (type ? (events.find((e) => e.type === type)?.id ?? null) : null);

  await prisma.$transaction([
    prisma.scheduleItem.deleteMany({ where: { dayId } }),
    prisma.scheduleDay.update({ where: { id: dayId }, data: { startTime: template.startTime } }),
    prisma.scheduleItem.createMany({
      data: template.steps.map((step, i) => ({
        weddingId,
        dayId,
        sortOrder: i,
        title: pickLocalized(step, "title", locale),
        durationMin: step.durationMin,
        eventId: eventOf(step.eventType),
        forAll: step.forAll,
        forSides: step.forSides,
        forRoles: step.forRoles,
      })),
    }),
  ]);
  refresh();
  return { ok: true };
}
