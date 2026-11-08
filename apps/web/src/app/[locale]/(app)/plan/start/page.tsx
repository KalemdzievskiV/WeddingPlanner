import { prisma } from "@svadba/db";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlanStart } from "@/components/plan/plan-start";
import { Stitch } from "@/components/ui/stitch";
import { redirect } from "@/i18n/navigation";
import { localeFrom } from "@/lib/locale";
import { beyondCouple, canEdit, requireWedding } from "@/lib/wedding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("plan.start"))("title"), robots: { index: false } };
}

/** First step of a new plan (decision 100). Once the plan has guests besides the couple it goes straight to the Guests page. */
export default async function PlanStartPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  const { wedding, role } = await requireWedding(locale);
  if (!canEdit(role) || (await prisma.guest.count({ where: { weddingId: wedding.id, ...beyondCouple } }))) {
    redirect({ href: "/plan/guests", locale });
  }
  const couple = await prisma.guest.findMany({ where: { weddingId: wedding.id, role: { in: ["BRIDE", "GROOM"] } } });
  const nameOf = (r: "BRIDE" | "GROOM", fallback: string) => couple.find((g) => g.role === r)?.name ?? fallback;
  const t = await getTranslations("plan.start");
  return (
    <div className="mx-auto max-w-4xl">
      <div className="text-center">
        <h1 className="font-display text-4xl">{t("title")}</h1>
        <Stitch className="mx-auto mt-5 w-28" />
        <p className="mx-auto mt-5 max-w-2xl text-ink-soft">{t("lead")}</p>
      </div>
      <PlanStart locale={locale} bride={nameOf("BRIDE", wedding.partner1)} groom={nameOf("GROOM", wedding.partner2)} />
    </div>
  );
}
