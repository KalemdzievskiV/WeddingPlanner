import { prisma } from "@svadba/db";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { RsvpForm } from "@/components/plan/rsvp-form";
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

/** Public page for one household to confirm who's coming. No login; the token is the key. */
export default async function RsvpPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("rsvp");
  const te = await getTranslations("plan.events");
  const household = await prisma.household.findUnique({
    where: { rsvpToken: token },
    include: {
      wedding: { include: { events: { orderBy: { sortOrder: "asc" } } } },
      guests: { orderBy: { sortOrder: "asc" }, include: { invitations: true } },
    },
  });

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
              events={household.wedding.events
                .filter((e) => household.guests.some((g) => g.invitations.some((i) => i.eventId === e.id)))
                .map((e) => ({
                  id: e.id,
                  name: eventName(e, te),
                  when: [e.date ? formatDate(e.date) : "", e.time ?? "", e.place ?? ""].filter(Boolean).join(" · "),
                }))}
            />
          </Card>
        </>
      )}
    </main>
  );
}
