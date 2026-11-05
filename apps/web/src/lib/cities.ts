import "server-only";
import { prisma } from "@svadba/db";
import { pickLocalized, type Locale } from "@svadba/shared";

/** Active cities as {id, name} in the given language, alphabetical. */
export async function cityOptions(locale: Locale) {
  const cities = await prisma.city.findMany({ where: { active: true } });
  return cities
    .map((c) => ({ id: c.id, slug: c.slug, name: pickLocalized(c, "name", locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}
