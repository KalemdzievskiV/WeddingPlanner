import type { Locale } from "@svadba/shared";

const intlLocale: Record<Locale, string> = { mk: "mk-MK", sq: "sq-MK", en: "en-GB" };

export function toIntlLocale(locale: Locale) {
  return intlLocale[locale];
}

/** Seven short weekday names starting Monday, e.g. "пон", "вто"… */
export function weekdayLabels(locale: Locale) {
  const fmt = new Intl.DateTimeFormat(intlLocale[locale], { weekday: "short", timeZone: "UTC" });
  // 2024-01-01 was a Monday.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 1 + i))).replace(/\.$/, ""));
}
