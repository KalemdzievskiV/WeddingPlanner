import { DEFAULT_LOCALE, LOCALES, type Locale } from "@svadba/shared";

/**
 * Canonical URL and hreflang links for a public page (decision 95).
 * `path` is the page path without the locale: "" for home, "/v/lipa" for a vendor.
 */
export function alternatesFor(path: string, locale: Locale) {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(LOCALES.map((l) => [l, `/${l}${path}`])),
      "x-default": `/${DEFAULT_LOCALE}${path}`,
    },
  };
}

/** Open Graph locale codes for link previews. */
export const OG_LOCALE: Record<Locale, string> = { mk: "mk_MK", sq: "sq_AL", en: "en_US" };
