import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/session";
import { LanguageSwitcher } from "./language-switcher";
import { UserMenu } from "./user-menu";

export async function SiteHeader({ showSectionLinks = false }: { showSectionLinks?: boolean }) {
  const [t, tNav, user] = await Promise.all([getTranslations("common"), getTranslations("nav"), getCurrentUser()]);

  return (
    <header className="border-b border-line/70 bg-linen/90 backdrop-blur supports-[backdrop-filter]:bg-linen/75 sticky top-0 z-20">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0 rounded">
          <Logo name={t("appName")} />
        </Link>
        {showSectionLinks && (
          <nav className="ml-6 hidden items-center gap-1 text-sm text-ink-soft md:flex">
            <a href="#couples" className="rounded-lg px-3 py-2 hover:text-ink">
              {tNav("forCouples")}
            </a>
            <a href="#vendors" className="rounded-lg px-3 py-2 hover:text-ink">
              {tNav("forVendors")}
            </a>
          </nav>
        )}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher />
          {user ? (
            <>
              <ButtonLink href="/app" variant="secondary" size="sm" className="hidden sm:inline-flex">
                {t("dashboard")}
              </ButtonLink>
              <UserMenu name={user.name} image={user.image} isAdmin={user.roles.includes("ADMIN")} />
            </>
          ) : (
            <>
              <ButtonLink href="/sign-in" variant="ghost" size="sm">
                {t("signIn")}
              </ButtonLink>
              <ButtonLink href="/sign-up" size="sm">
                {t("getStarted")}
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
