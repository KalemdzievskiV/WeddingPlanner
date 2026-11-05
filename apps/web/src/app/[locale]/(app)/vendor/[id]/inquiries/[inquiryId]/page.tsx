import { prisma } from "@svadba/db";
import { OPEN_INQUIRY_STATUSES } from "@svadba/shared";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { InquiryStatusBadge } from "@/components/inquiry/status-badge";
import { InquiryThread } from "@/components/inquiry/thread";
import { MessageComposer, VendorTools } from "@/components/inquiry/thread-actions";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getBusinessAccess } from "@/lib/business";
import { formatDate } from "@/lib/format";
import { MarkSeen } from "@/components/inquiry/mark-seen";
import { isUnread, loadInquiry } from "@/lib/inquiry-view";
import { localeFrom } from "@/lib/locale";
import { coupleNames, eventName } from "@/lib/plan-helpers";

export default async function VendorInquiryPage({ params }: { params: Promise<{ locale: string; id: string; inquiryId: string }> }) {
  const locale = await localeFrom(params);
  const { id, inquiryId } = await params;
  const access = await getBusinessAccess(id);
  if (!access) notFound();
  const data = await loadInquiry({ id: inquiryId, businessId: id });
  if (!data) notFound();
  const { inquiry, items } = data;
  const t = await getTranslations("inquiries");
  const te = await getTranslations("plan.events");
  const isOpen = (OPEN_INQUIRY_STATUSES as readonly string[]).includes(inquiry.status);

  // What the vendor's own calendar says about the requested day.
  const marked = inquiry.date
    ? await prisma.availabilityDay.findMany({ where: { businessId: id, date: inquiry.date }, include: { hall: true } })
    : [];
  const bookedHalls = marked.filter((d) => d.status === "BOOKED");


  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/vendor/${id}/inquiries`} className="inline-flex items-center gap-1.5 text-sm text-stone hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" /> {t("allInquiries")}
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-3xl">{coupleNames(inquiry.wedding)}</h2>
        <InquiryStatusBadge status={inquiry.status} side="vendor" />
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

      {isOpen && bookedHalls.length > 0 && (
        <Alert tone="error" className="mt-6">
          {t("vendor.alreadyBooked", { halls: bookedHalls.map((d) => d.hall?.name ?? inquiry.business.name).join(", ") })}
        </Alert>
      )}
      {inquiry.status === "BOOKED" && <Alert tone="success" className="mt-6">{t("bookedVendor")}</Alert>}
      {inquiry.status === "CANCELLED" && <Alert className="mt-6">{t("cancelledVendor")}</Alert>}

      <MarkSeen inquiryId={inquiry.id} side="vendor" unread={isUnread(inquiry, "vendor")} />
      <div className="mt-8">
        <InquiryThread items={items} side="vendor" locale={locale} canRespond={false} guestCount={inquiry.guestCount} />
      </div>

      {isOpen && (
        <Card className="mt-8 p-5">
          <VendorTools
            inquiryId={inquiry.id}
            currency={inquiry.business.currency}
            halls={inquiry.business.halls.map((h) => ({ id: h.id, name: h.name }))}
            defaultDate={inquiry.date?.toISOString().slice(0, 10) ?? ""}
            defaultHallId={inquiry.hallId}
            defaultUnit={inquiry.business.category === "VENUE" ? "PER_PERSON" : "TOTAL"}
          />
        </Card>
      )}
      {inquiry.status !== "CANCELLED" && (
        <Card className="mt-4 p-5">
          <MessageComposer inquiryId={inquiry.id} side="vendor" />
        </Card>
      )}
    </div>
  );
}
