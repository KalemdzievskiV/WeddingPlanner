import type { Metadata } from "next";
import { prisma } from "@svadba/db";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { ReferenceEditor } from "@/components/admin/reference-editor";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("admin.categories"))("title") };
}

export default async function CategoriesPage() {
  const t = await getTranslations("admin.categories");
  const rows = await prisma.vendorCategory.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />
      <ReferenceEditor
        rows={rows.map((r) => ({ ...r, slug: undefined }))}
        config={{ kind: "category", hasSlug: false, hasRegion: false, canDelete: false }}
      />
    </>
  );
}
