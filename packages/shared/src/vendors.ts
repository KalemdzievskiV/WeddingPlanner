export const VENDOR_CATEGORIES = ["VENUE", "BAND", "PHOTO_VIDEO"] as const;
export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];

export const CURRENCIES = ["EUR", "MKD"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Approximate rate used only to show the other currency. The denar is pegged to the euro. */
export const MKD_PER_EUR = 61.5;

export function convertPrice(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  return from === "EUR" ? Math.round(amount * MKD_PER_EUR) : Math.round(amount / MKD_PER_EUR);
}

export const PHOTO_LIMITS: Record<VendorCategory, number> = { VENUE: 40, BAND: 40, PHOTO_VIDEO: 120 };
export const MIN_PHOTOS_FOR_APPROVAL = 3;

export const DAY_STATUSES = ["FREE", "TENTATIVE", "BOOKED"] as const;
export type DayStatus = (typeof DAY_STATUSES)[number];

export const DRINKS_OPTIONS = ["NONE", "SOFT", "DOMESTIC_UNLIMITED", "CUSTOM"] as const;
export const EXTRA_UNITS = ["PER_PERSON", "FIXED"] as const;

/** Days a claim link for an admin-created listing stays valid. */
export const CLAIM_LINK_DAYS = 30;
export const INVITE_LINK_DAYS = 7;
