"use client";

import { COMPARE_MIN } from "@svadba/shared";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/button";
import { useCompare } from "./compare-store";

/** Bar at the bottom of the screen while vendors are ticked for comparison. */
export function CompareTray({ date }: { date?: string | null }) {
  const t = useTranslations("search.compare");
  const compare = useCompare();
  if (compare.ids.length === 0) return null;
  const ready = compare.ids.length >= COMPARE_MIN;
  const query: Record<string, string> = { ids: compare.ids.join(",") };
  if (date) query.date = date;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-medium tabular-nums">{t("selected", { count: compare.ids.length })}</span>
          <span className="hidden text-stone sm:inline"> · {ready ? t("readyHint") : t("pickMore")}</span>
        </p>
        <button
          type="button"
          onClick={compare.clear}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-sm text-ink-soft hover:bg-ink/5"
        >
          <X aria-hidden className="size-4" /> {t("clear")}
        </button>
        {ready ? (
          <ButtonLink href={{ pathname: "/compare", query }} size="sm">
            {t("open")}
          </ButtonLink>
        ) : (
          <span className="inline-flex h-8 items-center rounded-lg bg-ink/5 px-3 text-sm text-stone">{t("open")}</span>
        )}
      </div>
    </div>
  );
}
