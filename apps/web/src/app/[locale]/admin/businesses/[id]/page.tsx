import { prisma } from "@svadba/db";
import { CLAIM_LINK_DAYS, MIN_PHOTOS_FOR_APPROVAL, pickLocalized } from "@svadba/shared";
import { CheckCircle2, Circle, ExternalLink, Pencil } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { CreateClaimLinkButton, ReviewActions } from "@/components/admin/business-review";
import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { buttonClass, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/vendor/status-badge";
import { Link } from "@/i18n/navigation";
import { getChecklist } from "@/lib/business";
import { env } from "@/lib/env";
import { localeFrom } from "@/lib/locale";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const b = await prisma.business.findUnique({ where: { id }, select: { name: true } });
  return { title: b?.name };
}

export default async function AdminBusinessPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const locale = await localeFrom(params);
  const { id } = await params;
  const business = await prisma.business.findUnique({
    where: { id },
    include: { city: true, members: { include: { user: true } } },
  });
  if (!business) notFound();
  const t = await getTranslations("admin.businesses");
  const tv = await getTranslations("vendor");
  const format = await getFormatter();
  const checklist = await getChecklist(business);
  const claimUrl = business.claimToken ? `${env.appUrl}/${locale}/vendor/claim/${business.claimToken}` : null;
  const claimValid = business.claimExpiresAt && business.claimExpiresAt > new Date();
  const owner = business.members.find((m) => m.role === "OWNER");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/businesses" className="text-sm text-stone hover:text-ink">
          ← {t("title")}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl">{business.name}</h1>
          <StatusBadge status={business.status} />
        </div>
        <p className="mt-1 text-stone">
          {tv(`categories.${business.category}`)}
          {business.city && ` · ${pickLocalized(business.city, "name", locale)}`}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/v/${business.slug}`} target="_blank" className={buttonClass("secondary", "sm")}>
            {t("openPage")} <ExternalLink aria-hidden className="size-3.5" />
          </Link>
          <ButtonLink href={`/vendor/${business.id}/profile`} variant="secondary" size="sm">
            <Pencil aria-hidden className="size-3.5" /> {t("editListing")}
          </ButtonLink>
        </div>
      </div>

      <Card className="p-6">
        <ReviewActions id={business.id} status={business.status} />
        {business.rejectionReason && (
          <blockquote className="mt-4 border-l-2 border-vranec pl-4 text-sm text-ink-soft">{business.rejectionReason}</blockquote>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-xl">{t("checklist")}</h2>
        <ul className="mt-4 space-y-2">
          {checklist.map((i) => (
            <li key={i.key} className="flex items-center gap-2.5 text-sm">
              {i.done ? <CheckCircle2 aria-hidden className="size-4 text-olive" /> : <Circle aria-hidden className="size-4 text-line-strong" />}
              {tv(`overview.checklist.${i.key}`, { count: MIN_PHOTOS_FOR_APPROVAL })}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-xl">{t("team")}</h2>
        {business.members.length === 0 ? (
          <p className="mt-2 text-sm text-stone">{t("noOwner")}</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {business.members.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <span className="font-medium">{m.user.name}</span>
                <span className="text-stone">{m.user.email}</span>
                <Badge tone={m.role === "OWNER" ? "accent" : "neutral"}>{tv(`list.role.${m.role}`)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {!owner && (
        <Card className="space-y-4 p-6">
          <div>
            <h2 className="font-display text-xl">{t("claimTitle")}</h2>
            <p className="mt-1 text-sm text-stone">{t("claimLead", { days: CLAIM_LINK_DAYS })}</p>
          </div>
          {claimUrl && claimValid ? (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="min-w-0 truncate rounded-lg bg-linen px-3 py-2 text-sm">{claimUrl}</code>
                <CopyButton text={claimUrl} />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-stone">
                {t("claimExpires", { date: format.dateTime(business.claimExpiresAt!, { dateStyle: "medium" }) })}
                <CreateClaimLinkButton id={business.id} label={t("claimNew")} />
              </div>
            </>
          ) : (
            <CreateClaimLinkButton id={business.id} label={t("claimCreate")} />
          )}
        </Card>
      )}
    </div>
  );
}
