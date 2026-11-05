import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { createBusinessAction } from "@/actions/vendor";
import { Card } from "@/components/ui/card";
import { NewBusinessForm } from "@/components/vendor/new-business-form";
import { cityOptions } from "@/lib/cities";
import { localeFrom } from "@/lib/locale";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("vendor.new"))("title") };
}

export default async function NewBusinessPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  await requireUser(locale);
  const t = await getTranslations("vendor.new");
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-4xl">{t("title")}</h1>
      <p className="mt-3 text-ink-soft">{t("lead")}</p>
      <Card className="mt-8 p-6 sm:p-8">
        <NewBusinessForm action={createBusinessAction} cities={await cityOptions(locale)} submitLabel={t("submit")} />
      </Card>
    </div>
  );
}
