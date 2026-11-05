import { prisma } from "@svadba/db";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GuestManager } from "@/components/plan/guest-manager";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { localeFrom } from "@/lib/locale";
import { coupleNames, eventName } from "@/lib/plan-helpers";
import { canEdit, requireWedding } from "@/lib/wedding";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("plan.guests"))("title") };
}

export default async function GuestsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await localeFrom(params);
  const { wedding, role } = await requireWedding(locale);
  const te = await getTranslations("plan.events");
  const [households, events] = await Promise.all([
    prisma.household.findMany({
      where: { weddingId: wedding.id },
      orderBy: { createdAt: "desc" },
      include: {
        guests: {
          orderBy: { sortOrder: "asc" },
          include: { invitations: { select: { eventId: true, rsvp: true } } },
        },
      },
    }),
    prisma.weddingEvent.findMany({ where: { weddingId: wedding.id }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <GuestManager
      editable={canEdit(role)}
      couple={coupleNames(wedding)}
      rsvpBase={`${env.appUrl}/${locale}/rsvp`}
      events={events.map((e) => ({ id: e.id, name: eventName(e, te) }))}
      households={households.map((h) => ({
        id: h.id,
        name: h.name,
        side: h.side,
        notes: h.notes,
        guestNote: h.guestNote,
        respondedAt: h.respondedAt ? formatDate(h.respondedAt) : null,
        rsvpToken: h.rsvpToken,
        guests: h.guests.map((g) => ({ id: g.id, name: g.name, ageGroup: g.ageGroup, invitations: g.invitations })),
      }))}
    />
  );
}
