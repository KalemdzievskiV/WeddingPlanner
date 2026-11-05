import { prisma } from "@svadba/db";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("common"))("admin") };
}

export default async function AdminOverviewPage() {
  const t = await getTranslations("admin.overview");
  const [pending, live, users, couples, vendors, admins, cities, features] = await Promise.all([
    prisma.business.count({ where: { status: "PENDING" } }),
    prisma.business.count({ where: { status: "APPROVED" } }),
    prisma.user.count(),
    prisma.user.count({ where: { roles: { has: "COUPLE" } } }),
    prisma.user.count({ where: { roles: { has: "VENDOR" } } }),
    prisma.user.count({ where: { roles: { has: "ADMIN" } } }),
    prisma.city.count({ where: { active: true } }),
    prisma.venueFeature.count({ where: { active: true } }),
  ]);
  const stats = [
    { label: t("pending"), value: pending },
    { label: t("live"), value: live },
    { label: t("users"), value: users },
    { label: t("couples"), value: couples },
    { label: t("vendors"), value: vendors },
    { label: t("admins"), value: admins },
    { label: t("cities"), value: cities },
    { label: t("features"), value: features },
  ];

  return (
    <>
      <PageHeader title={t("title")} />
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <dt className="text-sm text-stone">{s.label}</dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{s.value}</dd>
          </Card>
        ))}
      </dl>
    </>
  );
}
