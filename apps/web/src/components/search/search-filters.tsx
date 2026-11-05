"use client";

import { CATEGORY_SLUGS, CURRENCIES, type Currency, type VendorCategory } from "@svadba/shared";
import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Option = { slug: string; name: string };

export type FilterValues = {
  citySlug: string | null;
  date: string | null;
  guests: number | null;
  priceMax: number | null;
  currency: Currency;
  features: string[];
  genres: string[];
  sort: string;
  view: "list" | "map";
};

/** Search filters (decision 32). Changes apply when the form is submitted, so phones don't reload on every tap. */
export function SearchFilters({
  category,
  values,
  cities,
  features,
  genres,
  today,
}: {
  category: VendorCategory;
  values: FilterValues;
  cities: Option[];
  features: Option[];
  genres: Option[];
  today: string;
}) {
  const t = useTranslations("search.filters");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const active =
    [values.citySlug, values.date, values.guests, values.priceMax].filter(Boolean).length + values.features.length + values.genres.length;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q: Record<string, string> = {};
    const set = (key: string, value: FormDataEntryValue | null) => {
      const v = String(value ?? "").trim();
      if (v) q[key] = v;
    };
    set("city", fd.get("city"));
    set("date", fd.get("date"));
    set("guests", fd.get("guests"));
    set("price", fd.get("price"));
    if (q.price) set("cur", fd.get("cur"));
    const feats = fd.getAll("features").map(String);
    if (feats.length) q.features = feats.join(",");
    const gens = fd.getAll("genres").map(String);
    if (gens.length) q.genres = gens.join(",");
    if (values.sort !== "best") q.sort = values.sort;
    if (values.view === "map") q.view = "map";
    setOpen(false);
    router.push({ pathname: `/vendors/${CATEGORY_SLUGS[category]}`, query: q });
  }

  const priceLabel = category === "VENUE" ? t("pricePerPerson") : t("pricePackage");

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="search-filters"
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface text-[15px] font-medium lg:hidden"
      >
        <SlidersHorizontal aria-hidden className="size-4" />
        {t("toggle")}
        {active > 0 && <span className="rounded-full bg-vranec px-1.5 text-xs text-white tabular-nums">{active}</span>}
      </button>

      {/* key: reset the uncontrolled fields when the URL changes */}
      <form
        key={JSON.stringify(values)}
        id="search-filters"
        onSubmit={submit}
        className={cn("mt-3 space-y-5 rounded-[var(--radius-card)] border border-line bg-surface p-5 lg:mt-0 lg:block", !open && "hidden")}
      >
        <Field id="f-city" label={t("city")}>
          <Select id="f-city" name="city" defaultValue={values.citySlug ?? ""}>
            <option value="">{t("anyCity")}</option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="f-date" label={t("date")} hint={t("dateHint")}>
          <Input id="f-date" name="date" type="date" min={today} defaultValue={values.date ?? ""} />
        </Field>

        {category === "VENUE" && (
          <Field id="f-guests" label={t("guests")}>
            <Input id="f-guests" name="guests" type="number" inputMode="numeric" min={1} max={5000} defaultValue={values.guests ?? ""} />
          </Field>
        )}

        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">{priceLabel}</legend>
          <div className="flex gap-2">
            <Input
              className="min-w-0"
              aria-label={priceLabel}
              name="price"
              type="number"
              inputMode="numeric"
              min={1}
              placeholder={t("priceAny")}
              defaultValue={values.priceMax ?? ""}
            />
            <select
              aria-label={t("currency")}
              name="cur"
              defaultValue={values.currency}
              className="h-10 w-20 shrink-0 rounded-lg border border-line-strong bg-surface px-2 text-[15px] focus:border-vranec focus:outline-none focus:ring-2 focus:ring-vranec/15"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c === "EUR" ? "€" : "ден."}
                </option>
              ))}
            </select>
          </div>
        </fieldset>

        {features.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t("features")}</legend>
            <div className="space-y-2">
              {features.map((f) => (
                <label key={f.slug} className="flex items-center gap-2 text-sm text-ink-soft">
                  <input
                    type="checkbox"
                    name="features"
                    value={f.slug}
                    defaultChecked={values.features.includes(f.slug)}
                    className="size-4 rounded border-line-strong accent-vranec"
                  />
                  {f.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {genres.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t("genres")}</legend>
            <div className="space-y-2">
              {genres.map((g) => (
                <label key={g.slug} className="flex items-center gap-2 text-sm text-ink-soft">
                  <input
                    type="checkbox"
                    name="genres"
                    value={g.slug}
                    defaultChecked={values.genres.includes(g.slug)}
                    className="size-4 rounded border-line-strong accent-vranec"
                  />
                  {g.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="flex items-center gap-3 border-t border-line pt-4">
          <Button type="submit" className="flex-1">
            {t("apply")}
          </Button>
          {active > 0 && (
            <Link href={`/vendors/${CATEGORY_SLUGS[category]}`} className="text-sm text-ink-soft underline-offset-4 hover:underline">
              {t("clear")}
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}

/** Sort dropdown; applies at once. */
export function SortSelect({ value, options, query, path }: { value: string; options: { value: string; label: string }[]; query: Record<string, string>; path: string }) {
  const t = useTranslations("search");
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm text-ink-soft">
      <span className="hidden sm:inline">{t("sortLabel")}</span>
      <select
        value={value}
        onChange={(e) => {
          const q = { ...query };
          delete q.page;
          if (e.target.value === "best") delete q.sort;
          else q.sort = e.target.value;
          router.push({ pathname: path, query: q });
        }}
        className="h-9 rounded-lg border border-line-strong bg-surface px-2 text-sm text-ink focus:border-vranec focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
