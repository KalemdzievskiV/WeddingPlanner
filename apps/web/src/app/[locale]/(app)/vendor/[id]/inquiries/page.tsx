import { prisma } from "@svadba/db";
import { OPEN_INQUIRY_STATUSES } from "@svadba/shared";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { InquiryStatusBadge } from "@/components/inquiry/status-badge";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getBusinessAccess } from "@/lib/business";
import { formatDate, formatDateTime } from "@/lib/format";
import { isUnread } from "@/lib/inquiry-view";
import { coupleNames } from "@/lib/plan-helpers";
import { cn } from "@/lib/utils";

/** Vendor inbox (decision 30): open conversations first, then closed ones. */
export default async function VendorInquiriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ show?: string }>;
}) {
  const { id } = await params;
  const access = await getBusinessAccess(id);
  if (!access) notFound();
  const showAll = (await searchParams).show === "all";
  const t = await getTranslations("inquiries");
  const inquiries = await prisma.inquiry.findMany({
    where: { businessId: id, ...(showAll ? {} : { status: { in: [...OPEN_INQUIRY_STATUSES] } }) },
    orderBy: { lastMessageAt: "desc" },
    include: { wedding: { select: { partner1: true, partner2: true } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-soft">{t("vendorLead")}</p>
        <div className="flex rounded-lg border border-line-strong p-0.5 text-sm">
          {(["open", "all"] as const).map((k) => (
            <Link
              key={k}
              href={k === "all" ? `/vendor/${id}/inquiries?show=all` : `/vendor/${id}/inquiries`}
              aria-current={(k === "all") === showAll ? "page" : undefined}
              className={cn("rounded-md px-3 py-1.5", (k === "all") === showAll ? "bg-ink text-white" : "text-ink-soft hover:text-ink")}
            >
              {t(`filter.${k}`)}
            </Link>
          ))}
        </div>
      </div>
      {inquiries.length === 0 ? (
        <Card className="p-10 text-center text-ink-soft">{showAll ? t("vendorEmptyAll") : t("vendorEmpty")}</Card>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
          {inquiries.map((i) => {
            const unread = isUnread(i, "vendor");
            return (
              <li key={i.id}>
                <Link href={`/vendor/${id}/inquiries/${i.id}`} className="flex items-start gap-4 px-5 py-4 hover:bg-linen/60">
                  <span aria-hidden className={cn("mt-2 size-2 shrink-0 rounded-full", unread ? "bg-vranec" : "bg-transparent")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className={unread ? "font-semibold" : "font-medium"}>{coupleNames(i.wedding)}</span>
                      <InquiryStatusBadge status={i.status} side="vendor" />
                      {unread && <span className="sr-only">{t("unread")}</span>}
                    </div>
                    {i.messages[0] && <p className="mt-1 truncate text-sm text-ink-soft">{i.messages[0].text}</p>}
                  </div>
                  <div className="shrink-0 text-right text-xs text-stone tabular-nums">
                    <p className="text-sm text-ink">
                      {i.date ? formatDate(i.date) : t("details.noDate")}
                      {i.guestCount ? ` · ${t("guestsShort", { count: i.guestCount })}` : ""}
                    </p>
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
