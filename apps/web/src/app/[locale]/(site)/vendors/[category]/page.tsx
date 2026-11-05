import { prisma } from "@svadba/db";
import { CATEGORY_SLUGS, categoryFromSlug, pickLocalized, SEARCH_PAGE_SIZE, SEARCH_SORTS, VENDOR_CATEGORIES } from "@svadba/shared";
import { List, Map as MapIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CompareTray } from "@/components/search/compare-tray";
import { ResultCard } from "@/components/search/result-card";
import { ResultsMap, type MapPoint } from "@/components/search/results-map";
import { SearchFilters, SortSelect } from "@/components/search/search-filters";
import { Stitch } from "@/components/ui/stitch";
import { Link } from "@/i18n/navigation";
import { todayIso } from "@/lib/dates";
import { formatDate, formatMoney } from "@/lib/format";
import { localeFrom } from "@/lib/locale";
import { filtersToQuery, parseFilters, searchVendors } from "@/lib/search";
import { cn } from "@/lib/utils";
import { favoriteContext } from "@/lib/visitor";

type Props = {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const key = categoryFromSlug(category);
  if (!key) return {};
  const t = await getTranslations("search");
  return { title: t(`title.${key}`), description: t(`lead.${key}`) };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const locale = await localeFrom(params);
  const { category: slug } = await params;
  const category = categoryFromSlug(slug);
  if (!category) notFound();
  const filters = parseFilters(category, await searchParams);
  const t = await getTranslations("search");

  const [{ items, city }, cities, features, genres, fav] = await Promise.all([
    searchVendors(filters, locale),
    prisma.city.findMany({ where: { active: true } }),
    category === "VENUE" ? prisma.venueFeature.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }) : [],
    category === "BAND" ? prisma.musicGenre.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }) : [],
    favoriteContext(),
  ]);

  const path = `/vendors/${slug}`;
  const query = filtersToQuery(filters);
  const pages = Math.max(1, Math.ceil(items.length / SEARCH_PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const pageItems = items.slice((page - 1) * SEARCH_PAGE_SIZE, page * SEARCH_PAGE_SIZE);
  const cityName = city ? pickLocalized(city, "name", locale) : null;
  const points: MapPoint[] = items
    .filter((r) => r.lat != null && r.lng != null)
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      lat: r.lat!,
      lng: r.lng!,
      cover: r.cover,
      price: r.priceFrom
        ? `${t("from")} ${formatMoney(r.priceFrom.amount, r.priceFrom.currency, locale)}${r.priceFrom.perPerson ? ` / ${t("perPerson")}` : ""}`
        : null,
    }));
  const askCount = filters.date ? items.filter((r) => r.dateFit === "ask").length : 0;

  return (
    <main id="main" className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6">
      {/* Category switch keeps city and date, the filters that apply to every category. */}
      <nav aria-label={t("categoriesLabel")} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-2">
          {VENDOR_CATEGORIES.map((c) => {
            const q: Record<string, string> = {};
            if (filters.citySlug) q.city = filters.citySlug;
            if (filters.date) q.date = filters.date;
            return (
              <li key={c}>
                <Link
                  href={{ pathname: `/vendors/${CATEGORY_SLUGS[c]}`, query: q }}
                  aria-current={c === category ? "page" : undefined}
                  className={cn(
                    "block rounded-full border px-4 py-2 text-sm transition-colors",
                    c === category ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink-soft hover:text-ink",
                  )}
                >
                  {t(`tabs.${c}`)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <header className="mt-8">
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">
          {cityName ? t("titleIn", { what: t(`title.${category}`), city: cityName }) : t(`title.${category}`)}
        </h1>
        <p className="mt-3 max-w-2xl text-ink-soft">
          {t(`lead.${category}`)}
        </p>
        <Stitch className="mt-6 w-32" />
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <SearchFilters
            category={category}
            values={{ ...filters, sort: filters.sort }}
            today={todayIso()}
            cities={cities
              .map((c) => ({ slug: c.slug, name: pickLocalized(c, "name", locale) }))
              .sort((a, b) => a.name.localeCompare(b.name, locale))}
            features={features.map((f) => ({ slug: f.slug, name: pickLocalized(f, "name", locale) }))}
            genres={genres.map((g) => ({ slug: g.slug, name: pickLocalized(g, "name", locale) }))}
          />
        </aside>

        <section aria-labelledby="results-heading" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <h2 id="results-heading" className="text-sm text-ink-soft">
              <span className="font-semibold text-ink tabular-nums">{t("count", { count: items.length })}</span>
              {filters.date && <span className="tabular-nums"> · {t("onDate", { date: formatDate(filters.date) })}</span>}
            </h2>
            <div className="flex items-center gap-3">
              <SortSelect
                value={filters.sort}
                path={path}
                query={query}
                options={SEARCH_SORTS.map((s) => ({ value: s, label: t(`sort.${s}`) }))}
              />
              <div className="flex rounded-lg border border-line-strong p-0.5" role="group" aria-label={t("viewLabel")}>
                {(["list", "map"] as const).map((v) => {
                  const q = filtersToQuery(filters, { view: v, page: 1 });
                  const Icon = v === "list" ? List : MapIcon;
                  return (
                    <Link
                      key={v}
                      href={{ pathname: path, query: q }}
                      aria-current={filters.view === v ? "page" : undefined}
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm",
                        filters.view === v ? "bg-ink text-white" : "text-ink-soft hover:text-ink",
                      )}
                    >
                      <Icon aria-hidden className="size-4" /> {t(`view.${v}`)}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-display text-2xl">{t("empty.title")}</p>
              <p className="mx-auto mt-2 max-w-md text-ink-soft">{filters.date ? t("empty.withDate") : t("empty.text")}</p>
              <Link href={path} className="mt-5 inline-block text-sm font-medium text-vranec underline-offset-4 hover:underline">
                {t("filters.clear")}
              </Link>
            </div>
          ) : filters.view === "map" ? (
            <div className="mt-5 space-y-3">
              <ResultsMap points={points} label={t("mapLabel")} />
              {points.length < items.length && (
                <p className="text-sm text-stone">{t("mapMissing", { count: items.length - points.length })}</p>
              )}
            </div>
          ) : (
            <>
              {askCount > 0 && <p className="mt-4 text-sm text-stone">{t("askNote")}</p>}
              <ul className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {pageItems.map((r) => (
                  <li key={r.id}>
                    <ResultCard r={r} locale={locale} date={filters.date} favorite={fav.favorites.has(r.id)} favoriteState={fav.state} />
                  </li>
                ))}
              </ul>
              {pages > 1 && (
                <nav aria-label={t("pagesLabel")} className="mt-10 flex items-center justify-center gap-1">
                  {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={{ pathname: path, query: filtersToQuery(filters, { page: p }) }}
                      aria-current={p === page ? "page" : undefined}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg text-sm tabular-nums",
                        p === page ? "bg-ink text-white" : "text-ink-soft hover:bg-ink/5",
                      )}
                    >
                      {p}
                    </Link>
                  ))}
                </nav>
              )}
            </>
          )}
        </section>
      </div>
      <CompareTray date={filters.date} />
    </main>
  );
}
