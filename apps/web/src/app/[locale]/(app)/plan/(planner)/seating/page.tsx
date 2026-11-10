import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SeatingPlanner } from "@/components/plan/seating-planner";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { localeFrom } from "@/lib/locale";
import { ensureCoupleSeated } from "@/lib/head-table";
import { eventName } from "@/lib/plan-helpers";
import { loadSeating, seatingEvents } from "@/lib/seating";
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

  // Plans made before the couple were guests get them now (decision 121).
  if (canEdit(role)) await ensureCoupleSeated(wedding.id);

  const events = await seatingEvents(wedding.id);
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

  const data = await loadSeating(event.id);

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
        {...data}
      />
    </div>
  );
}
