import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { LegalLinks } from "@/components/legal-links";
import { SiteHeader } from "@/components/site-header";
import { Logo } from "@/components/ui/logo";
import { Stitch } from "@/components/ui/stitch";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("home.footer");
  const tc = await getTranslations("common");
  return (
    <>
      <SiteHeader showSectionLinks />
      {children}
      <footer className="mt-24">
        <Stitch light />
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 text-sm text-stone sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo name={tc("appName")} className="text-lg" />
          <p>{t("made")}</p>
          <LegalLinks />
          <p>{t("rights", { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </>
  );
}
