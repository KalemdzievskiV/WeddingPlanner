"use client";

import { Building2, LayoutGrid, ListChecks, MapPin, MessageSquareWarning, Music, Store, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", key: "overview", Icon: LayoutGrid },
  { href: "/admin/businesses", key: "businesses", Icon: Store },
  { href: "/admin/reviews", key: "reviews", Icon: MessageSquareWarning },
  { href: "/admin/users", key: "users", Icon: Users },
  { href: "/admin/cities", key: "cities", Icon: MapPin },
  { href: "/admin/categories", key: "categories", Icon: Building2 },
  { href: "/admin/features", key: "features", Icon: ListChecks },
  { href: "/admin/genres", key: "genres", Icon: Music },
] as const;

export function AdminNav() {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("overview")} className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {items.map(({ href, key, Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-rosehip/70 font-medium text-ink" : "text-ink-soft hover:bg-ink/5 hover:text-ink",
            )}
          >
            <Icon aria-hidden className={cn("size-4", active && "text-vranec")} />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
