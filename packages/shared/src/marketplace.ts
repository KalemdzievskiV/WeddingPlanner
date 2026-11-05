import { z } from "zod";
import { CURRENCIES, VENDOR_CATEGORIES, type VendorCategory } from "./vendors";

export const INQUIRY_STATUSES = ["NEW", "REPLIED", "OFFER_SENT", "BOOKED", "DECLINED", "CANCELLED"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];
/** Statuses where the conversation is still going (decision 78: one open inquiry per vendor per event). */
export const OPEN_INQUIRY_STATUSES = ["NEW", "REPLIED", "OFFER_SENT"] as const satisfies readonly InquiryStatus[];

export const OFFER_UNITS = ["TOTAL", "PER_PERSON"] as const;
export type OfferUnit = (typeof OFFER_UNITS)[number];

export const SEARCH_SORTS = ["best", "price", "rating", "newest"] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];
export const SEARCH_PAGE_SIZE = 24;
export const COMPARE_MIN = 2;
export const COMPARE_MAX = 4;

/** Category key ↔ the short word used in search URLs. */
export const CATEGORY_SLUGS: Record<VendorCategory, string> = { VENUE: "venues", BAND: "music", PHOTO_VIDEO: "photo-video" };
export function categoryFromSlug(slug: string | undefined): VendorCategory | null {
  return VENDOR_CATEGORIES.find((c) => CATEGORY_SLUGS[c] === slug) ?? null;
}

// Error messages are keys in the "errors" translation namespace.
const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "date")
  .transform((v) => (v === "" ? null : new Date(`${v}T00:00:00Z`)));
const requiredDate = z
  .string()
  .trim()
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), "date")
  .transform((v) => new Date(`${v}T00:00:00Z`));
const optionalId = z.string().transform((v) => (v === "" ? null : v));

export const inquirySchema = z.object({
  eventId: optionalId,
  date: optionalDate,
  guestCount: z
    .union([z.literal(""), z.coerce.number("number").int("wholeNumber").min(1, "positive").max(5000, "tooLarge")])
    .transform((v) => (v === "" ? null : v)),
  hallId: optionalId,
  packageRef: z
    .string()
    .refine((v) => v === "" || /^(menu|package):[\w-]+$/.test(v), "generic")
    .transform((v) => (v === "" ? null : v)),
  message: z.string().trim().min(10, "messageShort").max(2000, "tooLong"),
});

export const messageSchema = z.object({ text: z.string().trim().min(1, "required").max(2000, "tooLong") });

export const offerSchema = z.object({
  price: z.coerce.number("number").int("wholeNumber").min(1, "positive").max(10_000_000, "tooLarge"),
  unit: z.enum(OFFER_UNITS),
  currency: z.enum(CURRENCIES),
  validUntil: optionalDate,
  note: z
    .string()
    .trim()
    .max(1000, "tooLong")
    .transform((v) => (v === "" ? null : v)),
});

export const bookSchema = z.object({ date: requiredDate, hallId: optionalId });

export const reviewSchema = z.object({
  rating: z.coerce.number("required").int("required").min(1, "rating").max(5, "rating"),
  text: z.string().trim().min(20, "reviewShort").max(2000, "tooLong"),
});

export const reviewReplySchema = z.object({ text: z.string().trim().min(1, "required").max(1000, "tooLong") });
export const reviewReportSchema = z.object({ reason: z.string().trim().min(5, "required").max(500, "tooLong") });
