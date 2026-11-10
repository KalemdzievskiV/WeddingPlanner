export const EVENT_TYPES = ["RECEPTION", "GROOM_HOME", "BRIDE_HOME", "CHURCH", "CIVIL", "ENGAGEMENT", "BACHELORETTE", "CUSTOM"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const GUEST_SIDES = ["BRIDE", "GROOM", "BOTH"] as const;
export type GuestSide = (typeof GUEST_SIDES)[number];

export const AGE_GROUPS = ["CHILD", "YOUNG", "ADULT", "OLDER"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

/** Wedding-party roles (decisions 100-101), in display order, with the side each sits on by default. Each role is held by one guest at most. */
export const GUEST_ROLES = ["BRIDE", "DEVERUSHA", "GROOM", "KUM", "KUMA", "STAR_SVAT", "STAROSVATICA", "DEVER"] as const;
export type GuestRole = (typeof GUEST_ROLES)[number];
export const ROLE_SIDE: Record<GuestRole, "BRIDE" | "GROOM"> = {
  BRIDE: "BRIDE",
  DEVERUSHA: "BRIDE",
  GROOM: "GROOM",
  KUM: "GROOM",
  KUMA: "GROOM",
  STAR_SVAT: "GROOM",
  STAROSVATICA: "GROOM",
  DEVER: "GROOM",
};

/** Who sits at the head table, left to right as the room sees it (decision 102). */
export const HEAD_TABLE_ROLES = ["STAROSVATICA", "STAR_SVAT", "KUM", "GROOM", "BRIDE", "KUMA"] as const satisfies readonly GuestRole[];

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

/** Floor plan size in plan units (doubled in decision 104). */
export const PLAN_WIDTH = 2000;
export const PLAN_HEIGHT = 1400;

// ─── Day timeline (decision 105) ───

export const MAX_ITEM_MINUTES = 24 * 60;

export type TimelineSlot = { start: number; label: string; endLabel: string; dayOffset: number; endDayOffset: number };

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const clock = (min: number) => {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** Start and end of each item: the day's start time plus the durations before it. dayOffset 1 = after midnight. */
export function timelineSlots(startTime: string, durations: number[]): TimelineSlot[] {
  let t = minutesOf(startTime);
  return durations.map((d) => {
    const start = t;
    t += d;
    return { start, label: clock(start), endLabel: clock(t), dayOffset: Math.floor(start / 1440), endDayOffset: Math.floor(t / 1440) };
  });
}

/** Steps of "fill typical day" (decision 107). Titles are translated by key; eventType tags the plan's event of that type. */
export const TYPICAL_DAY: readonly {
  key: string;
  durationMin: number;
  eventType?: EventType;
  forAll?: boolean;
  forSides?: GuestSide[];
  forRoles?: GuestRole[];
}[] = [
  { key: "groomGathering", durationMin: 120, eventType: "GROOM_HOME", forSides: ["GROOM"] },
  { key: "toBride", durationMin: 30, forSides: ["GROOM"] },
  { key: "brideHome", durationMin: 90, eventType: "BRIDE_HOME", forSides: ["BRIDE", "GROOM"] },
  { key: "toChurch", durationMin: 30, forRoles: [...GUEST_ROLES] },
  { key: "church", durationMin: 60, eventType: "CHURCH", forAll: true },
  { key: "photos", durationMin: 210, forRoles: [...GUEST_ROLES] },
  { key: "guestArrival", durationMin: 60, eventType: "RECEPTION", forAll: true },
  { key: "coupleEntrance", durationMin: 15, eventType: "RECEPTION", forAll: true },
  { key: "firstDance", durationMin: 15, eventType: "RECEPTION", forAll: true },
  { key: "dinner", durationMin: 180, eventType: "RECEPTION", forAll: true },
  { key: "cake", durationMin: 15, eventType: "RECEPTION", forAll: true },
  { key: "party", durationMin: 135, eventType: "RECEPTION", forAll: true },
];
export const TYPICAL_DAY_START = "10:00";
