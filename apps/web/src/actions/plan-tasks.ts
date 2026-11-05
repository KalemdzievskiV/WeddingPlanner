"use server";

import { prisma } from "@svadba/db";
import { pickLocalized, plannedVendorSchema, PLANNED_VENDOR_STATUSES, scheduleItemSchema, taskSchema, type Locale } from "@svadba/shared";
import { revalidatePath } from "next/cache";
import { zodFieldErrors, type FormState } from "@/lib/form";
import { editableWedding } from "@/lib/wedding";

const refresh = () => revalidatePath("/", "layout");

// ─── Checklist ───

export async function saveTaskAction(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  const parsed = taskSchema.safeParse({
    title: fd.get("title") ?? "",
    monthsBefore: fd.get("monthsBefore") ?? "",
    dueDate: fd.get("dueDate") ?? "",
    assignee: fd.get("assignee") ?? "",
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const weddingId = access.wedding.id;
  if (id) await prisma.task.updateMany({ where: { id, weddingId }, data: parsed.data });
  else {
    const sortOrder = await prisma.task.count({ where: { weddingId } });
    await prisma.task.create({ data: { ...parsed.data, weddingId, sortOrder } });
  }
  refresh();
  return { ok: true };
}

export async function toggleTaskAction(id: string, done: boolean): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  await prisma.task.updateMany({ where: { id, weddingId: access.wedding.id }, data: { done, doneAt: done ? new Date() : null } });
  refresh();
  return { ok: true };
}

export async function deleteTaskAction(id: string): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  await prisma.task.deleteMany({ where: { id, weddingId: access.wedding.id } });
  refresh();
  return { ok: true };
}

// ─── Day-of schedule ───

export async function saveScheduleItemAction(
  eventId: string,
  id: string | null,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  const weddingId = access.wedding.id;
  if (!(await prisma.weddingEvent.findFirst({ where: { id: eventId, weddingId } }))) return { formError: "generic" };
  const parsed = scheduleItemSchema.safeParse({
    time: fd.get("time") ?? "",
    title: fd.get("title") ?? "",
    responsible: fd.get("responsible") ?? "",
    place: fd.get("place") ?? "",
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  if (id) await prisma.scheduleItem.updateMany({ where: { id, weddingId }, data: parsed.data });
  else await prisma.scheduleItem.create({ data: { ...parsed.data, weddingId, eventId } });
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

// ─── Vendors in the plan ───

export async function savePlannedVendorAction(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  const parsed = plannedVendorSchema.safeParse({
    name: fd.get("name") ?? "",
    kind: fd.get("kind") ?? "",
    contact: fd.get("contact") ?? "",
    status: fd.get("status") ?? "CONSIDERING",
    notes: fd.get("notes") ?? "",
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const weddingId = access.wedding.id;
  if (id) await prisma.plannedVendor.updateMany({ where: { id, weddingId }, data: parsed.data });
  else await prisma.plannedVendor.create({ data: { ...parsed.data, weddingId } });
  refresh();
  return { ok: true };
}

export async function setPlannedVendorStatusAction(id: string, status: "CONSIDERING" | "BOOKED"): Promise<FormState> {
  const access = await editableWedding();
  if (!access || !PLANNED_VENDOR_STATUSES.includes(status)) return { formError: "forbidden" };
  await prisma.plannedVendor.updateMany({ where: { id, weddingId: access.wedding.id }, data: { status } });
  refresh();
  return { ok: true };
}

export async function deletePlannedVendorAction(id: string): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  // Linked budget lines stay; they just lose the link.
  await prisma.plannedVendor.deleteMany({ where: { id, weddingId: access.wedding.id } });
  refresh();
  return { ok: true };
}

const CATEGORY_FOR: Record<string, string> = { VENUE: "venue", BAND: "music", PHOTO_VIDEO: "photo-video" };

/**
 * "Add to my wedding" from a vendor's public page (decision 71).
 * Optionally picks a menu or package, which becomes a linked budget line.
 */
export async function addCatalogVendorAction(
  businessId: string,
  status: "CONSIDERING" | "BOOKED",
  packageRef: { kind: "menu" | "package"; id: string } | null,
  locale: Locale,
): Promise<FormState> {
  const access = await editableWedding();
  if (!access || !PLANNED_VENDOR_STATUSES.includes(status)) return { formError: "forbidden" };
  const weddingId = access.wedding.id;
  const business = await prisma.business.findFirst({ where: { id: businessId, status: "APPROVED" } });
  if (!business) return { formError: "generic" };

  let line: { name: string; amount: number; currency: "EUR" | "MKD"; perPerson: boolean } | null = null;
  if (packageRef?.kind === "menu") {
    const m = await prisma.menuPackage.findFirst({ where: { id: packageRef.id, businessId } });
    if (m) line = { name: pickLocalized(m, "name", locale), amount: m.pricePerPerson, currency: m.currency, perPerson: true };
  } else if (packageRef?.kind === "package") {
    const p = await prisma.servicePackage.findFirst({ where: { id: packageRef.id, businessId } });
    if (p) line = { name: pickLocalized(p, "name", locale), amount: p.price, currency: p.currency, perPerson: false };
  }

  const existing = await prisma.plannedVendor.findFirst({ where: { weddingId, businessId } });
  const planned = existing
    ? await prisma.plannedVendor.update({ where: { id: existing.id }, data: { status } })
    : await prisma.plannedVendor.create({ data: { weddingId, businessId, name: business.name, status } });

  if (line) {
    const category =
      (await prisma.budgetCategory.findFirst({ where: { weddingId, slug: CATEGORY_FOR[business.category] } })) ??
      (await prisma.budgetCategory.findFirst({ where: { weddingId }, orderBy: { sortOrder: "asc" } }));
    if (category) {
      const reception = await prisma.weddingEvent.findFirst({ where: { weddingId, type: "RECEPTION" } });
      await prisma.expense.create({
        data: {
          weddingId,
          categoryId: category.id,
          name: `${business.name} · ${line.name}`,
          costType: line.perPerson ? "PER_PERSON" : "FIXED",
          amount: line.amount,
          currency: line.currency,
          eventId: line.perPerson ? (reception?.id ?? null) : null,
          plannedVendorId: planned.id,
        },
      });
    }
  }
  refresh();
  return { ok: true };
}
