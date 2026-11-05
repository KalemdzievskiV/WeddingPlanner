import { prisma } from "@svadba/db";
import { OPEN_INQUIRY_STATUSES, pickLocalized } from "@svadba/shared";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { InquiryForm } from "@/components/inquiry/inquiry-form";
import { Card } from "@/components/ui/card";
import { Link, redirect } from "@/i18n/navigation";
import { todayIso } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { localeFrom } from "@/lib/locale";
import { countForEvent } from "@/lib/planner-calc";
import { eventName } from "@/lib/plan-helpers";
import { canEdit, requireWedding } from "@/lib/wedding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("inquiries.form"))("title") };
}

export default async function NewInquiryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ vendor?: string }>;
}) {
  const locale = await localeFrom(params);
  const { wedding, role } = await requireWedding(locale);
  if (!canEdit(role)) return redirect({ href: "/plan/inquiries", locale });
  const { vendor } = await searchParams;
  if (!vendor) return redirect({ href: "/vendors", locale });
  const business = await prisma.business.findFirst({
    where: { slug: vendor, status: "APPROVED" },
    include: {
      city: true,
      halls: { orderBy: { sortOrder: "asc" } },
      menuPackages: { orderBy: { sortOrder: "asc" } },
      servicePackages: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!business) notFound();

  const t = await getTranslations("inquiries.form");
  const te = await getTranslations("plan.events");
  const tv = await getTranslations("vendor");
  const [events, guests, openOnes] = await Promise.all([
    prisma.weddingEvent.findMany({ where: { weddingId: wedding.id }, orderBy: { sortOrder: "asc" } }),
    prisma.guest.findMany({ where: { weddingId: wedding.id }, select: { ageGroup: true, invitations: true } }),
    prisma.inquiry.findMany({
      where: { weddingId: wedding.id, businessId: business.id, status: { in: [...OPEN_INQUIRY_STATUSES] } },
      select: { eventId: true },
    }),
  ]);
  const reception = events.find((e) => e.type === "RECEPTION") ?? events[0];
  // Default to the reception unless it already has an open inquiry with this vendor.
  const taken = new Set(openOnes.map((o) => o.eventId));
  const defaultEvent = [reception, ...events].find((e) => e && !taken.has(e.id)) ?? null;
  const listed = defaultEvent ? countForEvent(guests, defaultEvent.id).total : 0;
  const defaultGuests = Math.max(listed, wedding.estimatedGuests ?? 0) || null;
  const weddingDate = wedding.date?.toISOString().slice(0, 10) ?? null;
  const money = (n: number, c: "EUR" | "MKD") => formatMoney(n, c, locale);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/v/${business.slug}`} className="inline-flex items-center gap-1.5 text-sm text-stone hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" /> {business.name}
      </Link>
      <h2 className="mt-3 font-display text-3xl">{t("heading", { business: business.name })}</h2>
      <p className="mt-2 text-ink-soft">{t("lead")}</p>
      <Card className="mt-6 p-6 sm:p-8">
        <InquiryForm
          businessId={business.id}
          today={todayIso()}
          defaultEventId={defaultEvent?.id ?? null}
          defaultGuests={defaultGuests}
          events={events.map((e) => ({
            id: e.id,
            label: eventName(e, te),
            date: e.date?.toISOString().slice(0, 10) ?? (e.type === "RECEPTION" ? weddingDate : null),
          }))}
          halls={business.halls.map((h) => ({
            id: h.id,
            label: `${h.name} · ${h.capacityMin ? tv("prices.guestsRange", { min: h.capacityMin, max: h.capacityMax }) : tv("prices.guestsMax", { max: h.capacityMax })}`,
          }))}
          packages={[
            ...business.menuPackages.map((m) => ({
              id: `menu:${m.id}`,
              label: `${pickLocalized(m, "name", locale)} · ${tv("prices.perPerson", { price: money(m.pricePerPerson, m.currency) })}`,
            })),
            ...business.servicePackages.map((p) => ({ id: `package:${p.id}`, label: `${pickLocalized(p, "name", locale)} · ${money(p.price, p.currency)}` })),
          ]}
        />
      </Card>
    </div>
  );
}
