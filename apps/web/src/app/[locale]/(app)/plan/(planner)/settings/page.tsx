import { prisma } from "@svadba/db";
import { INVITE_LINK_DAYS } from "@svadba/shared";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { EventsEditor } from "@/components/plan/events-editor";
import { InviteCreator, SmallAction } from "@/components/plan/people-manager";
import { WeddingForm } from "@/components/plan/wedding-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cityOptions } from "@/lib/cities";
import { env } from "@/lib/env";
import { dateInputValue, formatDate } from "@/lib/format";
import { localeFrom } from "@/lib/locale";
import { eventName } from "@/lib/plan-helpers";
import { canEdit, canManage, requireWedding } from "@/lib/wedding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("plan.settings"))("title") };
}

export default async function PlanSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  const { wedding, role, user } = await requireWedding(locale);
  const t = await getTranslations("plan.settings");
  const tr = await getTranslations("plan.roles");
  const te = await getTranslations("plan.events");
  const manage = canManage(role);
  const [events, members, invites] = await Promise.all([
    prisma.weddingEvent.findMany({ where: { weddingId: wedding.id }, orderBy: { sortOrder: "asc" } }),
    prisma.weddingMember.findMany({ where: { weddingId: wedding.id }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    manage ? prisma.weddingInvite.findMany({ where: { weddingId: wedding.id, expiresAt: { gt: new Date() } } }) : [],
  ]);

  return (
    <div className="space-y-6">
      {manage && (
        <Section title={t("wedding")}>
          <WeddingForm
            mode="edit"
            cities={await cityOptions(locale)}
            values={{
              partner1: wedding.partner1,
              partner2: wedding.partner2,
              date: dateInputValue(wedding.date),
              cityId: wedding.cityId ?? "",
              estimatedGuests: wedding.estimatedGuests?.toString() ?? "",
              budgetTotal: wedding.budgetTotal?.toString() ?? "",
              currency: wedding.currency,
            }}
          />
        </Section>
      )}

      <Section title={t("events")} lead={t("eventsLead")}>
        <EventsEditor
          editable={canEdit(role)}
          events={events.map((e) => ({
            id: e.id,
            type: e.type,
            name: e.name,
            displayName: eventName(e, te),
            date: dateInputValue(e.date),
            dateLabel: formatDate(e.date),
            time: e.time,
            place: e.place,
            lat: e.lat,
            lng: e.lng,
            hasSeating: e.hasSeating,
          }))}
        />
      </Section>

      <Section title={t("people")} lead={t("peopleLead")}>
        <ul className="divide-y divide-line border-y border-line">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {m.user.name} {m.userId === user.id && <span className="font-normal text-stone">({t("you")})</span>}
                </p>
                <p className="text-sm text-stone">{m.user.email}</p>
              </div>
              <Badge tone={m.role === "OWNER" ? "accent" : "neutral"}>{tr(m.role)}</Badge>
              {manage && m.role !== "OWNER" && m.userId !== user.id && (
                <SmallAction kind="removeMember" id={m.id} label={t("remove")} confirmText={t("confirmRemove", { name: m.user.name })} />
              )}
            </li>
          ))}
        </ul>
        {manage && (
          <div className="space-y-4 pt-2">
            <h3 className="font-medium">{t("invite")}</h3>
            <p className="text-sm text-stone">{t("inviteLead", { days: INVITE_LINK_DAYS })}</p>
            <InviteCreator baseUrl={`${env.appUrl}/${locale}/plan/join`} />
            {invites.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium">{t("activeInvites")}</h4>
                <ul className="divide-y divide-line border-y border-line text-sm">
                  {invites.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-stone">
                        {tr(i.role)} · {t("expires", { date: formatDate(i.expiresAt) })}
                      </span>
                      <SmallAction kind="revoke" id={i.id} label={t("revoke")} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {role !== "OWNER" && (
          <div className="pt-2">
            <SmallAction kind="leave" label={t("leave")} confirmText={t("confirmLeave")} />
          </div>
        )}
      </Section>

      {role === "OWNER" && (
        <section className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-danger/20 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-medium">{t("dangerTitle")}</h2>
            <p className="mt-1 text-sm text-stone">{t("dangerText")}</p>
          </div>
          <SmallAction kind="deleteWedding" label={t("delete")} confirmText={t("confirmDelete")} />
        </section>
      )}
    </div>
  );
}

function Section({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <Card className="space-y-4 p-6 sm:p-7">
      <div>
        <h2 className="font-display text-xl">{title}</h2>
        {lead && <p className="mt-1 text-sm text-stone">{lead}</p>}
      </div>
      {children}
    </Card>
  );
}
