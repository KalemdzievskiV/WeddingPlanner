import "../globals.css";
import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Onest, Prata } from "next/font/google";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CookieNotice } from "@/components/cookie-notice";
import { routing } from "@/i18n/routing";
import { env } from "@/lib/env";
import { OG_LOCALE } from "@/lib/seo";

const prata = Prata({ weight: "400", subsets: ["latin", "cyrillic"], variable: "--font-prata", display: "swap" });
const onest = Onest({ subsets: ["latin", "latin-ext", "cyrillic"], variable: "--font-onest", display: "swap" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  const appName = (await getTranslations({ locale, namespace: "common" }))("appName");
  // Canonical and hreflang links are set per public page (lib/seo.ts), never here: a layout value would apply to every page.
  return {
    metadataBase: new URL(env.appUrl),
    title: { default: t("title"), template: `%s · ${appName}` },
    description: t("description"),
    openGraph: { siteName: appName, locale: OG_LOCALE[locale], type: "website" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <html lang={locale} className={`${prata.variable} ${onest.variable}`}>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          {children}
          <CookieNotice />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
