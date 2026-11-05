import { prisma } from "@svadba/db";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CATEGORY_SLUGS, VENDOR_CATEGORIES } from "@svadba/shared";
import { Search, Star } from "lucide-react";
import { VendorList } from "@/components/plan/vendor-list";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { todayIso } from "@/lib/dates";
import { loadBudget } from "@/lib/budget-summary";
import { formatMoney } from "@/lib/format";
import { localeFrom } from "@/lib/locale";
import { canEdit, requireWedding } from "@/lib/wedding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("plan.vendors"))("title") };
}

export default async function PlanVendorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  const { wedding, role, user } = await requireWedding(locale);
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

  // Shortcuts open search with the wedding's city, date and guests already filled in (decision 85).
  const [city, guestTotal] = await Promise.all([
    wedding.cityId ? prisma.city.findUnique({ where: { id: wedding.cityId }, select: { slug: true } }) : null,
    prisma.guest.count({ where: { weddingId: wedding.id } }),
  ]);
  const weddingDate = wedding.date?.toISOString().slice(0, 10) ?? null;
  const upcoming = weddingDate && weddingDate >= todayIso() ? weddingDate : null;
  const guests = Math.max(guestTotal, wedding.estimatedGuests ?? 0);
  const searchQuery = (category: (typeof VENDOR_CATEGORIES)[number]) => {
    const q: Record<string, string> = {};
    if (city) q.city = city.slug;
    if (upcoming) q.date = upcoming;
    if (category === "VENUE" && guests > 0) q.guests = String(guests);
    return q;
  };
  // Booked catalog vendors can be reviewed once the wedding date has passed (decision 16).
  const ownBusinesses = new Set(
    (await prisma.businessMember.findMany({ where: { userId: user.id }, select: { businessId: true } })).map((m) => m.businessId),
  );
  const reviewable =
    canEdit(role) && weddingDate && weddingDate < todayIso()
      ? vendors.filter((v) => v.status === "BOOKED" && v.business?.status === "APPROVED" && !ownBusinesses.has(v.businessId!))
      : [];
  const tp = await getTranslations("plan.vendors");

  return (
    <div className="space-y-8">
      <nav aria-label={tp("findTitle")} className="grid gap-3 sm:grid-cols-3">
        {VENDOR_CATEGORIES.map((c) => (
          <Link
            key={c}
            href={{ pathname: `/vendors/${CATEGORY_SLUGS[c]}`, query: searchQuery(c) }}
            className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3 text-sm font-medium transition-colors hover:border-vranec/40"
          >
            <Search aria-hidden className="size-4 text-vranec" />
            {tp(`find.${c}`)}
          </Link>
        ))}
      </nav>
      {reviewable.length > 0 && (
        <Card className="p-5">
          <h2 className="font-display text-xl">{tp("reviewTitle")}</h2>
          <p className="mt-1 text-sm text-ink-soft">{tp("reviewText")}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {reviewable.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/v/${v.business!.slug}#reviews`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-sm hover:border-vranec/40"
                >
                  <Star aria-hidden className="size-3.5 text-amber" /> {v.name}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
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
    </div>
  );
}
