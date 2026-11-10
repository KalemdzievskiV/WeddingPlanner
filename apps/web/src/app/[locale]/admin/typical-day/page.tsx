import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { TypicalDayEditor } from "@/components/admin/typical-day-editor";
import { getTypicalDay } from "@/lib/typical-day";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("admin.typicalDay"))("title") };
}

/** Admin-edited "fill typical day" template (decision 111). The admin layout checks the role. */
export default async function TypicalDayPage() {
  const t = await getTranslations("admin.typicalDay");
  const day = await getTypicalDay();
  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />
      <TypicalDayEditor startTime={day.startTime} steps={day.steps} custom={day.custom} version={day.version} />
    </>
  );
}
