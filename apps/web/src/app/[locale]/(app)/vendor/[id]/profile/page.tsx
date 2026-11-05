import { prisma } from "@svadba/db";
import { pickLocalized } from "@svadba/shared";
import { notFound } from "next/navigation";
import { ProfileForm } from "@/components/vendor/profile-form";
import { getBusinessAccess } from "@/lib/business";
import { cityOptions } from "@/lib/cities";
import { localeFrom } from "@/lib/locale";

export default async function BusinessProfilePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const locale = await localeFrom(params);
  const { id } = await params;
  const access = await getBusinessAccess(id);
  if (!access) notFound();
  const { business } = access;

  const [cities, features, genres, selectedFeatures, selectedGenres] = await Promise.all([
    cityOptions(locale),
    prisma.venueFeature.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.musicGenre.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.businessFeature.findMany({ where: { businessId: id }, select: { featureId: true } }),
    prisma.businessGenre.findMany({ where: { businessId: id }, select: { genreId: true } }),
  ]);

  return (
    <ProfileForm
      businessId={business.id}
      values={business}
      cities={cities}
      features={features.map((f) => ({ id: f.id, name: pickLocalized(f, "name", locale) }))}
      genres={genres.map((g) => ({ id: g.id, name: pickLocalized(g, "name", locale) }))}
      selectedFeatures={selectedFeatures.map((f) => f.featureId)}
      selectedGenres={selectedGenres.map((g) => g.genreId)}
    />
  );
}
