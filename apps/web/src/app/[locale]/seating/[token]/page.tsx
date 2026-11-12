import { prisma } from "@svadba/db";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { SeatingPlanner } from "@/components/plan/seating-planner";
import { localeFrom } from "@/lib/locale";
import { coupleNames, eventName } from "@/lib/plan-helpers";
import { loadSeating } from "@/lib/seating";

/** The event behind a read-only chart link, while the couple has the link switched on. */
function sharedEvent(token: string) {
  return prisma.weddingEvent.findFirst({
    where: { seatingShareToken: token, hasSeating: true },
    include: { wedding: { select: { partner1: true, partner2: true, seatPlainFigures: true, seatFirstNames: true } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const event = await sharedEvent((await params).token);
  const t = await getTranslations("plan.seating");
  return { title: event ? `${t("chartTitle")} · ${coupleNames(event.wedding)}` : t("chartTitle"), robots: { index: false } };
}

/** Public, read-only seating chart (decision 136). No login; the token is the key and the couple can switch it off. */
export default async function SharedSeatingPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const locale = await localeFrom(params);
  const event = await sharedEvent((await params).token);
  if (!event) notFound();
  const te = await getTranslations("plan.events");
  const data = await loadSeating(event.id);
  // Only what the chart shows: seated guests' names, no answers or unseated guests.
  const seated = new Set(data.tables.flatMap((tb) => tb.guestIds));
  const guests = data.guests.filter((g) => seated.has(g.id)).map((g) => ({ ...g, household: "", householdId: "", rsvp: "YES" as const }));
  return (
    <SeatingPlanner
      mode="chart"
      isPublic
      eventId={event.id}
      locale={locale}
      editable={false}
      couple={coupleNames(event.wedding)}
      eventName={eventName(event, te)}
      display={{ plain: event.wedding.seatPlainFigures, firstNames: event.wedding.seatFirstNames }}
      {...data}
      guests={guests}
    />
  );
}
