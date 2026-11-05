import type { Metadata } from "next";
import { prisma } from "@svadba/db";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { ReferenceEditor } from "@/components/admin/reference-editor";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("admin.features"))("title") };
}

export default async function FeaturesPage() {
  const t = await getTranslations("admin.features");
  const rows = await prisma.venueFeature.findMany({ orderBy: [{ sortOrder: "asc" }, { nameMk: "asc" }] });
  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />
      <ReferenceEditor
        rows={rows}
        addLabel={t("add")}
        config={{ kind: "feature", hasSlug: true, hasRegion: false, canDelete: true }}
      />
    </>
  );
}
