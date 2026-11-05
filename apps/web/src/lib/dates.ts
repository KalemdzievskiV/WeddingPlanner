import type { Locale } from "@svadba/shared";

const intlLocale: Record<Locale, string> = { mk: "mk-MK", sq: "sq-MK", en: "en-GB" };

export function toIntlLocale(locale: Locale) {
  return intlLocale[locale];
}

/** Month and weekday names from the translation files (browsers often lack Macedonian/Albanian date data). */
export type CalendarLabels = { months: string[]; weekdays: string[] };

type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type CalendarKey = `m${Month}` | `d${Weekday}`;

/** Builds labels from a translator scoped to "common.calendar". */
export function calendarLabels(t: (key: CalendarKey) => string): CalendarLabels {
  return {
    months: Array.from({ length: 12 }, (_, i) => t(`m${i + 1}` as CalendarKey)),
    weekdays: Array.from({ length: 7 }, (_, i) => t(`d${i + 1}` as CalendarKey)),
  };
}

/** Today's date in Skopje as YYYY-MM-DD. */
export function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Skopje" }).format(new Date());
}

export function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function monthTitle(year: number, month: number, labels: CalendarLabels) {
  return `${labels.months[month]} ${year}`;
}
