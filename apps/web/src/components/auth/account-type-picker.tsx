"use client";

import type { AccountType } from "@svadba/shared";
import { Heart, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Two large radio cards: planning a wedding / a wedding business. */
export function AccountTypePicker({ defaultValue, error }: { defaultValue?: AccountType; error?: string }) {
  const t = useTranslations("auth.signUp");
  const options = [
    { value: "COUPLE", label: t("couple"), hint: t("coupleHint"), Icon: Heart },
    { value: "VENDOR", label: t("vendor"), hint: t("vendorHint"), Icon: Store },
  ] as const;

  return (
    <fieldset aria-describedby={error ? "accountType-error" : undefined}>
      <legend className="mb-2 text-sm font-medium">{t("accountType")}</legend>
      <div className="grid grid-cols-2 gap-3">
        {options.map(({ value, label, hint, Icon }) => (
          <label
            key={value}
            className={cn(
              "relative flex cursor-pointer flex-col rounded-xl border border-line-strong bg-surface p-3.5 transition-colors",
              "hover:border-ink-soft/50 has-[:checked]:border-vranec has-[:checked]:bg-rosehip/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-vranec/30",
            )}
          >
            <input type="radio" name="accountType" value={value} defaultChecked={defaultValue === value} className="sr-only" />
            <Icon aria-hidden className="size-5 text-vranec" />
            <span className="mt-3 text-sm font-medium leading-snug">{label}</span>
            <span className="mt-1 text-xs leading-snug text-stone">{hint}</span>
          </label>
        ))}
      </div>
      {error && (
        <p id="accountType-error" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
