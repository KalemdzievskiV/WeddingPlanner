import { prisma } from "@svadba/db";
import { CATEGORY_SLUGS, DEFAULT_LOCALE, LOCALES, VENDOR_CATEGORIES } from "@svadba/shared";
import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

// Reads the database on each request (cached by crawlers), never at build time.
export const dynamic = "force-dynamic";

/**
 * Decision 95: home, category pages, category × city pages that have vendors, approved vendor
 * profiles and legal pages, each in all three languages with hreflang alternates.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.appUrl;
  const entries: MetadataRoute.Sitemap = [];
  const add = (path: string, opts: { lastModified?: Date; priority?: number } = {}) => {
    const languages = {
      ...Object.fromEntries(LOCALES.map((l) => [l, `${base}/${l}${path}`])),
      "x-default": `${base}/${DEFAULT_LOCALE}${path}`,
    };
    for (const l of LOCALES) {
      entries.push({ url: `${base}/${l}${path}`, alternates: { languages }, ...opts });
    }
  };

  add("", { priority: 1 });
  for (const c of VENDOR_CATEGORIES) add(`/vendors/${CATEGORY_SLUGS[c]}`, { priority: 0.8 });

  const vendors = await prisma.business.findMany({
    where: { status: "APPROVED" },
    select: { slug: true, category: true, updatedAt: true, city: { select: { slug: true, active: true } } },
    orderBy: { approvedAt: "asc" },
  });

  const combos = new Set<string>();
  for (const v of vendors) {
    if (v.city?.active) combos.add(`/vendors/${CATEGORY_SLUGS[v.category]}/${v.city.slug}`);
  }
  for (const path of [...combos].sort()) add(path, { priority: 0.7 });
  for (const v of vendors) add(`/v/${v.slug}`, { lastModified: v.updatedAt, priority: 0.6 });

  add("/privacy", { priority: 0.1 });
  add("/terms", { priority: 0.1 });
  return entries;
}
