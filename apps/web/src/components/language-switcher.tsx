"use client";

import { LOCALES } from "@svadba/shared";
import { Check, Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const ref = useRef<HTMLDetailsElement>(null);

  return (
    <details ref={ref} className={cn("relative", className)}>
      <summary
        className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg px-2.5 text-sm text-ink-soft hover:bg-ink/5 hover:text-ink [&::-webkit-details-marker]:hidden"
        aria-label={t("language")}
      >
        <Languages aria-hidden className="size-4" />
        <span className="uppercase">{locale === "sq" ? "AL" : locale}</span>
      </summary>
      <ul className="absolute right-0 z-30 mt-1 w-44 rounded-xl border border-line bg-surface p-1 shadow-[var(--shadow-card)]">
        {LOCALES.map((l) => (
          <li key={l}>
            <Link
              href={pathname}
              locale={l}
              lang={l}
              onClick={() => ref.current?.removeAttribute("open")}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-linen",
                l === locale ? "font-medium text-ink" : "text-ink-soft",
              )}
            >
              {t(`languages.${l}`)}
              {l === locale && <Check aria-hidden className="size-4 text-vranec" />}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
