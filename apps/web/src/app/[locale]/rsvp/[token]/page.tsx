import { prisma } from "@svadba/db";
import { timelineSlots } from "@svadba/shared";
import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { RsvpForm } from "@/components/plan/rsvp-form";
import { LocationMap } from "@/components/public/location-map";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Stitch } from "@/components/ui/stitch";
import { formatDate } from "@/lib/format";
import { coupleNames, eventName } from "@/lib/plan-helpers";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const h = await prisma.household.findUnique({ where: { rsvpToken: token }, include: { wedding: true } });
  if (!h) return { robots: { index: false } };
  const title = coupleNames(h.wedding);
  const description = (await getTranslations("rsvp"))("lead");
  // The invitation becomes the preview when the link is shared in Viber / WhatsApp.
  const image = h.wedding.archivedAt ? null : h.wedding.invitationUrl;
  return {
    title,
    description,
    robots: { index: false },
    openGraph: { title, description, images: image ? [{ url: image, alt: title }] : [] },
    twitter: { card: image ? "summary_large_image" : "summary", title, description },
  };
}

/** Directions in the guest's own maps app. */
const mapsUrl = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

/** Public page for one household to confirm who's coming. No login; the token is the key. */
export default async function RsvpPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("rsvp");
  const te = await getTranslations("plan.events");
  const household = await prisma.household.findUnique({
    where: { rsvpToken: token },
    include: {
      wedding: {
        include: {
          events: { orderBy: { sortOrder: "asc" } },
          scheduleDays: {
            orderBy: { date: { sort: "asc", nulls: "last" } },
            include: { items: { orderBy: { sortOrder: "asc" }, include: { guests: { select: { guestId: true } } } } },
          },
        },
      },
      guests: { orderBy: { sortOrder: "asc" }, include: { invitations: true } },
    },
  });

  // Events this household is invited to, and the schedule items that include someone in it (decision 106).
  const invited = household ? household.wedding.events.filter((e) => household.guests.some((g) => g.invitations.some((i) => i.eventId === e.id))) : [];
  const eventById = new Map(household?.wedding.events.map((e) => [e.id, e]));
  const schedule = household
    ? household.wedding.scheduleDays
        .map((day) => {
          const slots = timelineSlots(
            day.startTime,
            day.items.map((i) => i.durationMin),
          );
          const ids = new Set(household.guests.map((g) => g.id));
          const roles = new Set(household.guests.flatMap((g) => (g.role ? [g.role] : [])));
          const items = day.items.flatMap((item, idx) => {
            const mine =
              item.forAll ||
              item.forSides.some((s) => s === household.side || household.side === "BOTH") ||
              item.forRoles.some((r) => roles.has(r)) ||
              item.guests.some((g) => ids.has(g.guestId));
            return mine ? [{ item, slot: slots[idx]!, event: item.eventId ? eventById.get(item.eventId) : undefined }] : [];
          });
          return { day, items };
        })
        .filter((d) => d.items.length > 0)
    : [];

  return (
    <main id="main" className="mx-auto max-w-xl px-4 pb-16 pt-6">
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>
      {!household ? (
        <Alert tone="error" className="mt-10">
          {t("invalid")}
        </Alert>
      ) : household.wedding.archivedAt ? (
        <Alert className="mt-10">{t("closed")}</Alert>
      ) : (
        <>
          {household.wedding.invitationUrl && (
            <figure className="mt-4">
              <a href={household.wedding.invitationUrl} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={household.wedding.invitationUrl}
                  alt={t("invitationAlt", { couple: coupleNames(household.wedding) })}
                  className="w-full rounded-2xl border border-line bg-surface shadow-sm"
                />
              </a>
              <figcaption className="mt-2 text-center text-xs text-stone">{t("invitationZoom")}</figcaption>
            </figure>
          )}
          <header className="mt-6 text-center">
            <h1 className="font-display text-4xl sm:text-5xl">{coupleNames(household.wedding)}</h1>
            {household.wedding.date && (
              <p className="mt-3 text-lg tabular-nums text-ink-soft">{formatDate(household.wedding.date)}</p>
            )}
            <Stitch className="mx-auto mt-6 w-32" />
            <p className="mt-6 text-ink-soft">{t("lead")}</p>
          </header>
          <Card className="mt-8 p-5 sm:p-7">
            <RsvpForm
              token={token}
              answered={!!household.respondedAt}
              initialNote={household.guestNote ?? ""}
              guests={household.guests.map((g) => ({ id: g.id, name: g.name, eventIds: g.invitations.map((i) => i.eventId) }))}
              initial={Object.fromEntries(
                household.guests.flatMap((g) =>
                  g.invitations.filter((i) => i.rsvp !== "PENDING").map((i) => [`${g.id}:${i.eventId}`, i.rsvp as "YES" | "NO"]),
                ),
              )}
              events={invited.map((e) => ({
                  id: e.id,
                  name: eventName(e, te),
                  when: [e.date ? formatDate(e.date) : "", e.time ?? "", e.place ?? ""].filter(Boolean).join(" · "),
                }))}
            />
          </Card>

          {schedule.length > 0 && (
            <Card className="mt-6 p-5 sm:p-7">
              <h2 className="text-xl font-semibold">{t("yourSchedule")}</h2>
              <p className="mt-1 text-sm text-stone">{t("yourScheduleLead")}</p>
              {schedule.map(({ day, items }) => (
                <section key={day.id} className="mt-5">
                  {day.date && <h3 className="text-sm font-semibold tabular-nums text-ink-soft">{formatDate(day.date)}</h3>}
                  <ol className="mt-2 divide-y divide-line border-y border-line">
                    {items.map(({ item, slot, event }) => {
                      const place = item.place ?? event?.place ?? null;
                      return (
                        <li key={item.id} className="flex gap-4 py-3">
                          <div className="w-16 shrink-0 tabular-nums">
                            <p className="font-semibold">{slot.label}</p>
                            {slot.dayOffset > 0 && <p className="text-xs text-amber">{t("nextDay")}</p>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{item.title}</p>
                            {place && <p className="text-sm text-stone">{place}</p>}
                            {event?.lat != null && event.lng != null && (
                              <a href={mapsUrl(event.lat, event.lng)} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-sm text-vranec hover:underline">
                                <MapPin aria-hidden className="size-3.5" /> {t("openMap")}
                              </a>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </Card>
          )}

          {invited.some((e) => e.place || e.lat != null) && (
            <Card className="mt-6 p-5 sm:p-7">
              <h2 className="text-xl font-semibold">{t("places")}</h2>
              <ul className="mt-4 space-y-6">
                {invited
                  .filter((e) => e.place || e.lat != null)
                  .map((e) => (
                    <li key={e.id} className="space-y-2">
                      <p className="font-medium">{eventName(e, te)}</p>
                      {e.place && <p className="text-sm text-ink-soft">{e.place}</p>}
                      {e.lat != null && e.lng != null && (
                        <>
                          <LocationMap lat={e.lat} lng={e.lng} label={eventName(e, te)} />
                          <a href={mapsUrl(e.lat, e.lng)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-vranec hover:underline">
                            <MapPin aria-hidden className="size-3.5" /> {t("openMap")}
                          </a>
                        </>
                      )}
                    </li>
                  ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </main>
  );
}
