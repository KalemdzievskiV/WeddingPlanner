import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { SeatingPlanner } from "@/components/plan/seating-planner";
import { localeFrom } from "@/lib/locale";
import { coupleNames, eventName } from "@/lib/plan-helpers";
import { loadSeating, seatingEvents } from "@/lib/seating";
import { canEdit, premiumLocked, requireWedding } from "@/lib/wedding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("plan.seating"))("chartTitle") };
}

/** Read-only seating chart for printing or the venue entrance (decision 136); editors can share it by link. */
export default async function SeatingChartPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ event?: string }>;
}) {
  const locale = await localeFrom(params);
  const { wedding, role } = await requireWedding(locale);
  const te = await getTranslations("plan.events");
  const events = await seatingEvents(wedding.id);
  if (premiumLocked(wedding) || events.length === 0) redirect(`/${locale}/plan/seating`);
  const requested = (await searchParams).event;
  const event = events.find((e) => e.id === requested) ?? events[0]!;
  const data = await loadSeating(event.id);

  return (
    <SeatingPlanner
      key={event.id}
      mode="chart"
      eventId={event.id}
      locale={locale}
      editable={canEdit(role)}
      events={events.map((e) => ({ id: e.id, name: eventName(e, te) }))}
      couple={coupleNames(wedding)}
      eventName={eventName(event, te)}
      shareToken={event.seatingShareToken}
      display={{ plain: wedding.seatPlainFigures, firstNames: wedding.seatFirstNames }}
      {...data}
    />
  );
}
