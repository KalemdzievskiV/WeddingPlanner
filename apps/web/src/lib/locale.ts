import { DEFAULT_LOCALE, isLocale, type Locale } from "@svadba/shared";

/** Reads the [locale] route param. The proxy only lets valid locales through; this narrows the type. */
export async function localeFrom(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  return isLocale(locale) ? locale : DEFAULT_LOCALE;
}
