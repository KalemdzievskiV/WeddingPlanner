import { prisma } from "@svadba/db";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { ReferenceEditor } from "@/components/admin/reference-editor";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("admin.genres"))("title") };
}

export default async function GenresPage() {
  const t = await getTranslations("admin.genres");
  const rows = await prisma.musicGenre.findMany({ orderBy: [{ sortOrder: "asc" }, { nameMk: "asc" }] });
  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")} />
      <ReferenceEditor rows={rows} addLabel={t("add")} config={{ kind: "genre", hasSlug: true, hasRegion: false, canDelete: true }} />
    </>
  );
}
