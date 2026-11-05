import "server-only";
import { prisma, type Business, type Currency } from "@svadba/db";

const CATEGORY_FOR: Record<string, string> = { VENUE: "venue", BAND: "music", PHOTO_VIDEO: "photo-video" };

/**
 * The wedding's entry for a catalog vendor, created if missing.
 * `status` only ever moves an entry forward to BOOKED here; it never downgrades a booking.
 */
export async function ensurePlannedVendor(
  weddingId: string,
  business: Pick<Business, "id" | "name">,
  status: "CONSIDERING" | "BOOKED",
) {
  const existing = await prisma.plannedVendor.findFirst({ where: { weddingId, businessId: business.id } });
  if (!existing) return prisma.plannedVendor.create({ data: { weddingId, businessId: business.id, name: business.name, status } });
  if (status === "BOOKED" && existing.status !== "BOOKED")
    return prisma.plannedVendor.update({ where: { id: existing.id }, data: { status } });
  return existing;
}

/** Budget line for a vendor, in the matching default category (venue / music / photo-video). */
export async function createVendorExpense(opts: {
  weddingId: string;
  business: Pick<Business, "name" | "category">;
  plannedVendorId: string;
  /** Menu or package name; the line is called "<vendor> · <name>", or just the vendor without one. */
  name?: string | null;
  amount: number;
  currency: Currency;
  perPerson: boolean;
  eventId?: string | null;
  offerId?: string;
}) {
  const { weddingId } = opts;
  const category =
    (await prisma.budgetCategory.findFirst({ where: { weddingId, slug: CATEGORY_FOR[opts.business.category] } })) ??
    (await prisma.budgetCategory.findFirst({ where: { weddingId }, orderBy: { sortOrder: "asc" } }));
  if (!category) return null;
  const eventId = opts.perPerson
    ? (opts.eventId ?? (await prisma.weddingEvent.findFirst({ where: { weddingId, type: "RECEPTION" } }))?.id ?? null)
    : null;
  return prisma.expense.create({
    data: {
      weddingId,
      categoryId: category.id,
      name: (opts.name ? `${opts.business.name} · ${opts.name}` : opts.business.name).slice(0, 120),
      costType: opts.perPerson ? "PER_PERSON" : "FIXED",
      amount: opts.amount,
      currency: opts.currency,
      eventId,
      plannedVendorId: opts.plannedVendorId,
      offerId: opts.offerId,
    },
  });
}
