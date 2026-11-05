import { prisma } from "@svadba/db";
import { convertPrice, pickLocalized, VENDOR_CATEGORIES, type Currency } from "@svadba/shared";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CompareTray } from "@/components/search/compare-tray";
import { ResultCard } from "@/components/search/result-card";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { localeFrom } from "@/lib/locale";
import { dateFitFor, type SearchResult } from "@/lib/search";
import { todayIso } from "@/lib/dates";
import { canEdit, requireWedding } from "@/lib/wedding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("favourites"))("title") };
}

/** The wedding's saved vendors by category; tick 2–4 of one category to compare (decision 83). */
export default async function FavouritesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  const { wedding, role } = await requireWedding(locale);
  const t = await getTranslations("favourites");
  const ts = await getTranslations("search");
  const weddingDate = wedding.date?.toISOString().slice(0, 10) ?? null;
  const date = weddingDate && weddingDate >= todayIso() ? weddingDate : null;

  const favorites = await prisma.favorite.findMany({
    where: { weddingId: wedding.id, business: { status: "APPROVED" } },
    orderBy: { createdAt: "desc" },
    include: {
      business: {
        include: {
          city: true,
          halls: true,
          menuPackages: { select: { pricePerPerson: true, currency: true } },
          servicePackages: { select: { price: true, currency: true } },
          photos: { where: { galleryId: null }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: 1 },
          availability: date ? { where: { date: new Date(`${date}T00:00:00Z`) } } : false,
        },
      },
    },
  });

  const toResult = (b: (typeof favorites)[number]["business"]): SearchResult => {
    const prices: { amount: number; currency: Currency }[] =
      b.category === "VENUE"
        ? b.menuPackages.map((m) => ({ amount: m.pricePerPerson, currency: m.currency }))
        : b.servicePackages.map((p) => ({ amount: p.price, currency: p.currency }));
    const cheapest = prices.reduce<(typeof prices)[number] | null>(
      (min, p) => (!min || convertPrice(p.amount, p.currency, "EUR") < convertPrice(min.amount, min.currency, "EUR") ? p : min),
      null,
    );
    const fit = date ? dateFitFor(b.category, b.halls, b.availability || [], b.unmarkedDays) : null;
    return {
      id: b.id,
      slug: b.slug,
      name: b.name,
      category: b.category,
      city: b.city ? pickLocalized(b.city, "name", locale) : null,
      cover: b.photos[0]?.url ?? null,
      priceFrom: cheapest ? { ...cheapest, perPerson: b.category === "VENUE" } : null,
      capacityMax: b.halls.length ? Math.max(...b.halls.map((h) => h.capacityMax)) : null,
      rating: b.ratingCount > 0 && b.ratingAvg != null ? { avg: b.ratingAvg, count: b.ratingCount } : null,
      // Booked on the wedding date is worth showing here, unlike in search.
      dateFit: fit === "booked" ? null : fit,
      lat: b.lat,
      lng: b.lng,
      approvedAt: b.approvedAt,
    };
  };

  const state = canEdit(role) ? "ready" : "viewer";

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-ink-soft">{t("lead")}</p>
        <ButtonLink href="/vendors" variant="secondary">
          {ts("browse")}
        </ButtonLink>
      </div>
      {favorites.length === 0 ? (
        <Card className="p-10 text-center text-ink-soft">{t("empty")}</Card>
      ) : (
        VENDOR_CATEGORIES.map((c) => {
          const list = favorites.filter((f) => f.business.category === c);
          if (list.length === 0) return null;
          return (
            <section key={c}>
              <h2 className="mb-4 font-display text-2xl">{ts(`tabs.${c}`)}</h2>
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((f) => (
                  <li key={f.businessId}>
                    <ResultCard r={toResult(f.business)} locale={locale} date={date} favorite favoriteState={state} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
      <CompareTray date={date} />
    </div>
  );
}
