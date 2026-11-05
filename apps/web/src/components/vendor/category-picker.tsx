"use client";

import { VENDOR_CATEGORIES, type VendorCategory } from "@svadba/shared";
import { Camera, Music, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const icons = { VENUE: UtensilsCrossed, BAND: Music, PHOTO_VIDEO: Camera };

export function CategoryPicker({ defaultValue, error }: { defaultValue?: VendorCategory; error?: string }) {
  const t = useTranslations("vendor");
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{t("new.category")}</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {VENDOR_CATEGORIES.map((c) => {
          const Icon = icons[c];
          return (
            <label
              key={c}
              className={cn(
                "flex cursor-pointer flex-col rounded-xl border border-line-strong bg-surface p-4 transition-colors",
                "hover:border-ink-soft/50 has-[:checked]:border-vranec has-[:checked]:bg-rosehip/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-vranec/30",
              )}
            >
              <input type="radio" name="category" value={c} defaultChecked={defaultValue === c} className="sr-only" />
              <Icon aria-hidden className="size-5 text-vranec" />
              <span className="mt-3 text-sm font-medium">{t(`categories.${c}`)}</span>
              <span className="mt-1 text-xs leading-snug text-stone">{t(`categoryHints.${c}`)}</span>
            </label>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </fieldset>
  );
}
