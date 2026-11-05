import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { WeddingForm } from "@/components/plan/wedding-form";
import { Card } from "@/components/ui/card";
import { Stitch } from "@/components/ui/stitch";
import { redirect } from "@/i18n/navigation";
import { cityOptions } from "@/lib/cities";
import { localeFrom } from "@/lib/locale";
import { requireUser } from "@/lib/session";
import { getWeddingAccess } from "@/lib/wedding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("plan.setup"))("title") };
}

export default async function NewWeddingPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  await requireUser(locale);
  if (await getWeddingAccess()) redirect({ href: "/plan", locale });
  const t = await getTranslations("plan.setup");
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-4xl">{t("title")}</h1>
      <Stitch className="mt-5 w-28" />
      <p className="mt-5 text-ink-soft">{t("lead")}</p>
      <Card className="mt-8 p-6 sm:p-8">
        <WeddingForm mode="create" cities={await cityOptions(locale)} />
      </Card>
    </div>
  );
}
