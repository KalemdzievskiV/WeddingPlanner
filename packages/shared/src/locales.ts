/** App languages. `sq` is the ISO code for Albanian. */
export const LOCALES = ["mk", "sq", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "mk";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Picks the right column from a row with nameMk / nameSq / nameEn style fields. */
export function pickLocalized<T extends Record<string, unknown>>(
  row: T,
  field: string,
  locale: Locale,
): string {
  const suffix = locale === "mk" ? "Mk" : locale === "sq" ? "Sq" : "En";
  const value = row[`${field}${suffix}`] ?? row[`${field}Mk`];
  return typeof value === "string" ? value : "";
}
