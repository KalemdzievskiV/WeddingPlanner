import { prisma } from "@svadba/db";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PrintButton, ScheduleManager } from "@/components/plan/schedule-manager";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
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
  const events = await prisma.weddingEvent.findMany({
    where: { weddingId: wedding.id },
    orderBy: [{ date: "asc" }, { sortOrder: "asc" }],
    include: { scheduleItems: { orderBy: { time: "asc" } } },
  });

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
      {events.map((e) => (
        <Card key={e.id} className="break-inside-avoid p-6 print:border-0 print:p-0 print:shadow-none">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl">{eventName(e, te)}</h2>
            <p className="text-sm text-stone tabular-nums">
              {[e.date ? formatDate(e.date) : null, e.time, e.place].filter(Boolean).join(" · ")}
            </p>
          </div>
          <ScheduleManager
            eventId={e.id}
            editable={canEdit(role)}
            items={e.scheduleItems.map((i) => ({ id: i.id, time: i.time, title: i.title, responsible: i.responsible, place: i.place }))}
          />
        </Card>
      ))}
    </div>
  );
}
