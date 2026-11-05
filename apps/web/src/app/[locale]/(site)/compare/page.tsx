import { prisma } from "@svadba/db";
import { COMPARE_MAX, convertPrice, pickLocalized, type Currency, type VendorCategory } from "@svadba/shared";
import { Check, Minus, Star } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { CompareRemove } from "@/components/search/compare-remove";
import { FavoriteButton } from "@/components/search/favorite-button";
import { ButtonLink } from "@/components/ui/button";
import { Stitch } from "@/components/ui/stitch";
import { Link } from "@/i18n/navigation";
import { todayIso } from "@/lib/dates";
import { formatDate, formatMoney } from "@/lib/format";
import { localeFrom } from "@/lib/locale";
import { dateFitFor } from "@/lib/search";
import { cn } from "@/lib/utils";
import { favoriteContext } from "@/lib/visitor";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("search.compare"))("title"), robots: { index: false } };
}

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ids?: string; date?: string }>;
};

/** Side-by-side comparison of 2–4 vendors of one category (decision 83). */
export default async function ComparePage({ params, searchParams }: Props) {
  const locale = await localeFrom(params);
  const sp = await searchParams;
  const t = await getTranslations("search");
  const tc = await getTranslations("search.compare");
  const ids = [...new Set((sp.ids ?? "").split(",").filter(Boolean))].slice(0, COMPARE_MAX);
  const fav = await favoriteContext();
  // The searched date, else the couple's wedding date.
  const weddingDate = fav.access?.wedding.date?.toISOString().slice(0, 10) ?? null;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : weddingDate && weddingDate >= todayIso() ? weddingDate : null;

  const rows = ids.length
    ? await prisma.business.findMany({
        where: { id: { in: ids }, status: "APPROVED" },
        include: {
          city: true,
          halls: true,
          menuPackages: true,
          servicePackages: true,
          features: { include: { feature: true } },
          genres: { include: { genre: true } },
          photos: { where: { galleryId: null }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: 1 },
          availability: date ? { where: { date: new Date(`${date}T00:00:00Z`) } } : false,
        },
      })
    : [];
  // Keep the order the couple picked; only one category is compared at a time.
  const category = rows.find((r) => r.id === ids[0])?.category ?? rows[0]?.category;
  const vendors = ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is (typeof rows)[number] => !!r && r.category === category);

  if (vendors.length < 2) {
    return (
      <main id="main" className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-4xl">{tc("title")}</h1>
        <p className="mx-auto mt-4 max-w-md text-ink-soft">{tc("emptyText")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/vendors">{tc("browse")}</ButtonLink>
          {fav.access && (
            <ButtonLink href="/plan/favourites" variant="secondary">
              {tc("fromFavourites")}
            </ButtonLink>
          )}
        </div>
      </main>
    );
  }

  const cheapest = (prices: { amount: number; currency: Currency }[]) =>
    prices.reduce<{ amount: number; currency: Currency } | null>(
      (min, p) => (!min || convertPrice(p.amount, p.currency, "EUR") < convertPrice(min.amount, min.currency, "EUR") ? p : min),
      null,
    );
  const allFeatures = new Map<string, string>();
  for (const v of vendors) for (const { feature } of v.features) allFeatures.set(feature.id, pickLocalized(feature, "name", locale));

  const none = <Minus aria-label={tc("none")} className="size-4 text-line-strong" />;
  const remaining = (id: string) => vendors.map((v) => v.id).filter((x) => x !== id);

  return (
    <main id="main" className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="font-display text-4xl sm:text-5xl">{tc("title")}</h1>
      <p className="mt-3 text-ink-soft">{t(`tabs.${category as VendorCategory}`)}</p>
      <Stitch className="mt-6 w-32" />

      <div className="-mx-4 mt-8 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr>
              <td className="sticky left-0 z-10 w-40 bg-linen" />
              {vendors.map((v) => (
                <th key={v.id} scope="col" className="px-4 pb-4 text-left align-top font-normal">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-rosehip">
                    {v.photos[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.photos[0].url} alt="" className="size-full object-cover" />
                    )}
                    <FavoriteButton businessId={v.id} initial={fav.favorites.has(v.id)} state={fav.state} className="absolute right-2 top-2" />
                  </div>
                  <Link href={`/v/${v.slug}`} className="mt-3 block text-lg font-semibold leading-snug hover:text-vranec">
                    {v.name}
                  </Link>
                  <CompareRemove id={v.id} category={v.category} remaining={remaining(v.id)} date={sp.date ?? null} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row vendors={vendors} label={t("filters.city")}>{(v) => (v.city ? pickLocalized(v.city, "name", locale) : none)}</Row>
            <Row vendors={vendors} label={tc("rating")}>
              {(v) =>
                v.ratingCount > 0 && v.ratingAvg != null ? (
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Star aria-hidden className="size-4 fill-amber text-amber" /> {v.ratingAvg.toFixed(1)}
                    <span className="text-stone">({v.ratingCount})</span>
                  </span>
                ) : (
                  <span className="text-stone">{tc("noReviews")}</span>
                )
              }
            </Row>
            <Row vendors={vendors} label={category === "VENUE" ? tc("pricePerPerson") : tc("priceFrom")}>
              {(v) => {
                const p = cheapest(
                  category === "VENUE"
                    ? v.menuPackages.map((m) => ({ amount: m.pricePerPerson, currency: m.currency }))
                    : v.servicePackages.map((s) => ({ amount: s.price, currency: s.currency })),
                );
                return p ? (
                  <span className="font-semibold tabular-nums">
                    {t("from")} {formatMoney(p.amount, p.currency, locale)}
                  </span>
                ) : (
                  none
                );
              }}
            </Row>
            {date && (
              <Row vendors={vendors} label={tc("onDate", { date: formatDate(date) })}>
                {(v) => {
                  const fit = dateFitFor(v.category, v.halls, v.availability || [], v.unmarkedDays);
                  return (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        fit === "free" && "bg-olive-soft text-olive",
                        fit === "tentative" && "bg-amber-soft text-amber",
                        fit === "ask" && "bg-ink/5 text-ink-soft",
                        fit === "booked" && "bg-danger-soft text-danger",
                      )}
                    >
                      {tc(`fit.${fit}`)}
                    </span>
                  );
                }}
              </Row>
            )}
            {category === "VENUE" && (
              <>
                <Row vendors={vendors} label={tc("capacity")}>
                  {(v) =>
                    v.halls.length ? (
                      <span className="tabular-nums">
                        {t("upTo", { count: Math.max(...v.halls.map((h) => h.capacityMax)) })}
                        {v.halls.length > 1 && <span className="text-stone"> · {tc("halls", { count: v.halls.length })}</span>}
                      </span>
                    ) : (
                      none
                    )
                  }
                </Row>
                <Row vendors={vendors} label={tc("menus")}>{(v) => <span className="tabular-nums">{v.menuPackages.length || none}</span>}</Row>
                {[...allFeatures].map(([id, name]) => (
                  <Row vendors={vendors} key={id} label={name}>
                    {(v) =>
                      v.features.some((f) => f.featureId === id) ? <Check aria-label={tc("yes")} className="size-4 text-olive" /> : none
                    }
                  </Row>
                ))}
              </>
            )}
            {category !== "VENUE" && (
              <Row vendors={vendors} label={tc("packages")}>{(v) => <span className="tabular-nums">{v.servicePackages.length || none}</span>}</Row>
            )}
            {category === "BAND" && (
              <Row vendors={vendors} label={t("filters.genres")}>
                {(v) => (v.genres.length ? v.genres.map((g) => pickLocalized(g.genre, "name", locale)).join(", ") : none)}
              </Row>
            )}
            <Row vendors={vendors} label={tc("phone")}>{(v) => (v.phone ? <a href={`tel:${v.phone}`} className="tabular-nums hover:text-vranec">{v.phone}</a> : none)}</Row>
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Row<V extends { id: string }>({ label, vendors, children }: { label: string; vendors: V[]; children: (v: V) => ReactNode }) {
  return (
    <tr className="border-t border-line align-top">
      <th scope="row" className="sticky left-0 z-10 w-40 bg-linen py-3 pr-4 text-left text-sm font-medium text-ink-soft">
        {label}
      </th>
      {vendors.map((v) => (
        <td key={v.id} className="px-4 py-3 text-sm">
          {children(v)}
        </td>
      ))}
    </tr>
  );
}
