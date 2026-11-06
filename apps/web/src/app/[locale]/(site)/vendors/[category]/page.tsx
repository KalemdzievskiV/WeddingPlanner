import type { Metadata } from "next";
import { SearchView, searchMetadata, type SearchParams } from "@/components/search/search-view";
import { localeFrom } from "@/lib/locale";

type Props = {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const locale = await localeFrom(params);
  const { category } = await params;
  // Filtered views point search engines at the plain category or city landing page.
  const city = (await searchParams).city;
  return (await searchMetadata(locale, category, typeof city === "string" ? city : null)) ?? {};
}

export default async function SearchPage({ params, searchParams }: Props) {
  const locale = await localeFrom(params);
  const { category } = await params;
  return <SearchView locale={locale} slug={category} sp={await searchParams} />;
}
