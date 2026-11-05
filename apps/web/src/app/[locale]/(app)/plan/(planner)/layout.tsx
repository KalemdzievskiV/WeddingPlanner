import { prisma } from "@svadba/db";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { PlanTabs } from "@/components/plan/plan-tabs";
import { Alert } from "@/components/ui/alert";
import { todayIso } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { isUnread } from "@/lib/inquiry-view";
import { localeFrom } from "@/lib/locale";
import { coupleNames, daysUntil } from "@/lib/plan-helpers";
import { canEdit, getWeddingAccess, requireWedding } from "@/lib/wedding";

export async function generateMetadata(): Promise<Metadata> {
  const access = await getWeddingAccess();
  const couple = access ? coupleNames(access.wedding) : "";
  return { title: { default: couple, template: `%s · ${couple}` }, robots: { index: false } };
}

export default async function PlannerLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await localeFrom(params);
  const { wedding, role } = await requireWedding(locale);
  const t = await getTranslations("plan.header");
  const days = wedding.date ? daysUntil(wedding.date, todayIso()) : null;
  const inquiries = await prisma.inquiry.findMany({
    where: { weddingId: wedding.id },
    select: { lastMessageAt: true, coupleSeenAt: true, vendorSeenAt: true },
  });
  const unread = inquiries.filter((i) => isUnread(i, "couple")).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <h1 className="font-display text-3xl sm:text-4xl">{coupleNames(wedding)}</h1>
        <p className="text-sm text-ink-soft">
          {wedding.date ? (
            <>
              <span className="font-medium tabular-nums">{formatDate(wedding.date)}</span>
              {" · "}
              {days! > 0 ? t("daysLeft", { count: days! }) : days === 0 ? t("today") : t("past", { date: formatDate(wedding.date) })}
            </>
          ) : (
            t("noDate")
          )}
        </p>
      </div>
      <div className="mt-5">
        <PlanTabs unread={unread} />
      </div>
      {!canEdit(role) && (
        <Alert className="mt-5 print:hidden">{t("viewOnly")}</Alert>
      )}
      <div className="pt-8 print:pt-0">{children}</div>
    </div>
  );
}
