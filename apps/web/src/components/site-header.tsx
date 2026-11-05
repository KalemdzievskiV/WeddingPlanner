import { prisma } from "@svadba/db";
import { Bell } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/session";
import { LanguageSwitcher } from "./language-switcher";
import { UserMenu } from "./user-menu";

export async function SiteHeader({ showSectionLinks = false }: { showSectionLinks?: boolean }) {
  const [t, tNav, user] = await Promise.all([getTranslations("common"), getTranslations("nav"), getCurrentUser()]);
  const unread = user ? await prisma.notification.count({ where: { userId: user.id, readAt: null } }) : 0;

  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-linen/90 backdrop-blur supports-[backdrop-filter]:bg-linen/75 print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0 rounded">
          <Logo name={t("appName")} />
        </Link>
        <nav className="ml-2 flex items-center gap-1 text-sm text-ink-soft sm:ml-6">
          <Link href="/vendors" className="rounded-lg px-2 py-2 hover:text-ink sm:px-3">
            {tNav("vendors")}
          </Link>
        </nav>
        {showSectionLinks && (
          <nav className="hidden items-center gap-1 text-sm text-ink-soft md:flex">
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
              <Link
                href="/notifications"
                aria-label={unread ? tNav("notificationsUnread", { count: unread }) : tNav("notifications")}
                className="relative flex size-9 items-center justify-center rounded-full text-ink-soft hover:bg-ink/5 hover:text-ink"
              >
                <Bell aria-hidden className="size-5" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-vranec px-1 text-center text-[11px] font-medium leading-[18px] text-white tabular-nums">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              {/* Wrapper hides it on phones; the button's own inline-flex would override "hidden". */}
              <span className="hidden sm:contents">
                <ButtonLink href="/app" variant="secondary" size="sm">
                  {t("dashboard")}
                </ButtonLink>
              </span>
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
