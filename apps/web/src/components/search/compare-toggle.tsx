"use client";

import type { VendorCategory } from "@svadba/shared";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useCompare } from "./compare-store";

export function CompareToggle({ id, category, className }: { id: string; category: VendorCategory; className?: string }) {
  const t = useTranslations("search.compare");
  const compare = useCompare();
  const checked = compare.has(id);
  const disabled = !checked && compare.full && compare.category === category;
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer select-none items-center gap-2 text-sm text-ink-soft",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      title={disabled ? t("full") : undefined}
    >
      <input
        type="checkbox"
        className="size-4 rounded border-line-strong accent-vranec"
        checked={checked}
        disabled={disabled}
        onChange={() => compare.toggle(id, category)}
      />
      {t("tick")}
    </label>
  );
}
