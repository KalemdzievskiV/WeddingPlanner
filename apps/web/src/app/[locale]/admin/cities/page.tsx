import type { Metadata } from "next";
import { prisma } from "@svadba/db";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { ReferenceEditor } from "@/components/admin/reference-editor";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("admin.cities"))("title") };
}

export default async function CitiesPage() {
  const t = await getTranslations("admin.cities");
  const rows = await prisma.city.findMany({ orderBy: [{ sortOrder: "asc" }, { nameMk: "asc" }] });
  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />
      <ReferenceEditor
        rows={rows}
        addLabel={t("add")}
        config={{ kind: "city", hasSlug: true, hasRegion: true, canDelete: true }}
      />
    </>
  );
}
