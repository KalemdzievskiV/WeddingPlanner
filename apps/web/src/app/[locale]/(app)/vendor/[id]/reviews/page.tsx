import { prisma } from "@svadba/db";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Stars } from "@/components/public/stars";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ReviewReply } from "@/components/vendor/review-reply";
import { getBusinessAccess } from "@/lib/business";
import { formatDate } from "@/lib/format";
import { coupleNames } from "@/lib/plan-helpers";

export default async function VendorReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getBusinessAccess(id);
  if (!access) notFound();
  const { business } = access;
  const t = await getTranslations("reviews");
  const reviews = await prisma.review.findMany({
    where: { businessId: id },
    orderBy: { createdAt: "desc" },
    include: { wedding: { select: { partner1: true, partner2: true, date: true } } },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        {business.ratingCount > 0 && business.ratingAvg != null ? (
          <p className="flex items-center gap-2">
            <Stars value={business.ratingAvg} label={t("average", { rating: business.ratingAvg.toFixed(1) })} />
            <span className="text-xl font-semibold tabular-nums">{business.ratingAvg.toFixed(1)}</span>
            <span className="text-sm text-stone tabular-nums">{t("count", { count: business.ratingCount })}</span>
          </p>
        ) : null}
        <p className="text-sm text-ink-soft">{t("vendor.lead")}</p>
      </div>
      {reviews.length === 0 ? (
        <Card className="p-10 text-center text-ink-soft">{t("vendor.empty")}</Card>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars value={r.rating} label={t("rated", { rating: r.rating })} />
                  <span className="font-medium">{coupleNames(r.wedding)}</span>
                  {r.wedding.date && <span className="text-sm text-stone tabular-nums">{t("weddingOn", { date: formatDate(r.wedding.date) })}</span>}
                  {r.status === "HIDDEN" && <Badge>{t("hiddenByAdmin")}</Badge>}
                </div>
                <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-soft">{r.text}</p>
                {r.vendorReply && (
                  <div className="mt-3 border-l-2 border-vranec/40 pl-4">
                    <p className="text-sm font-medium">{t("replyFrom", { business: business.name })}</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{r.vendorReply}</p>
                  </div>
                )}
                <ReviewReply reviewId={r.id} reply={r.vendorReply} reported={!!r.reportedAt} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
