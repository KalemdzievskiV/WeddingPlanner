import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LegalLinks } from "@/components/legal-links";
import { Logo } from "@/components/ui/logo";
import { Link } from "@/i18n/navigation";

/** Signed-in and sign-in pages stay out of search engines (decision 95). */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="rounded">
          <Logo name={t("appName")} />
        </Link>
        <LanguageSwitcher />
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-12">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
      <footer className="flex justify-center px-4 pb-8 text-sm text-stone">
        <LegalLinks />
      </footer>
    </div>
  );
}
