import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { SeatingPlanner } from "@/components/plan/seating-planner";
import { localeFrom } from "@/lib/locale";
import { eventName } from "@/lib/plan-helpers";
import { loadSeating, seatingEvents } from "@/lib/seating";
import { canEdit, premiumLocked, requireWedding } from "@/lib/wedding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("plan.seating"))("title") };
}

/** Full-screen seating editor (decision 126). It covers the planner page; "Close" goes back to Seating. */
export default async function SeatingEditorPage({
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
      mode="editor"
      eventId={event.id}
      locale={locale}
      editable={canEdit(role)}
      events={events.map((e) => ({ id: e.id, name: eventName(e, te) }))}
      display={{ plain: wedding.seatPlainFigures, firstNames: wedding.seatFirstNames }}
      {...data}
    />
  );
}
