import { prisma } from "@svadba/db";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { ReviewModeration } from "@/components/admin/review-moderation";
import { Stars } from "@/components/public/stars";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { coupleNames } from "@/lib/plan-helpers";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("admin.reviews"))("title") };
}

/** Review moderation (decision 81): reported first, then the newest. */
export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const t = await getTranslations("admin.reviews");
  const tr = await getTranslations("reviews");
  const reportedOnly = (await searchParams).show !== "all";
  const reviews = await prisma.review.findMany({
    where: reportedOnly ? { reportedAt: { not: null } } : {},
    orderBy: [{ reportedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 100,
    include: { business: { select: { name: true, slug: true } }, wedding: { select: { partner1: true, partner2: true } } },
  });

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="mb-5 inline-flex rounded-lg border border-line-strong p-0.5 text-sm">
        {(["reported", "all"] as const).map((k) => (
          <Link
            key={k}
            href={k === "all" ? "/admin/reviews?show=all" : "/admin/reviews"}
            aria-current={(k === "reported") === reportedOnly ? "page" : undefined}
            className={cn("rounded-md px-3 py-1.5", (k === "reported") === reportedOnly ? "bg-ink text-white" : "text-ink-soft hover:text-ink")}
          >
            {t(`filter.${k}`)}
          </Link>
        ))}
      </div>
      {reviews.length === 0 ? (
        <Card className="p-10 text-center text-ink-soft">{reportedOnly ? t("emptyReported") : t("empty")}</Card>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars value={r.rating} label={tr("rated", { rating: r.rating })} />
                  <Link href={`/v/${r.business.slug}#reviews`} className="font-medium hover:text-vranec">
                    {r.business.name}
                  </Link>
                  <span className="text-sm text-stone">
                    {coupleNames(r.wedding)} · <span className="tabular-nums">{formatDate(r.createdAt)}</span>
                  </span>
                  {r.status === "HIDDEN" && <Badge>{t("hidden")}</Badge>}
                  {r.reportedAt && <Badge tone="warning">{t("reported")}</Badge>}
                </div>
                <p className="mt-2 whitespace-pre-line text-ink-soft">{r.text}</p>
                {r.reportReason && r.reportedAt && (
                  <p className="mt-3 rounded-lg bg-amber-soft px-3 py-2 text-sm text-amber">
                    {t("reason")}: {r.reportReason}
                  </p>
                )}
                <div className="mt-4">
                  <ReviewModeration id={r.id} status={r.status} reported={!!r.reportedAt} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
