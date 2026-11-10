import { prisma } from "@svadba/db";

const include = {
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
} as const;

/**
 * Finds what an RSVP link opens. A household link covers the whole family; a guest's personal link
 * covers only that guest, so the rest of the family is left out. Null for an unknown token.
 */
export async function resolveRsvp(token: string) {
  if (typeof token !== "string" || !token) return null;
  const household = await prisma.household.findUnique({ where: { rsvpToken: token }, include });
  if (household) return { ...household, personal: null };

  const guest = await prisma.guest.findUnique({ where: { rsvpToken: token }, include: { household: { include } } });
  if (!guest) return null;
  const h = guest.household;
  return {
    ...h,
    guests: h.guests.filter((g) => g.id === guest.id),
    personal: { guestId: guest.id, guestNote: guest.guestNote, respondedAt: guest.respondedAt },
  };
}

export type ResolvedRsvp = NonNullable<Awaited<ReturnType<typeof resolveRsvp>>>;
