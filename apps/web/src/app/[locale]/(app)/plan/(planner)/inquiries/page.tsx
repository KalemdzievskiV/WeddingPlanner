import { prisma } from "@svadba/db";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { InquiryStatusBadge } from "@/components/inquiry/status-badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { formatDate, formatDateTime } from "@/lib/format";
import { isUnread } from "@/lib/inquiry-view";
import { localeFrom } from "@/lib/locale";
import { requireWedding } from "@/lib/wedding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("inquiries"))("title") };
}

export default async function PlanInquiriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  const { wedding } = await requireWedding(locale);
  const t = await getTranslations("inquiries");
  const tv = await getTranslations("vendor.categories");
  const inquiries = await prisma.inquiry.findMany({
    where: { weddingId: wedding.id },
    orderBy: { lastMessageAt: "desc" },
    include: { business: { select: { name: true, category: true } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-soft">{t("coupleLead")}</p>
        <ButtonLink href="/vendors" variant="secondary">
          {t("findVendors")}
        </ButtonLink>
      </div>
      {inquiries.length === 0 ? (
        <Card className="p-10 text-center text-ink-soft">{t("coupleEmpty")}</Card>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
          {inquiries.map((i) => {
            const unread = isUnread(i, "couple");
            return (
              <li key={i.id}>
                <Link href={`/plan/inquiries/${i.id}`} className="flex items-start gap-4 px-5 py-4 hover:bg-linen/60">
                  <span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${unread ? "bg-vranec" : "bg-transparent"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className={unread ? "font-semibold" : "font-medium"}>{i.business.name}</span>
                      <span className="text-sm text-stone">{tv(i.business.category)}</span>
                      <InquiryStatusBadge status={i.status} side="couple" />
                      {unread && <span className="sr-only">{t("unread")}</span>}
                    </div>
                    {i.messages[0] && <p className="mt-1 truncate text-sm text-ink-soft">{i.messages[0].text}</p>}
                  </div>
                  <div className="shrink-0 text-right text-xs text-stone tabular-nums">
                    {i.date && <p>{formatDate(i.date)}</p>}
                    <p>{formatDateTime(i.lastMessageAt)}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
