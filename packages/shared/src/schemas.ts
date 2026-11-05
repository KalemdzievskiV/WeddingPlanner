import { z } from "zod";
import { ACCOUNT_TYPES } from "./roles";
import { LOCALES } from "./locales";

// Error messages are translation keys (namespace "errors"), not user-facing text.

export const emailSchema = z.string().trim().toLowerCase().email("email");
export const passwordSchema = z.string().min(8, "passwordMin").max(128, "passwordMax");

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "nameMin").max(80, "nameMax"),
  email: emailSchema,
  password: passwordSchema,
  accountType: z.enum(ACCOUNT_TYPES, "accountType"),
  locale: z.enum(LOCALES),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "required"),
});

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug")
  .max(60, "slug");

const translatedName = {
  nameMk: z.string().trim().min(1, "required").max(100),
  nameSq: z.string().trim().min(1, "required").max(100),
  nameEn: z.string().trim().min(1, "required").max(100),
};

export const citySchema = z.object({
  slug,
  ...translatedName,
  region: z.string().trim().max(40).optional().or(z.literal("")),
  active: z.boolean(),
});
export type CityInput = z.infer<typeof citySchema>;

export const venueFeatureSchema = z.object({ slug, ...translatedName, active: z.boolean() });
export type VenueFeatureInput = z.infer<typeof venueFeatureSchema>;

export const vendorCategorySchema = z.object({ ...translatedName, active: z.boolean() });
export type VendorCategoryInput = z.infer<typeof vendorCategorySchema>;

export const profileSchema = z.object({
  name: z.string().trim().min(2, "nameMin").max(80, "nameMax"),
  locale: z.enum(LOCALES),
});
