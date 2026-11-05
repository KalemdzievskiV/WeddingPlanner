"use server";

import { prisma } from "@svadba/db";
import { categorySchema, expenseSchema, paymentSchema } from "@svadba/shared";
import { revalidatePath } from "next/cache";
import { zodFieldErrors, type FormState } from "@/lib/form";
import { editableWedding } from "@/lib/wedding";

const refresh = () => revalidatePath("/", "layout");

export async function saveCategoryAction(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  const parsed = categorySchema.safeParse({ name: fd.get("name") });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const weddingId = access.wedding.id;
  if (id) await prisma.budgetCategory.updateMany({ where: { id, weddingId }, data: parsed.data });
  else {
    const sortOrder = await prisma.budgetCategory.count({ where: { weddingId } });
    await prisma.budgetCategory.create({ data: { ...parsed.data, weddingId, sortOrder } });
  }
  refresh();
  return { ok: true };
}

export async function deleteCategoryAction(id: string): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  await prisma.budgetCategory.deleteMany({ where: { id, weddingId: access.wedding.id } });
  refresh();
  return { ok: true };
}

export async function saveExpenseAction(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  const fields = ["categoryId", "name", "costType", "amount", "childPrice", "currency", "eventId", "guestsOverride", "payer", "notes"];
  const parsed = expenseSchema.safeParse(Object.fromEntries(fields.map((f) => [f, fd.get(f) ?? ""])));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const weddingId = access.wedding.id;
  const data = parsed.data;
  if (!(await prisma.budgetCategory.findFirst({ where: { id: data.categoryId, weddingId } }))) return { formError: "generic" };
  if (data.eventId && !(await prisma.weddingEvent.findFirst({ where: { id: data.eventId, weddingId } }))) data.eventId = null;
  if (data.costType === "FIXED") Object.assign(data, { childPrice: null, eventId: null, guestsOverride: null });

  if (id) {
    const { count } = await prisma.expense.updateMany({ where: { id, weddingId }, data });
    if (!count) return { formError: "generic" };
  } else {
    const sortOrder = await prisma.expense.count({ where: { categoryId: data.categoryId } });
    await prisma.expense.create({ data: { ...data, weddingId, sortOrder } });
  }
  refresh();
  return { ok: true };
}

export async function deleteExpenseAction(id: string): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  await prisma.expense.deleteMany({ where: { id, weddingId: access.wedding.id } });
  refresh();
  return { ok: true };
}

export async function savePaymentAction(
  expenseId: string,
  id: string | null,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, weddingId: access.wedding.id } });
  if (!expense) return { formError: "generic" };
  const fields = ["kind", "amount", "currency", "dueDate", "paidAt"];
  const parsed = paymentSchema.safeParse(Object.fromEntries(fields.map((f) => [f, fd.get(f) ?? ""])));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  if (id) await prisma.payment.updateMany({ where: { id, expenseId }, data: parsed.data });
  else await prisma.payment.create({ data: { ...parsed.data, expenseId } });
  refresh();
  return { ok: true };
}

export async function deletePaymentAction(id: string): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  await prisma.payment.deleteMany({ where: { id, expense: { weddingId: access.wedding.id } } });
  refresh();
  return { ok: true };
}

/** Marks a payment paid today, or unpaid. */
export async function setPaymentPaidAction(id: string, paid: boolean): Promise<FormState> {
  const access = await editableWedding();
  if (!access) return { formError: "forbidden" };
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  await prisma.payment.updateMany({
    where: { id, expense: { weddingId: access.wedding.id } },
    data: { paidAt: paid ? today : null },
  });
  refresh();
  return { ok: true };
}
