"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Tab = { href: string; label: string };

export function BusinessTabs({ businessId, category }: { businessId: string; category: string }) {
  const t = useTranslations("vendor.nav");
  const pathname = usePathname();
  const base = `/vendor/${businessId}`;
  const tabs: Tab[] = [
    { href: base, label: t("overview") },
    { href: `${base}/profile`, label: t("profile") },
    { href: `${base}/photos`, label: t("photos") },
    { href: `${base}/prices`, label: category === "VENUE" ? t("pricesVenue") : t("prices") },
    ...(category === "BAND" ? [{ href: `${base}/travel`, label: t("travel") }] : []),
    { href: `${base}/calendar`, label: t("calendar") },
    { href: `${base}/team`, label: t("team") },
  ];

  return (
    <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-line">
        {tabs.map((tab) => {
          const active = tab.href === base ? pathname === base : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px block border-b-2 px-3 py-2.5 text-sm transition-colors",
                  active ? "border-vranec font-medium text-ink" : "border-transparent text-ink-soft hover:text-ink",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
