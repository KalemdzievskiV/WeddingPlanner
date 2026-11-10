import { z } from "zod";
import {
  AGE_GROUPS,
  COST_TYPES,
  EVENT_TYPES,
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
