"use client";

import type { VendorCategory } from "@svadba/shared";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCompare } from "./compare-store";

/** Removes a vendor from the comparison (browser list and the page URL). */
export function CompareRemove({ id, category, remaining, date }: { id: string; category: VendorCategory; remaining: string[]; date: string | null }) {
  const t = useTranslations("search.compare");
  const compare = useCompare();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (compare.has(id)) compare.toggle(id, category);
        const query: Record<string, string> = { ids: remaining.join(",") };
        if (date) query.date = date;
        router.push({ pathname: "/compare", query });
      }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-stone hover:bg-ink/5 hover:text-ink"
    >
      <X aria-hidden className="size-3.5" /> {t("remove")}
    </button>
  );
}
