"use server";

import { prisma } from "@svadba/db";
import { reviewReplySchema, reviewReportSchema, reviewSchema } from "@svadba/shared";
import { revalidatePath } from "next/cache";
import { getBusinessAccess } from "@/lib/business";
import { zodFieldErrors, type FormState } from "@/lib/form";
import { admins, businessTeam, excerpt, notify, weddingTeam } from "@/lib/notify";
import { coupleNames } from "@/lib/plan-helpers";
import { canReview, syncRating } from "@/lib/reviews";
import { getCurrentUser } from "@/lib/session";
import { reviewingWedding } from "@/lib/wedding";

const refresh = () => revalidatePath("/", "layout");

/** Couple writes or edits their review; it's live at once (decision 81). */
export async function saveReviewAction(businessId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const access = await reviewingWedding();
  if (!access || typeof businessId !== "string") return { formError: "forbidden" };
  if (!(await canReview(access.wedding, businessId, access.user.id))) return { formError: "reviewNotAllowed" };
  const parsed = reviewSchema.safeParse({ rating: fd.get("rating") ?? "", text: fd.get("text") ?? "" });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const weddingId = access.wedding.id;
  const existing = await prisma.review.findUnique({ where: { businessId_weddingId: { businessId, weddingId } } });
  if (existing) {
    await prisma.review.update({ where: { id: existing.id }, data: parsed.data });
  } else {
    await prisma.review.create({ data: { ...parsed.data, businessId, weddingId, authorId: access.user.id } });
    const business = await prisma.business.findUnique({ where: { id: businessId }, select: { name: true } });
    await notify(
      await businessTeam(businessId, access.user.id),
      "REVIEW_NEW",
      { couple: coupleNames(access.wedding), business: business?.name, rating: parsed.data.rating, excerpt: excerpt(parsed.data.text) },
      `/vendor/${businessId}/reviews`,
    );
  }
  await syncRating(businessId);
  refresh();
  return { ok: true };
}

export async function deleteReviewAction(businessId: string): Promise<FormState> {
  const access = await reviewingWedding();
  if (!access || typeof businessId !== "string") return { formError: "forbidden" };
  await prisma.review.deleteMany({ where: { businessId, weddingId: access.wedding.id } });
  await syncRating(businessId);
  refresh();
  return { ok: true };
}

async function vendorReview(reviewId: string) {
  if (typeof reviewId !== "string") return null;
  const review = await prisma.review.findUnique({ where: { id: reviewId }, include: { business: true, wedding: true } });
  if (!review) return null;
  const access = await getBusinessAccess(review.businessId);
  return access ? { access, review } : null;
}

/** One public reply per review; the vendor can edit it. */
export async function replyReviewAction(reviewId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const ctx = await vendorReview(reviewId);
  if (!ctx) return { formError: "forbidden" };
  const parsed = reviewReplySchema.safeParse({ text: fd.get("text") ?? "" });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const { review } = ctx;
  await prisma.review.update({ where: { id: review.id }, data: { vendorReply: parsed.data.text, repliedAt: new Date() } });
  if (!review.vendorReply)
    await notify(
      await weddingTeam(review.weddingId, ctx.access.user.id),
      "REVIEW_REPLY",
      { business: review.business.name, couple: coupleNames(review.wedding), excerpt: excerpt(parsed.data.text) },
      `/v/${review.business.slug}#reviews`,
    );
  refresh();
  return { ok: true };
}

export async function reportReviewAction(reviewId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const ctx = await vendorReview(reviewId);
  if (!ctx) return { formError: "forbidden" };
  const parsed = reviewReportSchema.safeParse({ reason: fd.get("reason") ?? "" });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const { review } = ctx;
  await prisma.review.update({ where: { id: review.id }, data: { reportedAt: new Date(), reportReason: parsed.data.reason } });
  await notify(
    await admins(),
    "REVIEW_REPORTED",
    { business: review.business.name, couple: coupleNames(review.wedding), excerpt: excerpt(parsed.data.reason) },
    "/admin/reviews",
  );
  refresh();
  return { ok: true };
}

// ─── Admin moderation ───

async function isAdmin() {
  const user = await getCurrentUser();
  return !!user?.roles.includes("ADMIN");
}

export async function setReviewStatusAction(reviewId: string, status: "VISIBLE" | "HIDDEN"): Promise<FormState> {
  if (!(await isAdmin()) || (status !== "VISIBLE" && status !== "HIDDEN")) return { formError: "forbidden" };
  const review = await prisma.review.update({
    where: { id: reviewId },
    // Hiding or restoring settles any open report.
    data: { status, reportedAt: null },
  });
  await syncRating(review.businessId);
  refresh();
  return { ok: true };
}

export async function dismissReportAction(reviewId: string): Promise<FormState> {
  if (!(await isAdmin())) return { formError: "forbidden" };
  await prisma.review.update({ where: { id: reviewId }, data: { reportedAt: null } });
  refresh();
  return { ok: true };
}
