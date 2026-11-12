import { z } from "zod";
import {
  AGE_GROUPS,
  COST_TYPES,
  EVENT_TYPES,
  FLOOR_ITEM_KINDS,
  GUEST_ROLES,
  GUEST_SIDES,
  PAYERS,
  PAYMENT_KINDS,
  PLANNED_VENDOR_STATUSES,
  MAX_ITEM_MINUTES,
  TABLE_SHAPES,
  TASK_BUCKETS,
} from "./planner";
import { CURRENCIES } from "./vendors";

// Error messages are keys in the "errors" translation namespace.

const text = (max: number) => z.string().trim().min(1, "required").max(max, "tooLong");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "tooLong")
    .transform((v) => (v === "" ? null : v));
const optionalInt = (max = 10_000_000) =>
  z
    .union([z.literal(""), z.coerce.number("number").int("wholeNumber").min(0, "positive").max(max, "tooLarge")])
    .transform((v) => (v === "" ? null : v));
const amount = z.coerce.number("number").int("wholeNumber").min(0, "positive").max(10_000_000, "tooLarge");
const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "date")
  .transform((v) => (v === "" ? null : new Date(`${v}T00:00:00Z`)));
const optionalTime = z
  .string()
  .trim()
  .refine((v) => v === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), "time")
  .transform((v) => (v === "" ? null : v));

export const weddingSchema = z.object({
  partner1: text(60),
  partner2: text(60),
  date: optionalDate,
  cityId: z.string().transform((v) => (v === "" ? null : v)),
  estimatedGuests: optionalInt(5000),
  budgetTotal: optionalInt(),
  currency: z.enum(CURRENCIES),
});

export const eventSchema = z.object({
  type: z.enum(EVENT_TYPES),
  name: optionalText(80),
  date: optionalDate,
  time: optionalTime,
  place: optionalText(150),
  lat: z.union([z.literal(""), z.coerce.number().min(-90).max(90)]).transform((v) => (v === "" ? null : v)),
  lng: z.union([z.literal(""), z.coerce.number().min(-180).max(180)]).transform((v) => (v === "" ? null : v)),
  hasSeating: z.boolean(),
});

export const householdSchema = z.object({
  name: text(80),
  side: z.enum(GUEST_SIDES),
  notes: optionalText(500),
  eventIds: z.array(z.string()).max(20),
  guests: z
    .array(
      z.object({
        id: z.string().optional(),
        name: text(80),
        ageGroup: z.enum(AGE_GROUPS),
        role: z.enum(GUEST_ROLES).nullable().optional(),
      }),
    )
    .min(1, "guestRequired")
    .max(30),
});
export type HouseholdInput = z.infer<typeof householdSchema>;

/** Two sides view (decision 116): rename one guest in place. */
export const guestNameSchema = text(80);

/** Two sides view (decision 116): one name becomes a new family on a side, optionally holding a wedding-party role. */
export const quickGuestSchema = z.object({
  name: text(80),
  side: z.enum(GUEST_SIDES),
  role: z.enum(GUEST_ROLES).nullable(),
});

/** Rows from paste / CSV import. */
export const importSchema = z
  .array(
    z.object({
      household: text(80),
      guests: z.array(z.object({ name: text(80), ageGroup: z.enum(AGE_GROUPS) })).min(1).max(30),
      side: z.enum(GUEST_SIDES),
    }),
  )
  .min(1, "required")
  .max(500, "tooMany");

/** First step of a new plan (decision 100): wedding party by role + quick guest lines per side. */
export const planStartSchema = z.object({
  party: z.array(z.object({ role: z.enum(GUEST_ROLES), name: text(80) })).max(GUEST_ROLES.length),
  lines: z.array(z.object({ side: z.enum(GUEST_SIDES), text: z.string().trim().min(1).max(600) })).max(300),
});

export const tableSchema = z.object({
  name: text(40),
  shape: z.enum(TABLE_SHAPES),
  seats: z.coerce.number("number").int("wholeNumber").min(1, "positive").max(60, "tooLarge"),
});

export const categorySchema = z.object({ name: text(60) });

export const expenseSchema = z.object({
  categoryId: z.string().min(1, "required"),
  name: text(100),
  costType: z.enum(COST_TYPES),
  amount,
  childPrice: optionalInt(),
  currency: z.enum(CURRENCIES),
  eventId: z.string().transform((v) => (v === "" ? null : v)),
  guestsOverride: optionalInt(5000),
  payer: z.enum(PAYERS),
  notes: optionalText(500),
});

