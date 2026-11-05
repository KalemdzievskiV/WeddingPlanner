import "server-only";
import { prisma, type Prisma } from "@svadba/db";
import {
  convertPrice,
  pickLocalized,
  SEARCH_SORTS,
  type Currency,
  type DayStatus,
  type Locale,
  type SearchSort,
  type VendorCategory,
} from "@svadba/shared";
import { createHash } from "node:crypto";
import { todayIso } from "./dates";

/** Availability on the searched date (decision 75). Booked vendors are left out entirely. */
export type DateFit = "free" | "tentative" | "ask";

export type SearchFilters = {
  category: VendorCategory;
  citySlug: string | null;
  date: string | null;
  guests: number | null;
  /** Upper price: per person for venues, per package for bands and photo/video. */
  priceMax: number | null;
  currency: Currency;
  features: string[];
  genres: string[];
  sort: SearchSort;
  page: number;
  view: "list" | "map";
};

export type SearchResult = {
  id: string;
  slug: string;
  name: string;
  category: VendorCategory;
  city: string | null;
  cover: string | null;
  priceFrom: { amount: number; currency: Currency; perPerson: boolean } | null;
  capacityMax: number | null;
  rating: { avg: number; count: number } | null;
  dateFit: DateFit | null;
  lat: number | null;
  lng: number | null;
  approvedAt: Date | null;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const many = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? v.split(",") : []).map((s) => s.trim()).filter(Boolean).slice(0, 20);
const positiveInt = (v: string | undefined, max: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= max ? n : null;
};

/** Reads filters from the URL's search params; anything invalid is ignored. */
export function parseFilters(category: VendorCategory, sp: Record<string, string | string[] | undefined>): SearchFilters {
  const date = one(sp.date) ?? "";
  const sort = one(sp.sort);
  const cur = one(sp.cur);
  return {
    category,
    citySlug: one(sp.city) || null,
    // Past dates make no sense for a booking search.
    date: DATE_RE.test(date) && date >= todayIso() ? date : null,
    guests: category === "VENUE" ? positiveInt(one(sp.guests), 5000) : null,
    priceMax: positiveInt(one(sp.price), 10_000_000),
    currency: cur === "MKD" ? "MKD" : "EUR",
    features: category === "VENUE" ? many(sp.features) : [],
    genres: category === "BAND" ? many(sp.genres) : [],
    sort: (SEARCH_SORTS as readonly string[]).includes(sort ?? "") ? (sort as SearchSort) : "best",
    page: positiveInt(one(sp.page), 1000) ?? 1,
    view: one(sp.view) === "map" ? "map" : "list",
  };
}

/** Same filters as URL params, for links (pagination, sort, view). */
export function filtersToQuery(f: SearchFilters, overrides: Partial<SearchFilters> = {}) {
  const v = { ...f, ...overrides };
  const q: Record<string, string> = {};
  if (v.citySlug) q.city = v.citySlug;
  if (v.date) q.date = v.date;
  if (v.guests) q.guests = String(v.guests);
  if (v.priceMax) {
    q.price = String(v.priceMax);
    q.cur = v.currency;
  }
  if (v.features.length) q.features = v.features.join(",");
  if (v.genres.length) q.genres = v.genres.join(",");
  if (v.sort !== "best") q.sort = v.sort;
  if (v.page > 1) q.page = String(v.page);
  if (v.view === "map") q.view = "map";
  return q;
}

/** Stable 0–1 number per vendor that changes every day, so the same vendors aren't always first (decision 77). */
function dailyShuffle(id: string, day: string) {
  return createHash("sha1").update(`${id}:${day}`).digest().readUInt32BE(0) / 0xffffffff;
}

/** Rating pulled towards 4.0 until a vendor has a few reviews, so one 5★ review doesn't beat twenty 4.8★. */
function weightedRating(avg: number | null, count: number) {
  const prior = 4;
  const weight = 3;
  return ((avg ?? 0) * count + prior * weight) / (count + weight);
}

/**
 * Availability of a vendor on one day: free if any of its calendars (halls) is free,
 * tentative or "ask" next, booked only when every calendar is booked.
 */
export function dateFitFor(
  category: VendorCategory,
  halls: { id: string }[],
  marked: { calendarKey: string; status: DayStatus }[],
  unmarkedDays: "FREE" | "UNKNOWN",
): DateFit | "booked" {
  const keys = category === "VENUE" && halls.length ? halls.map((h) => h.id) : ["main"];
  const byKey = new Map(marked.map((a) => [a.calendarKey, a.status]));
  const statuses = keys.map((k) => byKey.get(k) ?? (unmarkedDays === "FREE" ? "FREE" : null));
  if (statuses.includes("FREE")) return "free";
  if (statuses.includes("TENTATIVE")) return "tentative";
  if (statuses.includes(null)) return "ask";
  return "booked";
}

const FIT_ORDER: Record<DateFit, number> = { free: 0, tentative: 1, ask: 2 };

