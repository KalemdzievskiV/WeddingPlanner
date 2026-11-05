import { convertPrice, type Currency, type Locale } from "@svadba/shared";

// Deterministic formatting (no Intl): browsers often lack Macedonian/Albanian locale data,
// and server/client output must match to avoid hydration errors.

function group(n: number, sep: string) {
  const s = Math.round(Math.abs(n)).toString();
  return (n < 0 ? "-" : "") + s.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/** "1.722 ден." / "28 €" (mk, sq) or "€28" / "1,722 den." (en). */
export function formatMoney(amount: number, currency: Currency, locale: Locale) {
  const sep = locale === "en" ? "," : ".";
  const n = group(amount, sep);
  if (currency === "EUR") return locale === "en" ? `€${n}` : `${n} €`;
  return `${n} ${locale === "en" ? "den." : "ден."}`;
}

/** The same price in the other currency, for the "≈" hint. */
export function formatApprox(amount: number, currency: Currency, locale: Locale) {
  const other: Currency = currency === "EUR" ? "MKD" : "EUR";
  return formatMoney(convertPrice(amount, currency, other), other, locale);
}

/** "12.06.2027" from a Date or "YYYY-MM-DD". */
export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const iso = typeof value === "string" ? value : value.toISOString();
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

/** "YYYY-MM-DD" for <input type="date">. */
export function dateInputValue(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}
