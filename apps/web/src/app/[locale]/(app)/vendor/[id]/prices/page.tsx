import { prisma } from "@svadba/db";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ItemEditor } from "@/components/vendor/item-editor";
import { getBusinessAccess } from "@/lib/business";
import { localeFrom } from "@/lib/locale";
import { toEditorItems } from "@/lib/vendor-items";

export default async function BusinessPricesPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const locale = await localeFrom(params);
  const { id } = await params;
  const access = await getBusinessAccess(id);
  if (!access) notFound();
  const { business } = access;
  const t = await getTranslations("vendor.prices");
  const map = await toEditorItems(locale);
  const order = { orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }] };

  if (business.category === "VENUE") {
    const [halls, menus, extras] = await Promise.all([
      prisma.hall.findMany({ where: { businessId: id }, ...order }),
      prisma.menuPackage.findMany({ where: { businessId: id }, ...order }),
      prisma.extra.findMany({ where: { businessId: id }, ...order }),
    ]);
    return (
      <div className="space-y-6">
        <Section title={t("halls")} lead={t("hallsLead")}>
          <ItemEditor kind="hall" businessId={id} currency={business.currency} addLabel={t("addHall")} items={halls.map(map.hall)} />
        </Section>
        <Section title={t("menus")} lead={t("menusLead")}>
          <ItemEditor kind="menu" businessId={id} currency={business.currency} addLabel={t("addMenu")} items={menus.map(map.menu)} />
        </Section>
        <Section title={t("extras")} lead={t("extrasLead")}>
          <ItemEditor kind="extra" businessId={id} currency={business.currency} addLabel={t("addExtra")} items={extras.map(map.extra)} />
        </Section>
      </div>
    );
  }

  const packages = await prisma.servicePackage.findMany({ where: { businessId: id }, ...order });
  return (
    <Section title={t("packages")} lead={business.category === "BAND" ? t("packagesLeadBand") : t("packagesLeadPhoto")}>
      <ItemEditor
        kind="package"
        businessId={id}
        currency={business.currency}
        addLabel={t("addPackage")}
        isBand={business.category === "BAND"}
        items={packages.map(map.package)}
      />
    </Section>
  );
}

function Section({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  return (
    <Card className="p-6 sm:p-7">
      <h2 className="font-display text-xl">{title}</h2>
      <p className="mb-5 mt-1 text-sm text-stone">{lead}</p>
      {children}
    </Card>
  );
}
