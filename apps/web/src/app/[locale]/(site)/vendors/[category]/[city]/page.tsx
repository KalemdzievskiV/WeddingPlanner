import { prisma } from "@svadba/db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SearchView, searchMetadata, type SearchParams } from "@/components/search/search-view";
import { localeFrom } from "@/lib/locale";

type Props = {
  params: Promise<{ locale: string; category: string; city: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFrom(params);
  const { category, city } = await params;
  return (await searchMetadata(locale, category, city)) ?? {};
}

/** Landing page per category and city, e.g. /mk/vendors/venues/skopje (decision 95). Same results as ?city=. */
export default async function CitySearchPage({ params, searchParams }: Props) {
  const locale = await localeFrom(params);
  const { category, city } = await params;
  const exists = await prisma.city.findFirst({ where: { slug: city, active: true }, select: { id: true } });
  if (!exists) notFound();
  return <SearchView locale={locale} slug={category} sp={{ ...(await searchParams), city }} />;
}
