import { MIN_PHOTOS_FOR_APPROVAL } from "@svadba/shared";
import { CheckCircle2, Circle } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CopyButton } from "@/components/copy-button";
import { Card } from "@/components/ui/card";
import { DeleteBusinessButton, SubmitForReviewButton } from "@/components/vendor/overview-actions";
import { StatsPanel } from "@/components/vendor/stats-panel";
import { Link } from "@/i18n/navigation";
import { canManageTeam, getBusinessAccess, getChecklist } from "@/lib/business";
import { env } from "@/lib/env";
import { localeFrom } from "@/lib/locale";
import { cn } from "@/lib/utils";

export default async function BusinessOverviewPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const locale = await localeFrom(params);
  const { id } = await params;
  const access = await getBusinessAccess(id);
  if (!access) notFound();
  const { business, role } = access;
  const t = await getTranslations("vendor.overview");
  const checklist = await getChecklist(business);
  const ready = checklist.every((i) => i.done);
  const publicUrl = `${env.appUrl}/${locale}/v/${business.slug}`;

  return (
    <div className="space-y-6">
      {business.status === "APPROVED" && (
        <Card className="border-olive/30 p-6">
          <h2 className="font-display text-2xl">{t("approvedTitle")}</h2>
          <p className="mt-2 text-ink-soft">{t("approvedText")}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="min-w-0 truncate rounded-lg bg-linen px-3 py-2 text-sm">{publicUrl}</code>
            <CopyButton text={publicUrl} />
          </div>
        </Card>
      )}
      {business.status === "APPROVED" && <StatsPanel businessId={business.id} />}
      {business.status === "PENDING" && (
        <Card className="border-amber/30 p-6">
          <h2 className="font-display text-2xl">{t("pendingTitle")}</h2>
          <p className="mt-2 text-ink-soft">{t("pendingText")}</p>
        </Card>
      )}
      {business.status === "HIDDEN" && (
        <Card className="p-6">
          <h2 className="font-display text-2xl">{t("hiddenTitle")}</h2>
          <p className="mt-2 text-ink-soft">{t("hiddenText")}</p>
        </Card>
      )}
      {business.status === "REJECTED" && (
        <Card className="border-vranec/30 p-6">
          <h2 className="font-display text-2xl">{t("rejectedTitle")}</h2>
          <p className="mt-2 text-ink-soft">{t("rejectedText")}</p>
          <blockquote className="mt-3 border-l-2 border-vranec pl-4 text-ink">{business.rejectionReason}</blockquote>
        </Card>
      )}

      {(business.status === "DRAFT" || business.status === "REJECTED") && (
        <Card className="p-6">
          {business.status === "DRAFT" && (
            <>
              <h2 className="font-display text-2xl">{t("draftTitle")}</h2>
              <p className="mt-2 text-ink-soft">{t("draftText")}</p>
            </>
          )}
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {checklist.map((item) => (
              <li key={item.key} className="flex items-center gap-3 py-3">
                {item.done ? (
                  <CheckCircle2 aria-hidden className="size-5 shrink-0 text-olive" />
                ) : (
                  <Circle aria-hidden className="size-5 shrink-0 text-line-strong" />
                )}
                <span className={cn("flex-1 text-sm", item.done ? "text-stone" : "text-ink")}>
                  {t(`checklist.${item.key}`, { count: MIN_PHOTOS_FOR_APPROVAL })}
                </span>
                {!item.done && (
                  <Link
                    href={`/vendor/${business.id}/${item.tab}`}
                    className="text-sm font-medium text-vranec underline-offset-4 hover:underline"
                  >
                    {t("fix")}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <SubmitForReviewButton
              businessId={business.id}
              ready={ready}
              label={business.status === "REJECTED" ? t("resubmit") : t("submit")}
            />
          </div>
        </Card>
      )}

      {canManageTeam(role) && (
        <section className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-danger/20 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-medium">{t("deleteTitle")}</h2>
            <p className="mt-1 text-sm text-stone">{t("deleteText")}</p>
          </div>
          <DeleteBusinessButton businessId={business.id} name={business.name} />
        </section>
      )}
    </div>
  );
}
