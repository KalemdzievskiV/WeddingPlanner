import { prisma } from "@svadba/db";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { VendorList } from "@/components/plan/vendor-list";
import { loadBudget } from "@/lib/budget-summary";
import { formatMoney } from "@/lib/format";
import { localeFrom } from "@/lib/locale";
import { canEdit, requireWedding } from "@/lib/wedding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("plan.vendors"))("title") };
}

export default async function PlanVendorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  const { wedding, role } = await requireWedding(locale);
  const tv = await getTranslations("vendor.categories");
  const [vendors, budget] = await Promise.all([
    prisma.plannedVendor.findMany({
      where: { weddingId: wedding.id },
      include: { business: { select: { slug: true, category: true, status: true } } },
      orderBy: [{ status: "desc" }, { createdAt: "asc" }],
    }),
    loadBudget(wedding),
  ]);
  const budgetByVendor = new Map<string, number>();
  for (const c of budget.categories)
    for (const e of c.expenses)
      if (e.plannedVendorId) budgetByVendor.set(e.plannedVendorId, (budgetByVendor.get(e.plannedVendorId) ?? 0) + e.plannedConv);

  return (
    <VendorList
      editable={canEdit(role)}
      vendors={vendors.map((v) => ({
        id: v.id,
        name: v.name,
        kind: v.kind ?? (v.business ? tv(v.business.category) : null),
        contact: v.contact,
        status: v.status,
        notes: v.notes,
        slug: v.business?.status === "APPROVED" ? v.business.slug : null,
        inBudget: budgetByVendor.has(v.id) ? formatMoney(budgetByVendor.get(v.id)!, wedding.currency, locale) : null,
      }))}
    />
  );
}
