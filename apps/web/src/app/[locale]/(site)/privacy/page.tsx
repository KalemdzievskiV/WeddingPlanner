import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { privacy } from "@/content/legal/privacy";
import { LegalPage } from "@/components/legal/legal-page";
import { localeFrom } from "@/lib/locale";
import { alternatesFor } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFrom(params);
  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("privacy"), alternates: alternatesFor("/privacy", locale) };
}

export default async function Page({ params }: Props) {
  const locale = await localeFrom(params);
  const t = await getTranslations("legal");
  return <LegalPage doc={privacy} title={t("privacy")} locale={locale} />;
}
