import { prisma, type BusinessStatus } from "@svadba/db";
import { pickLocalized } from "@svadba/shared";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/vendor/status-badge";
import { Link } from "@/i18n/navigation";
import { localeFrom } from "@/lib/locale";
import { cn } from "@/lib/utils";

const STATUSES: BusinessStatus[] = ["PENDING", "APPROVED", "DRAFT", "REJECTED", "HIDDEN"];

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("admin.businesses"))("title") };
}

export default async function AdminBusinessesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const locale = await localeFrom(params);
  const raw = (await searchParams).status;
  const status = STATUSES.includes(raw as BusinessStatus) ? (raw as BusinessStatus) : raw === "ALL" ? null : "PENDING";
  const t = await getTranslations("admin.businesses");
  const tv = await getTranslations("vendor");
  const format = await getFormatter();

  const [counts, businesses] = await Promise.all([
    prisma.business.groupBy({ by: ["status"], _count: true }),
    prisma.business.findMany({
      where: status ? { status } : {},
      orderBy: status === "PENDING" ? { submittedAt: "asc" } : { updatedAt: "desc" },
      include: { city: true, members: { where: { role: "OWNER" }, include: { user: true } } },
      take: 200,
    }),
  ]);
  const count = (s: BusinessStatus) => counts.find((c) => c.status === s)?._count ?? 0;
  const total = counts.reduce((n, c) => n + c._count, 0);

  return (
    <>
      <PageHeader title={t("title")} lead={t("lead")}>
        <ButtonLink href="/admin/businesses/new" size="sm">
          <Plus aria-hidden className="size-4" /> {t("add")}
        </ButtonLink>
      </PageHeader>

      <nav className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1.5">
          {[...STATUSES, "ALL" as const].map((s) => {
            const active = s === "ALL" ? status === null : status === s;
            return (
              <li key={s}>
                <Link
                  href={{ pathname: "/admin/businesses", query: { status: s } }}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm",
                    active ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink-soft hover:text-ink",
                  )}
                >
                  {s === "ALL" ? t("all") : tv(`status.${s}`)}
                  <span className="tabular-nums opacity-70">{s === "ALL" ? total : count(s)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {businesses.length === 0 ? (
        <Card className="p-10 text-center text-stone">{t("empty")}</Card>
      ) : (
        <Card className="divide-y divide-line">
          {businesses.map((b) => (
            <Link key={b.id} href={`/admin/businesses/${b.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-linen">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{b.name}</p>
                <p className="text-sm text-stone">
                  {tv(`categories.${b.category}`)}
                  {b.city && ` · ${pickLocalized(b.city, "name", locale)}`} ·{" "}
                  {b.members[0] ? b.members[0].user.email : t("noOwner")}
                </p>
              </div>
              <span className="text-sm text-stone tabular-nums">
                {b.status === "PENDING" && b.submittedAt
                  ? t("submitted", { date: format.dateTime(b.submittedAt, { dateStyle: "medium" }) })
                  : t("updated", { date: format.dateTime(b.updatedAt, { dateStyle: "medium" }) })}
              </span>
              <StatusBadge status={b.status} />
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