export const paymentSchema = z.object({
  kind: z.enum(PAYMENT_KINDS),
  amount,
  currency: z.enum(CURRENCIES),
  dueDate: optionalDate,
  paidAt: optionalDate,
});

export const taskSchema = z.object({
  title: text(200),
  monthsBefore: z
    .string()
    .refine((v) => v === "" || (TASK_BUCKETS as readonly number[]).includes(Number(v)), "required")
    .transform((v) => (v === "" ? null : Number(v))),
  dueDate: optionalDate,
  assignee: optionalText(60),
});

export const scheduleDaySchema = z.object({
  date: optionalDate,
  startTime: z
    .string()
    .trim()
    .refine((v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v), "time"),
});

export const scheduleItemSchema = z.object({
  title: text(150),
  durationMin: z.coerce.number("number").int("wholeNumber").min(0, "positive").max(MAX_ITEM_MINUTES, "tooLarge"),
  responsible: optionalText(80),
  place: optionalText(150),
  eventId: z.string().transform((v) => (v === "" ? null : v)),
  isMain: z.boolean(),
  forAll: z.boolean(),
  forSides: z.array(z.enum(GUEST_SIDES)).max(3),
  forRoles: z.array(z.enum(GUEST_ROLES)).max(GUEST_ROLES.length),
  guestIds: z.array(z.string()).max(2000),
});

export const plannedVendorSchema = z.object({
  name: text(100),
  kind: optionalText(60),
  contact: optionalText(120),
  status: z.enum(PLANNED_VENDOR_STATUSES),
  notes: optionalText(1000),
});

/** Admin-edited "fill typical day" template (decision 111). */
export const typicalDayStepSchema = z.object({
  titleMk: text(150),
  titleSq: optionalText(150),
  titleEn: optionalText(150),
  durationMin: z.coerce.number("number").int("wholeNumber").min(0, "positive").max(MAX_ITEM_MINUTES, "tooLarge"),
  eventType: z.enum(EVENT_TYPES).nullable(),
  forAll: z.boolean(),
  forSides: z.array(z.enum(GUEST_SIDES)).max(3),
  forRoles: z.array(z.enum(GUEST_ROLES)).max(GUEST_ROLES.length),
});
export const typicalDaySchema = z.object({
  startTime: scheduleDaySchema.shape.startTime,
  steps: z.array(typicalDayStepSchema).min(1, "required").max(50, "tooLong"),
});
export type TypicalDayStepInput = z.input<typeof typicalDayStepSchema>;

/** A room element on the seating plan (decision 119). */
export const floorItemSchema = z.object({
  kind: z.enum(FLOOR_ITEM_KINDS),
  name: text(40),
});

/** Placeholder video for the video invitation until the couple picks their own (Mixkit Stock Video Free License). */
export const SAMPLE_INVITE_VIDEO = "https://assets.mixkit.co/videos/18204/18204-720.mp4";
export const INVITE_OVERLAY_MAX = 80;
/** Largest video a couple can upload for the invitation (decision 131). */
export const INVITE_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
/** File types offered in the picker; the server checks the file's real format, not just this. */
export const INVITE_VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";
/** Colour themes of the designed invitation (decision 130). */
export const INVITE_THEMES = ["LILAC", "IVORY", "SAGE"] as const;
export type InviteThemeKey = (typeof INVITE_THEMES)[number];
/**
 * Built-in royalty-free background tracks, served from `apps/web/public/music/<id>.mp3`.
 * Empty until the audio files are added; the editor hides the music choice while it is.
 */
export const INVITE_TRACKS: readonly { id: string; title: string }[] = [];

/** Video invitation settings: full-screen video with the key details, then the RSVP form. */
export const videoInviteSchema = z.object({
  enabled: z.boolean(),
  videoUrl: z
    .string()
    .trim()
    .max(500, "tooLong")
    .refine((v) => v === "" || /^https:\/\/[^\s"'<>]+$/i.test(v), "url")
    .transform((v) => (v === "" ? null : v)),
  headline: optionalText(80),
  message: optionalText(600),
  overlay: z.coerce.number("number").int("wholeNumber").min(0, "positive").max(INVITE_OVERLAY_MAX, "tooLarge"),
  /** Events to show on the invitation; empty shows none. */
  eventIds: z.array(z.string()).max(50),
  theme: z.enum(INVITE_THEMES, "required"),
  /** A track id from INVITE_TRACKS, or empty for no music. */
  music: z
    .string()
    .refine((v) => v === "" || INVITE_TRACKS.some((tr) => tr.id === v), "required")
    .transform((v) => (v === "" ? null : v)),
});
