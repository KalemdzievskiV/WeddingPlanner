import { prisma } from "@svadba/db";
import { pickLocalized } from "@svadba/shared";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { ItemEditor } from "@/components/vendor/item-editor";
import { getBusinessAccess } from "@/lib/business";
import { cityOptions } from "@/lib/cities";
import { formatMoney } from "@/lib/format";
import { localeFrom } from "@/lib/locale";

export default async function BusinessTravelPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const locale = await localeFrom(params);
  const { id } = await params;
  const access = await getBusinessAccess(id);
  if (!access || access.business.category !== "BAND") notFound();
  const { business } = access;
  const t = await getTranslations("vendor.travel");
  const [fees, home, cities] = await Promise.all([
    prisma.travelFee.findMany({ where: { businessId: id }, include: { city: true } }),
    business.cityId ? prisma.city.findUnique({ where: { id: business.cityId } }) : null,
    cityOptions(locale),
  ]);

  return (
    <Card className="p-6 sm:p-7">
      <h2 className="font-display text-xl">{t("title")}</h2>
      <p className="mb-5 mt-1 text-sm text-stone">
        {home ? t("lead", { city: pickLocalized(home, "name", locale) }) : t("noHome")}
      </p>
      <ItemEditor
        kind="travel"
        businessId={id}
        currency={business.currency}
        addLabel={t("add")}
        cities={cities.filter((c) => c.id !== business.cityId)}
        items={fees
          .map((f) => ({
            id: f.id,
            title: pickLocalized(f.city, "name", locale),
            details: [formatMoney(f.price, f.currency, locale)],
            values: { cityId: f.cityId, price: String(f.price), currency: f.currency },
          }))
          .sort((a, b) => a.title.localeCompare(b.title, locale))}
      />
    </Card>
  );
}
