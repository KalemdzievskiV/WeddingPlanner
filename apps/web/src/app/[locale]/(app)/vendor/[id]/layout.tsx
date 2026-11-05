import { prisma } from "@svadba/db";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/button";
import { BusinessTabs } from "@/components/vendor/business-tabs";
import { StatusBadge } from "@/components/vendor/status-badge";
import { Link } from "@/i18n/navigation";
import { getBusinessAccess } from "@/lib/business";
import { isUnread } from "@/lib/inquiry-view";
import { localeFrom } from "@/lib/locale";
import { requireUser } from "@/lib/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const b = await prisma.business.findUnique({ where: { id }, select: { name: true } });
  return { title: b?.name, robots: { index: false } };
}

export default async function BusinessLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string; id: string }>;
}) {
  const locale = await localeFrom(params);
  await requireUser(locale);
  const { id } = await params;
  const access = await getBusinessAccess(id);
  if (!access) notFound();
  const { business, role } = access;
  const t = await getTranslations("vendor");
  const inquiries = await prisma.inquiry.findMany({
    where: { businessId: business.id },
    select: { lastMessageAt: true, coupleSeenAt: true, vendorSeenAt: true },
  });
  const unread = inquiries.filter((i) => isUnread(i, "vendor")).length;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={role === "ADMIN" ? `/admin/businesses/${business.id}` : "/vendor"}
        className="inline-flex items-center gap-1.5 text-sm text-stone hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" /> {t("header.allBusinesses")}
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-vranec">{t(`categories.${business.category}`)}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl sm:text-4xl">{business.name}</h1>
            <StatusBadge status={business.status} />
          </div>
        </div>
        <Link href={`/v/${business.slug}`} target="_blank" className={buttonClass("secondary", "sm")}>
          {business.status === "APPROVED" ? t("header.viewPublic") : t("header.preview")}
          <ExternalLink aria-hidden className="size-3.5" />
        </Link>
      </div>
      <div className="mt-6">
        <BusinessTabs businessId={business.id} category={business.category} unread={unread} />
      </div>
      <div className="pt-8">{children}</div>
    </div>
  );
}
