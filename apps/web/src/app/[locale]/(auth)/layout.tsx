import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/ui/logo";
import { Link } from "@/i18n/navigation";

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
    </div>
  );
}
