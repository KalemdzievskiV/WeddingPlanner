"use client";

import { CATEGORY_SLUGS, VENDOR_CATEGORIES, type VendorCategory } from "@svadba/shared";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useRouter } from "@/i18n/navigation";

/** Home page search: what, where, when (decision 85). */
export function HomeSearch({ cities, today }: { cities: { slug: string; name: string }[]; today: string }) {
  const t = useTranslations("home.search");
  const ts = useTranslations("search");
  const router = useRouter();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const category = String(fd.get("category")) as VendorCategory;
    const q: Record<string, string> = {};
    const city = String(fd.get("city") ?? "");
    const date = String(fd.get("date") ?? "");
    if (city) q.city = city;
    if (date) q.date = date;
    router.push({ pathname: `/vendors/${CATEGORY_SLUGS[category] ?? "venues"}`, query: q });
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3 shadow-[var(--shadow-card)] sm:grid-cols-[1.1fr_1fr_1fr_auto] sm:items-end sm:p-4"
    >
      <label className="block space-y-1">
        <span className="px-1 text-xs font-medium text-stone">{t("what")}</span>
        <Select name="category" defaultValue="VENUE">
          {VENDOR_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {ts(`tabs.${c}`)}
            </option>
          ))}
        </Select>
      </label>
      <label className="block space-y-1">
        <span className="px-1 text-xs font-medium text-stone">{t("where")}</span>
        <Select name="city" defaultValue="">
          <option value="">{ts("filters.anyCity")}</option>
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="block space-y-1">
        <span className="px-1 text-xs font-medium text-stone">{t("when")}</span>
        <Input name="date" type="date" min={today} />
      </label>
      <Button type="submit" className="h-10">
        <Search aria-hidden className="size-4" /> {t("submit")}
      </Button>
    </form>
  );
}