export async function searchVendors(f: SearchFilters, locale: Locale) {
  const city = f.citySlug ? await prisma.city.findUnique({ where: { slug: f.citySlug } }) : null;

  const and: Prisma.BusinessWhereInput[] = [];
  if (city) {
    // Venues and studios are in the city; bands also travel to cities they list a fee for.
    and.push(
      f.category === "BAND" ? { OR: [{ cityId: city.id }, { travelFees: { some: { cityId: city.id } } }] } : { cityId: city.id },
    );
  }
  if (f.features.length) {
    const ids = await prisma.venueFeature.findMany({ where: { slug: { in: f.features } }, select: { id: true } });
    for (const { id } of ids) and.push({ features: { some: { featureId: id } } });
  }
  if (f.genres.length) {
    and.push({ genres: { some: { genre: { slug: { in: f.genres } } } } });
  }

  const date = f.date ? new Date(`${f.date}T00:00:00Z`) : null;
  const rows = await prisma.business.findMany({
    where: { status: "APPROVED", category: f.category, AND: and },
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      descriptionMk: true,
      lat: true,
      lng: true,
      unmarkedDays: true,
      ratingAvg: true,
      ratingCount: true,
      approvedAt: true,
      createdAt: true,
      city: true,
      halls: { select: { id: true, capacityMin: true, capacityMax: true } },
      menuPackages: { select: { pricePerPerson: true, currency: true } },
      servicePackages: { select: { price: true, currency: true } },
      photos: { where: { galleryId: null }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: 1, select: { url: true } },
      videoLinks: { select: { id: true }, take: 1 },
      _count: { select: { photos: true } },
      availability: date ? { where: { date }, select: { calendarKey: true, status: true } } : false,
    },
  });

  const today = todayIso();
  const results: (SearchResult & { score: number; fitRank: number; priceEur: number | null; ratingSort: number })[] = [];

  for (const b of rows) {
    // Capacity: venues need a hall that fits the guest count.
    let halls = b.halls;
    if (f.category === "VENUE" && f.guests) {
      halls = halls.filter((h) => h.capacityMax >= f.guests! && (h.capacityMin == null || h.capacityMin <= f.guests!));
      if (halls.length === 0) continue;
    }

    // Date: free if any matching calendar is free; hidden only when all of them are booked.
    let dateFit: DateFit | null = null;
    if (date) {
      const fit = dateFitFor(f.category, halls, b.availability || [], b.unmarkedDays);
      if (fit === "booked") continue;
      dateFit = fit;
    }

    // "From" price in the vendor's own currency; compared in EUR.
    const prices =
      f.category === "VENUE"
        ? b.menuPackages.map((m) => ({ amount: m.pricePerPerson, currency: m.currency }))
        : b.servicePackages.map((p) => ({ amount: p.price, currency: p.currency }));
    let cheapest: { amount: number; currency: Currency } | null = null;
    for (const p of prices)
      if (!cheapest || convertPrice(p.amount, p.currency, "EUR") < convertPrice(cheapest.amount, cheapest.currency, "EUR")) cheapest = p;
    const priceEur = cheapest ? convertPrice(cheapest.amount, cheapest.currency, "EUR") : null;
    if (f.priceMax && (priceEur == null || priceEur > convertPrice(f.priceMax, f.currency, "EUR"))) continue;

    // Best match: profile completeness + rating + a daily shuffle (decision 77).
    const completeness =
      (Math.min(b._count.photos, 10) / 10) * 0.4 +
      (Math.min(b.descriptionMk.length, 400) / 400) * 0.25 +
      (prices.length ? 0.2 : 0) +
      (b.lat != null ? 0.1 : 0) +
      (b.videoLinks.length ? 0.05 : 0);
    const ratingSort = weightedRating(b.ratingAvg, b.ratingCount);
    const score = completeness * 0.45 + (ratingSort / 5) * 0.35 + dailyShuffle(b.id, today) * 0.2;

    results.push({
      id: b.id,
      slug: b.slug,
      name: b.name,
      category: b.category,
      city: b.city ? pickLocalized(b.city, "name", locale) : null,
      cover: b.photos[0]?.url ?? null,
      priceFrom: cheapest ? { ...cheapest, perPerson: f.category === "VENUE" } : null,
      capacityMax: f.category === "VENUE" && halls.length ? Math.max(...halls.map((h) => h.capacityMax)) : null,
      rating: b.ratingCount > 0 && b.ratingAvg != null ? { avg: b.ratingAvg, count: b.ratingCount } : null,
      dateFit,
      lat: b.lat,
      lng: b.lng,
      approvedAt: b.approvedAt ?? b.createdAt,
      score,
      fitRank: dateFit ? FIT_ORDER[dateFit] : 0,
      priceEur,
      ratingSort,
    });
  }

  results.sort((a, b) => {
    // With a date, confirmed-free vendors come first, then tentative, then "ask" (decision 75).
    if (a.fitRank !== b.fitRank) return a.fitRank - b.fitRank;
    switch (f.sort) {
      case "price":
        return (a.priceEur ?? Infinity) - (b.priceEur ?? Infinity);
      case "rating":
        return b.ratingSort - a.ratingSort || b.score - a.score;
      case "newest":
        return (b.approvedAt?.getTime() ?? 0) - (a.approvedAt?.getTime() ?? 0);
      default:
        return b.score - a.score;
    }
  });

  const items: SearchResult[] = results.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    category: r.category,
    city: r.city,
    cover: r.cover,
    priceFrom: r.priceFrom,
    capacityMax: r.capacityMax,
    rating: r.rating,
    dateFit: r.dateFit,
    lat: r.lat,
    lng: r.lng,
    approvedAt: r.approvedAt,
  }));
  return { items, city };
}
