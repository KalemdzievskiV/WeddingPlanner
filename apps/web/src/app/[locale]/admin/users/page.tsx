import type { Metadata } from "next";
import { localeFrom } from "@/lib/locale";
import { prisma } from "@svadba/db";
import { Search } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { AdminRoleButton } from "@/components/admin/admin-role-button";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { inputClass } from "@/components/ui/field";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("admin.users"))("title") };
}

export default async function UsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const locale = await localeFrom(params);
  const me = await requireAdmin(locale);
  const q = (await searchParams).q?.trim() ?? "";
  const t = await getTranslations("admin.users");
  const tc = await getTranslations("common");
  const format = await getFormatter();

  const where = q
    ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] }
    : {};
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.user.count({ where }),
  ]);

  return (
    <>
      <PageHeader title={t("title")} lead={t("count", { count: total })}>
        <form role="search" className="relative w-full sm:w-72">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone" />
          <input name="q" defaultValue={q} placeholder={t("search")} aria-label={t("search")} className={cn(inputClass, "pl-9")} />
        </form>
      </PageHeader>

      {users.length === 0 ? (
        <Card className="p-10 text-center text-stone">{t("empty", { query: q })}</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-stone">
                <th className="px-5 py-3 font-medium">{t("name")}</th>
                <th className="px-5 py-3 font-medium">{t("roles")}</th>
                <th className="px-5 py-3 font-medium">{t("verified")}</th>
                <th className="px-5 py-3 font-medium">{t("joined")}</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3.5">
                    <p className="font-medium">
                      {u.name} {u.id === me.id && <span className="font-normal text-stone">({t("you")})</span>}
                    </p>
                    <p className="text-stone">{u.email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {u.roles.length === 0 && <span className="text-stone">{t("noRoles")}</span>}
                      {u.roles.map((r) => (
                        <Badge key={r} tone={r === "ADMIN" ? "accent" : "neutral"}>
                          {tc(`roles.${r}`)}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone={u.emailVerified ? "success" : "warning"}>{u.emailVerified ? tc("yes") : tc("no")}</Badge>
                  </td>
                  <td className="px-5 py-3.5 tabular-nums text-ink-soft">{format.dateTime(u.createdAt, { dateStyle: "medium" })}</td>
                  <td className="px-5 py-3.5 text-right">
                    {u.id !== me.id && <AdminRoleButton userId={u.id} isAdmin={u.roles.includes("ADMIN")} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
