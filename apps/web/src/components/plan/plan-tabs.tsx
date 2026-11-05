"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TABS = ["", "guests", "seating", "budget", "checklist", "schedule", "vendors", "settings"] as const;

export function PlanTabs() {
  const t = useTranslations("plan.nav");
  const pathname = usePathname();
  return (
    <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 print:hidden">
      <ul className="flex min-w-max gap-1 border-b border-line">
        {TABS.map((tab) => {
          const href = tab ? `/plan/${tab}` : "/plan";
          const active = tab ? pathname.startsWith(href) : pathname === "/plan";
          return (
            <li key={tab || "overview"}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px block border-b-2 px-3 py-2.5 text-sm transition-colors",
                  active ? "border-vranec font-medium text-ink" : "border-transparent text-ink-soft hover:text-ink",
                )}
              >
                {t(tab || "overview")}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
