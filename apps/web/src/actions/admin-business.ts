"use server";

import { prisma } from "@svadba/db";
import { CLAIM_LINK_DAYS, isLocale, newBusinessSchema, rejectSchema } from "@svadba/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { newToken, uniqueBusinessSlug } from "@/lib/business";
import { sendAuthEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { zodFieldErrors, type FormState } from "@/lib/form";
import { getCurrentUser } from "@/lib/session";

async function isAdmin() {
  return !!(await getCurrentUser())?.roles.includes("ADMIN");
}

async function emailOwners(businessId: string, kind: "approved" | "rejected", reason?: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { members: { where: { role: "OWNER" }, include: { user: true } } },
  });
  if (!business) return;
  for (const { user } of business.members) {
    const path = kind === "approved" ? `v/${business.slug}` : `vendor/${business.id}`;
    await sendAuthEmail({
      to: user.email,
      name: user.name,
      locale: user.locale,
      kind,
      url: `${env.appUrl}/${user.locale}/${path}`,
      business: business.name,
      reason,
    });
  }
}

export async function approveBusinessAction(id: string): Promise<FormState> {
  if (!(await isAdmin())) return { formError: "forbidden" };
  await prisma.business.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date(), rejectionReason: null },
  });
  await emailOwners(id, "approved");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function rejectBusinessAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdmin())) return { formError: "forbidden" };
  const parsed = rejectSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  await prisma.business.update({ where: { id }, data: { status: "REJECTED", rejectionReason: parsed.data.reason } });
  await emailOwners(id, "rejected", parsed.data.reason);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Hide a profile, or show it again (back to approved if it was approved before, else draft). */
export async function setHiddenAction(id: string, hidden: boolean): Promise<FormState> {
  if (!(await isAdmin())) return { formError: "forbidden" };
  const business = await prisma.business.findUnique({ where: { id } });
  if (!business) return { formError: "generic" };
  await prisma.business.update({
    where: { id },
    data: { status: hidden ? "HIDDEN" : business.approvedAt ? "APPROVED" : "DRAFT" },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createClaimLinkAction(id: string): Promise<FormState> {
  if (!(await isAdmin())) return { formError: "forbidden" };
  await prisma.business.update({
    where: { id },
    data: { claimToken: newToken(), claimExpiresAt: new Date(Date.now() + CLAIM_LINK_DAYS * 86_400_000) },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Admin creates a listing with no owner yet; the real owner takes it over with a claim link. */
export async function adminCreateBusinessAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = formData.get("locale");
  if (!(await isAdmin()) || !isLocale(locale)) return { formError: "forbidden" };
  const parsed = newBusinessSchema.safeParse({
    category: formData.get("category"),
    name: formData.get("name"),
    cityId: formData.get("cityId"),
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const business = await prisma.business.create({
    data: {
      ...parsed.data,
      slug: await uniqueBusinessSlug(parsed.data.name),
      unmarkedDays: parsed.data.category === "VENUE" ? "FREE" : "UNKNOWN",
      claimToken: newToken(),
      claimExpiresAt: new Date(Date.now() + CLAIM_LINK_DAYS * 86_400_000),
    },
  });
  redirect(`/${locale}/admin/businesses/${business.id}`);
}
