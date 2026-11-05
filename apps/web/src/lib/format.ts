import { convertPrice, type Currency, type Locale } from "@svadba/shared";
import { toIntlLocale } from "./dates";

export function formatMoney(amount: number, currency: Currency, locale: Locale) {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** The same price in the other currency, for the "≈" hint. */
export function formatApprox(amount: number, currency: Currency, locale: Locale) {
  const other: Currency = currency === "EUR" ? "MKD" : "EUR";
  return formatMoney(convertPrice(amount, currency, other), other, locale);
}
