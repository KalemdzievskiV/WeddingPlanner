import { timelineSlots } from "@svadba/shared";
import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { RsvpForm } from "@/components/plan/rsvp-form";
import { DesignedInvite } from "@/components/invite/designed-invite";
import { InviteSection } from "@/components/invite/invite-section";
import { LocationMap } from "@/components/public/location-map";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Stitch } from "@/components/ui/stitch";
import { formatDate } from "@/lib/format";
import { inviteCountdownTo, inviteTrackSrc, inviteVenue } from "@/lib/invite";
import { coupleNames, eventName } from "@/lib/plan-helpers";
import { resolveRsvp } from "@/lib/rsvp";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const h = await resolveRsvp(token);
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

/** Public page for one household (or one guest, on a personal link) to confirm who's coming. No login; the token is the key. */
export default async function RsvpPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("rsvp");
  const te = await getTranslations("plan.events");
  const ti = await getTranslations("invite");
  const household = await resolveRsvp(token);
  const personal = household?.personal ?? null;

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

  const when = (e: { date: Date | null; time: string | null; place: string | null }) =>
    [e.date ? formatDate(e.date) : "", e.time ?? "", e.place ?? ""].filter(Boolean).join(" · ");
  // The designed invitation replaces the plain page when the couple switched it on (decision 130).
  const designed = household && !household.wedding.archivedAt && household.wedding.inviteEnabled ? household.wedding : null;
  const directions = (lat: number, lng: number) => (
    <a
      href={mapsUrl(lat, lng)}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--inv-line)] bg-[var(--inv-paper)]/70 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--inv-accent)] transition hover:bg-[var(--inv-paper)]"
    >
      <MapPin aria-hidden className="size-3.5" /> {ti("directions")}
    </a>
  );

  if (household && designed) {
    const shown = invited.filter((e) => designed.inviteEventIds.includes(e.id));
    const places = invited.filter((e) => e.place || e.lat != null);
    const multiDay = schedule.length > 1;
    return (
      <main id="main">
        <DesignedInvite
          theme={designed.inviteTheme}
          videoUrl={designed.inviteVideoFile ?? designed.inviteVideoUrl}
          overlay={designed.inviteOverlay}
          headline={designed.inviteHeadline}
          message={designed.inviteMessage}
          partner1={designed.partner1}
          partner2={designed.partner2}
          dateLabel={designed.date ? formatDate(designed.date) : ""}
          venue={inviteVenue(shown, invited)}
          greeting={personal ? household.guests[0]?.name : household.name}
          photoUrl={designed.invitationUrl}
          countdownTo={inviteCountdownTo(designed.date, invited)}
          musicSrc={inviteTrackSrc(designed.inviteMusic)}
          corner={<LanguageSwitcher />}
        >
          {(schedule.length > 0 || shown.length > 0) && (
            <InviteSection title={ti("theDay")}>
              {schedule.length > 0
                ? schedule.map(({ day, items }) => (
                    <div key={day.id} className="mb-8 last:mb-0">
                      {multiDay && day.date && <h3 className="mb-4 text-center text-sm font-semibold tabular-nums tracking-[0.25em]">{formatDate(day.date)}</h3>}
                      <ol className="ml-3 border-l border-[var(--inv-line)]">
                        {items.map(({ item, slot, event }) => {
                          const place = item.place ?? event?.place ?? null;
                          return (
                            <li key={item.id} className="relative pb-7 pl-6 last:pb-0">
                              <span aria-hidden className="absolute -left-[5px] top-1.5 size-[9px] rotate-45 bg-[var(--inv-line)]" />
                              <p className="text-sm font-semibold tabular-nums tracking-[0.15em] text-[var(--inv-accent)]">
                                {slot.label}
                                {slot.dayOffset > 0 && <span className="ml-2 font-normal text-[var(--inv-soft)]">{t("nextDay")}</span>}
                              </p>
                              <p className="text-xl font-medium leading-snug">{item.title}</p>
                              {place && <p className="text-[var(--inv-soft)]">{place}</p>}
                              {event?.lat != null && event.lng != null && directions(event.lat, event.lng)}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  ))
                : (
                    <ol className="ml-3 border-l border-[var(--inv-line)]">
                      {shown.map((e) => (
                        <li key={e.id} className="relative pb-7 pl-6 last:pb-0">
                          <span aria-hidden className="absolute -left-[5px] top-1.5 size-[9px] rotate-45 bg-[var(--inv-line)]" />
                          {(e.time || e.date) && (
                            <p className="text-sm font-semibold tabular-nums tracking-[0.15em] text-[var(--inv-accent)]">
                              {[e.date ? formatDate(e.date) : "", e.time ?? ""].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          <p className="text-xl font-medium leading-snug">{eventName(e, te)}</p>
                          {e.place && <p className="text-[var(--inv-soft)]">{e.place}</p>}
                          {e.lat != null && e.lng != null && directions(e.lat, e.lng)}
                        </li>
                      ))}
                    </ol>
                  )}
            </InviteSection>
          )}

          {places.length > 0 && (
            <InviteSection title={ti("location")}>
              <ul className="space-y-10">
                {places.map((e) => (
                  <li key={e.id} className="text-center">
                    <h3 className="text-2xl font-medium">{eventName(e, te)}</h3>
                    {e.place && <p className="mt-1 text-[var(--inv-soft)]">{e.place}</p>}
                    {e.lat != null && e.lng != null && (
                      <>
                        <div className="inv-paper mt-4 overflow-hidden rounded-2xl p-1.5 text-left">
                          <div className="overflow-hidden rounded-xl">
                            <LocationMap lat={e.lat} lng={e.lng} label={eventName(e, te)} />
                          </div>
                        </div>
                        {directions(e.lat, e.lng)}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </InviteSection>
          )}

          <InviteSection id="rsvp" title={ti("rsvpTitle")}>
            <p className="-mt-4 mb-6 text-center text-lg italic">{t("lead")}</p>
            <div className="inv-paper inv-sans rounded-2xl p-5 sm:p-7">
                <RsvpForm
                  token={token}
                  answered={!!(personal ? personal.respondedAt : household.respondedAt)}
                  initialNote={(personal ? personal.guestNote : household.guestNote) ?? ""}
                  guests={household.guests.map((g) => ({ id: g.id, name: g.name, eventIds: g.invitations.map((i) => i.eventId) }))}
                  initial={Object.fromEntries(
                    household.guests.flatMap((g) =>
                      g.invitations.filter((i) => i.rsvp !== "PENDING").map((i) => [`${g.id}:${i.eventId}`, i.rsvp as "YES" | "NO"]),
                    ),
                  )}
                  events={invited.map((e) => ({
                      id: e.id,
                      name: eventName(e, te),
                      when: when(e),
                    }))}
                />
            </div>
          </InviteSection>
        </DesignedInvite>
      </main>
    );
  }

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
          <Card id="rsvp" className="mt-8 scroll-mt-6 p-5 sm:p-7">
            <RsvpForm
              token={token}
              answered={!!(personal ? personal.respondedAt : household.respondedAt)}
              initialNote={(personal ? personal.guestNote : household.guestNote) ?? ""}
              guests={household.guests.map((g) => ({ id: g.id, name: g.name, eventIds: g.invitations.map((i) => i.eventId) }))}
              initial={Object.fromEntries(
                household.guests.flatMap((g) =>
                  g.invitations.filter((i) => i.rsvp !== "PENDING").map((i) => [`${g.id}:${i.eventId}`, i.rsvp as "YES" | "NO"]),
                ),
              )}
              events={invited.map((e) => ({
                  id: e.id,
                  name: eventName(e, te),
                  when: when(e),
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
