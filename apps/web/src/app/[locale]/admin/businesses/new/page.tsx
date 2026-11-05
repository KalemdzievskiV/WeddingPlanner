import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { adminCreateBusinessAction } from "@/actions/admin-business";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { NewBusinessForm } from "@/components/vendor/new-business-form";
import { cityOptions } from "@/lib/cities";
import { localeFrom } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("admin.businesses"))("newTitle") };
}

export default async function AdminNewBusinessPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  const t = await getTranslations("admin.businesses");
  return (
    <div className="max-w-2xl">
      <PageHeader title={t("newTitle")} lead={t("newLead")} />
      <Card className="p-6 sm:p-8">
        <NewBusinessForm action={adminCreateBusinessAction} cities={await cityOptions(locale)} submitLabel={t("add")} />
      </Card>
    </div>
  );
}
