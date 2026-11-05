import "server-only";
import { prisma, type Wedding } from "@svadba/db";
import { todayIso } from "./dates";

/**
 * Verified reviews only (decision 16): the vendor is booked in the wedding's plan
 * and the wedding date has passed. People on the vendor's own team can't review it.
 */
export async function canReview(wedding: Wedding, businessId: string, userId: string) {
  if (!wedding.date || wedding.date.toISOString().slice(0, 10) >= todayIso()) return false;
  const member = await prisma.businessMember.findUnique({ where: { businessId_userId: { businessId, userId } } });
  if (member) return false;
  const booked = await prisma.plannedVendor.findFirst({ where: { weddingId: wedding.id, businessId, status: "BOOKED" } });
  return !!booked;
}

/** Keeps the business's average rating in sync with its visible reviews (used for sorting). */
export async function syncRating(businessId: string) {
  const agg = await prisma.review.aggregate({
    where: { businessId, status: "VISIBLE" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.business.update({
    where: { id: businessId },
    data: { ratingAvg: agg._avg.rating, ratingCount: agg._count._all },
  });
}
