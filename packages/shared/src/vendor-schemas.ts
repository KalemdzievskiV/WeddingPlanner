import { z } from "zod";
import { toLines } from "./text";
import { CURRENCIES, DRINKS_OPTIONS, EXTRA_UNITS, VENDOR_CATEGORIES } from "./vendors";

// Error messages are keys in the "errors" translation namespace.

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "tooLong")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const requiredText = (max: number) => z.string().trim().min(1, "required").max(max, "tooLong");

const price = z.coerce.number("number").int("wholeNumber").min(0, "positive").max(10_000_000, "tooLarge");
const optionalInt = z
  .union([z.literal(""), z.coerce.number("number").int("wholeNumber").min(0, "positive").max(100_000, "tooLarge")])
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();
const lines = z
  .string()
  .max(4000, "tooLong")
  .transform((v) => toLines(v));

/** Accepts "instagram.com/x" as well as full links; adds https:// when missing. */
const url = z
  .string()
  .trim()
  .max(300, "tooLong")
  .transform((v) => (v === "" || /^https?:\/\//i.test(v) ? v : `https://${v}`))
  .refine((v) => v === "" || /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(v), "url")
  .transform((v) => (v === "" ? null : v));

export const newBusinessSchema = z.object({
  category: z.enum(VENDOR_CATEGORIES, "required"),
  name: requiredText(100),
  cityId: z.string().min(1, "required"),
});

export const businessProfileSchema = z.object({
  name: requiredText(100),
  descriptionMk: z.string().trim().max(5000, "tooLong"),
  descriptionSq: optionalText(5000),
  descriptionEn: optionalText(5000),
  cityId: z.string().min(1, "required"),
  address: optionalText(200),
  lat: z.union([z.literal(""), z.coerce.number().min(40).max(43)]).transform((v) => (v === "" ? null : v)),
  lng: z.union([z.literal(""), z.coerce.number().min(20).max(23.5)]).transform((v) => (v === "" ? null : v)),
  phone: optionalText(40),
  viber: optionalText(40),
  whatsapp: optionalText(40),
  email: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === "" || z.email().safeParse(v).success, "email")
    .transform((v) => (v === "" ? null : v.toLowerCase())),
  website: url,
  instagram: url,
  facebook: url,
  lineup: optionalText(1000),
  currency: z.enum(CURRENCIES),
});

export const hallSchema = z.object({
  name: requiredText(80),
  capacityMin: optionalInt,
  capacityMax: z.coerce.number("number").int("wholeNumber").min(1, "positive").max(5000, "tooLarge"),
  description: optionalText(1000),
});

const translatedName = {
  nameMk: requiredText(100),
  nameSq: optionalText(100),
  nameEn: optionalText(100),
};

export const menuPackageSchema = z.object({
  ...translatedName,
  pricePerPerson: price,
  currency: z.enum(CURRENCIES),
  minGuests: optionalInt,
  courses: lines,
  drinks: z.enum(DRINKS_OPTIONS),
  drinksNote: optionalText(300),
});

export const extraSchema = z.object({
  ...translatedName,
  price,
  currency: z.enum(CURRENCIES),
  unit: z.enum(EXTRA_UNITS),
});

export const servicePackageSchema = z.object({
  ...translatedName,
  price,
  currency: z.enum(CURRENCIES),
  hours: optionalInt,
  members: optionalInt,
  extraHourPrice: optionalInt,
  includes: lines,
});

export const travelFeeSchema = z.object({
  cityId: z.string().min(1, "required"),
  price,
  currency: z.enum(CURRENCIES),
});

export const videoLinkSchema = z.object({
  url: z
    .string()
    .trim()
    .refine((v) => /^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|instagram\.com|facebook\.com|tiktok\.com)\//.test(v), "videoUrl"),
});

export const gallerySchema = z.object({ title: requiredText(80) });

export const rejectSchema = z.object({ reason: requiredText(500) });
