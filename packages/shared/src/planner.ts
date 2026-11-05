export const EVENT_TYPES = ["RECEPTION", "ENGAGEMENT", "BACHELORETTE", "CHURCH", "CIVIL", "CUSTOM"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const GUEST_SIDES = ["BRIDE", "GROOM", "BOTH"] as const;
export type GuestSide = (typeof GUEST_SIDES)[number];

export const AGE_GROUPS = ["CHILD", "YOUNG", "ADULT", "OLDER"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export const RSVP_VALUES = ["PENDING", "YES", "NO"] as const;
export type Rsvp = (typeof RSVP_VALUES)[number];

export const TABLE_SHAPES = ["LONG", "ROUND", "HEAD"] as const;
export type TableShape = (typeof TABLE_SHAPES)[number];

export const PAYERS = ["COUPLE", "BRIDE_FAMILY", "GROOM_FAMILY", "KUM", "OTHER"] as const;
export type Payer = (typeof PAYERS)[number];

export const PAYMENT_KINDS = ["DEPOSIT", "INSTALLMENT", "FINAL"] as const;
export const COST_TYPES = ["FIXED", "PER_PERSON"] as const;
export const PLANNED_VENDOR_STATUSES = ["CONSIDERING", "BOOKED"] as const;

/** Roles someone can be invited with. OWNER is only the creator. */
export const INVITE_ROLES = ["PARTNER", "EDITOR", "VIEWER"] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];

/** Checklist buckets, in months before the wedding. 0 = final month, -1 = after the wedding. */
export const TASK_BUCKETS = [12, 11, 9, 7, 4, 2, 0, -1] as const;

/** Free plan guest limit; only enforced when the paywall is switched on (decision 22b). */
export const FREE_GUEST_LIMIT = 100;

/** Floor plan size in plan units. */
export const PLAN_WIDTH = 1000;
export const PLAN_HEIGHT = 700;
