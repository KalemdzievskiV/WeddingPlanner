import { prisma } from "@svadba/db";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SeatingPlanner } from "@/components/plan/seating-planner";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { localeFrom } from "@/lib/locale";
import { eventName } from "@/lib/plan-helpers";
import { canEdit, premiumLocked, requireWedding } from "@/lib/wedding";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("plan.seating"))("title") };
}

export default async function SeatingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ event?: string }>;
}) {
  const locale = await localeFrom(params);
  const { wedding, role } = await requireWedding(locale);
  const t = await getTranslations("plan.seating");
  const te = await getTranslations("plan.events");
  if (premiumLocked(wedding)) return <Card className="p-10 text-center text-ink-soft">{t("locked")}</Card>;

  const events = await prisma.weddingEvent.findMany({
    where: { weddingId: wedding.id, hasSeating: true },
    orderBy: { sortOrder: "asc" },
  });
  if (events.length === 0) {
    return (
      <Card className="p-10 text-center text-ink-soft">
        {t("noSeatingEvents")}{" "}
        <Link href="/plan/settings" className="font-medium text-vranec hover:underline">
          {(await getTranslations("plan.nav"))("settings")}
        </Link>
      </Card>
    );
  }
  const requested = (await searchParams).event;
  const event = events.find((e) => e.id === requested) ?? events[0]!;

  const [tables, invitations] = await Promise.all([
    prisma.seatingTable.findMany({
      where: { eventId: event.id },
      orderBy: [{ sortOrder: "asc" }],
      include: { guests: { select: { guestId: true } } },
    }),
    prisma.guestInvitation.findMany({
      where: { eventId: event.id, rsvp: { not: "NO" } },
      include: { guest: { include: { household: { select: { id: true, name: true } } } } },
      orderBy: [{ guest: { household: { createdAt: "asc" } } }, { guest: { sortOrder: "asc" } }],
    }),
  ]);

  return (
    <div className="space-y-5">
      {events.length > 1 && (
        <nav className="flex flex-wrap gap-1.5" aria-label={t("event")}>
          {events.map((e) => (
            <Link
              key={e.id}
              href={{ pathname: "/plan/seating", query: { event: e.id } }}
              aria-current={e.id === event.id ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center rounded-full border px-3 text-sm",
                e.id === event.id ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink-soft hover:text-ink",
              )}
            >
              {eventName(e, te)}
            </Link>
          ))}
        </nav>
      )}
      <SeatingPlanner
        key={event.id}
        eventId={event.id}
        locale={locale}
        editable={canEdit(role)}
        tables={tables.map((tb) => ({
          id: tb.id,
          name: tb.name,
          shape: tb.shape,
          seats: tb.seats,
          x: tb.x,
          y: tb.y,
          rotation: tb.rotation,
          guestIds: tb.guests.map((g) => g.guestId),
        }))}
        guests={invitations.map((i) => ({
          id: i.guest.id,
          name: i.guest.name,
          household: i.guest.household.name,
          householdId: i.guest.household.id,
          child: i.guest.ageGroup === "CHILD",
          role: i.guest.role,
        }))}
      />
    </div>
  );
}
