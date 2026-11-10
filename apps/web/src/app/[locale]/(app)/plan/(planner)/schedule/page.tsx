import { prisma } from "@svadba/db";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PrintButton, ScheduleBoard } from "@/components/plan/schedule-manager";
import { dateInputValue, formatDate } from "@/lib/format";
import { localeFrom } from "@/lib/locale";
import { coupleNames, eventName } from "@/lib/plan-helpers";
import { canEdit, requireWedding } from "@/lib/wedding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("plan.schedule"))("title") };
}

export default async function SchedulePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  const { wedding, role } = await requireWedding(locale);
  const t = await getTranslations("plan.schedule");
  const te = await getTranslations("plan.events");
  const [days, events, guests] = await Promise.all([
    prisma.scheduleDay.findMany({
      where: { weddingId: wedding.id },
      orderBy: [{ date: { sort: "asc", nulls: "last" } }, { id: "asc" }],
      include: { items: { orderBy: { sortOrder: "asc" }, include: { guests: { select: { guestId: true } } } } },
    }),
    prisma.weddingEvent.findMany({ where: { weddingId: wedding.id }, orderBy: [{ date: "asc" }, { sortOrder: "asc" }] }),
    prisma.guest.findMany({
      where: { weddingId: wedding.id },
      orderBy: [{ household: { name: "asc" } }, { sortOrder: "asc" }],
      select: { id: true, name: true, household: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-ink-soft print:hidden">{t("lead")}</p>
        <PrintButton />
      </div>
      {/* Print header (the page header and tabs are hidden when printing) */}
      <h1 className="hidden font-display text-3xl print:block">
        {coupleNames(wedding)} · {t("title")}
      </h1>
      <ScheduleBoard
        editable={canEdit(role)}
        events={events.map((e) => ({ id: e.id, name: eventName(e, te), place: e.place, hasPin: e.lat != null }))}
        guests={guests.map((g) => ({ id: g.id, name: g.name, household: g.household.name }))}
        days={days.map((d) => ({
          id: d.id,
          date: dateInputValue(d.date),
          dateLabel: d.date ? formatDate(d.date) : "",
          startTime: d.startTime,
          items: d.items.map((i) => ({
            id: i.id,
            title: i.title,
            durationMin: i.durationMin,
            responsible: i.responsible,
            place: i.place,
            eventId: i.eventId,
            forAll: i.forAll,
            forSides: i.forSides.filter((s) => s !== "BOTH"),
            forRoles: i.forRoles,
            guestIds: i.guests.map((g) => g.guestId),
          })),
        }))}
      />
    </div>
  );
}
