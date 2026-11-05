import { prisma } from "@svadba/db";
import { INVITE_LINK_DAYS } from "@svadba/shared";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CreateInviteButton, RemoveMemberButton, RevokeInviteButton } from "@/components/vendor/team-manager";
import { canManageTeam, getBusinessAccess } from "@/lib/business";
import { env } from "@/lib/env";
import { localeFrom } from "@/lib/locale";

export default async function BusinessTeamPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const locale = await localeFrom(params);
  const { id } = await params;
  const access = await getBusinessAccess(id);
  if (!access) notFound();
  const t = await getTranslations("vendor.team");
  const tl = await getTranslations("vendor.list.role");
  const format = await getFormatter();
  const manage = canManageTeam(access.role);
  const [members, invites] = await Promise.all([
    prisma.businessMember.findMany({ where: { businessId: id }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    manage ? prisma.businessInvite.findMany({ where: { businessId: id, expiresAt: { gt: new Date() } } }) : [],
  ]);

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-7">
        <h2 className="font-display text-xl">{t("title")}</h2>
        <p className="mt-1 text-sm text-stone">{t("lead")}</p>
        <ul className="mt-5 divide-y divide-line border-y border-line">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{m.user.name}</p>
                <p className="text-sm text-stone">{m.user.email}</p>
              </div>
              <Badge tone={m.role === "OWNER" ? "accent" : "neutral"}>{tl(m.role)}</Badge>
              {manage && m.role === "STAFF" && <RemoveMemberButton businessId={id} memberId={m.id} name={m.user.name} />}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-4 p-6 sm:p-7">
        {manage ? (
          <>
            <p className="text-sm text-ink-soft">{t("inviteLead", { days: INVITE_LINK_DAYS })}</p>
            <CreateInviteButton businessId={id} baseUrl={`${env.appUrl}/${locale}/vendor/join`} />
            {invites.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium">{t("activeInvites")}</h3>
                <ul className="divide-y divide-line border-y border-line">
                  {invites.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="text-stone">{t("expires", { date: format.dateTime(i.expiresAt, { dateStyle: "medium" }) })}</span>
                      <RevokeInviteButton businessId={id} inviteId={i.id} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-stone">{t("onlyOwner")}</p>
        )}
      </Card>
    </div>
  );
}
