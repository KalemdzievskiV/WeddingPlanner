import { prisma } from "@svadba/db";
import type { DayStatus } from "@svadba/shared";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { CalendarEditor } from "@/components/vendor/calendar-editor";
import { Link } from "@/i18n/navigation";
import { getBusinessAccess } from "@/lib/business";
import { isoDate, todayIso } from "@/lib/dates";

export default async function BusinessCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getBusinessAccess(id);
  if (!access) notFound();
  const { business } = access;
  const t = await getTranslations("vendor.calendar");
  const today = todayIso();

  const halls =
    business.category === "VENUE"
      ? await prisma.hall.findMany({ where: { businessId: id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] })
      : [];
  if (business.category === "VENUE" && halls.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-ink-soft">{t("noHalls")}</p>
        <Link href={`/vendor/${id}/prices`} className="mt-4 inline-block font-medium text-vranec hover:underline">
          {(await getTranslations("vendor.prices"))("addHall")}
        </Link>
      </Card>
    );
  }

  const marked = await prisma.availabilityDay.findMany({
    where: { businessId: id, date: { gte: new Date(`${today}T00:00:00Z`) } },
    select: { calendarKey: true, date: true, status: true },
  });
  const initialDays: Record<string, Record<string, DayStatus>> = {};
  for (const m of marked) (initialDays[m.calendarKey] ??= {})[isoDate(m.date)] = m.status;

  return (
    <CalendarEditor
      businessId={id}
      calendars={halls.length ? halls.map((h) => ({ key: h.id, name: h.name })) : [{ key: "main", name: business.name }]}
      initialDays={initialDays}
      unmarkedDays={business.unmarkedDays}
      today={today}
    />
  );
}
