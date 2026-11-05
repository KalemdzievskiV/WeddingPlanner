import { OPEN_INQUIRY_STATUSES } from "@svadba/shared";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { InquiryStatusBadge } from "@/components/inquiry/status-badge";
import { InquiryThread } from "@/components/inquiry/thread";
import { CancelInquiry, MessageComposer } from "@/components/inquiry/thread-actions";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { MarkSeen } from "@/components/inquiry/mark-seen";
import { isUnread, loadInquiry } from "@/lib/inquiry-view";
import { localeFrom } from "@/lib/locale";
import { eventName } from "@/lib/plan-helpers";
import { canEdit, requireWedding } from "@/lib/wedding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("inquiries"))("title") };
}

export default async function PlanInquiryPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const locale = await localeFrom(params);
  const { id } = await params;
  const { wedding, role } = await requireWedding(locale);
  const data = await loadInquiry({ id, weddingId: wedding.id });
  if (!data) notFound();
  const { inquiry, items } = data;
  const t = await getTranslations("inquiries");
  const te = await getTranslations("plan.events");
  const editable = canEdit(role);
  const isOpen = (OPEN_INQUIRY_STATUSES as readonly string[]).includes(inquiry.status);
  const closed = inquiry.status === "CANCELLED" || inquiry.status === "DECLINED";


  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/plan/inquiries" className="inline-flex items-center gap-1.5 text-sm text-stone hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" /> {t("allInquiries")}
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-3xl">
            {inquiry.business.status === "APPROVED" ? (
              <Link href={`/v/${inquiry.business.slug}`} className="hover:text-vranec">
                {inquiry.business.name}
              </Link>
            ) : (
              inquiry.business.name
            )}
          </h2>
          <InquiryStatusBadge status={inquiry.status} side="couple" />
        </div>
        {editable && isOpen && <CancelInquiry inquiryId={inquiry.id} />}
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {inquiry.event && (
          <div className="flex gap-1.5">
            <dt className="text-stone">{t("details.event")}:</dt>
            <dd>{eventName(inquiry.event, te)}</dd>
          </div>
        )}
        <div className="flex gap-1.5">
          <dt className="text-stone">{t("details.date")}:</dt>
          <dd className="tabular-nums">{inquiry.date ? formatDate(inquiry.date) : t("details.noDate")}</dd>
        </div>
        {inquiry.guestCount && (
          <div className="flex gap-1.5">
            <dt className="text-stone">{t("details.guests")}:</dt>
            <dd className="tabular-nums">{inquiry.guestCount}</dd>
          </div>
        )}
        {inquiry.hall && (
          <div className="flex gap-1.5">
            <dt className="text-stone">{t("details.hall")}:</dt>
            <dd>{inquiry.hall.name}</dd>
          </div>
        )}
        {inquiry.packageName && (
          <div className="flex gap-1.5">
            <dt className="text-stone">{t("details.package")}:</dt>
            <dd>{inquiry.packageName}</dd>
          </div>
        )}
      </dl>

      {inquiry.status === "BOOKED" && (
        <Alert tone="success" className="mt-6 flex flex-wrap items-center gap-2">
          <CheckCircle2 aria-hidden className="size-4" />
          <span className="flex-1">{t("bookedCouple")}</span>
          <Link href="/plan/vendors" className="font-medium underline-offset-4 hover:underline">
            {t("openVendors")}
          </Link>
        </Alert>
      )}
      {inquiry.status === "DECLINED" && <Alert className="mt-6">{t("declinedCouple")}</Alert>}
      {inquiry.status === "CANCELLED" && <Alert className="mt-6">{t("cancelledCouple")}</Alert>}

      <MarkSeen inquiryId={inquiry.id} side="couple" unread={isUnread(inquiry, "couple")} />
      <div className="mt-8">
        <InquiryThread items={items} side="couple" locale={locale} canRespond={editable && isOpen} guestCount={inquiry.guestCount} />
      </div>

      {editable && !closed && (
        <Card className="mt-8 p-5">
          <MessageComposer inquiryId={inquiry.id} side="couple" />
        </Card>
      )}
    </div>
  );
}
