import "server-only";
import { prisma } from "@svadba/db";
import { HEAD_TABLE_ROLES, PLAN_WIDTH, type Locale } from "@svadba/shared";
import { getTranslations } from "next-intl/server";

/**
 * Seats the wedding party (Старосватица, Старосват, Кум, Младоженец, Невеста, Кума) at the head table
 * of every seating event (decision 102). The head table is the event's first HEAD-shaped table.
 * - `create`: add a "Главна маса" where an event has none (new plans and the Seating button).
 * - `guestIds`: only seat these guests (a role was just given); otherwise everyone with a head-table role.
 * Seating moves a guest from any other table; the table grows if the party doesn't fit.
 */
export async function fillHeadTable(
  weddingId: string,
  opts: { create: false; guestIds?: string[] } | { create: true; locale: Locale; eventId?: string },
) {
  const events = await prisma.weddingEvent.findMany({
    where: { weddingId, hasSeating: true, ...(opts.create && opts.eventId ? { id: opts.eventId } : {}) },
    select: { id: true },
  });
  const guestIds = opts.create ? undefined : opts.guestIds;
  const name = opts.create ? await headTableName(opts.locale) : "";
  for (const event of events) {
    const party = await prisma.guestInvitation.findMany({
      where: {
        eventId: event.id,
        rsvp: { not: "NO" },
        guest: { weddingId, role: { in: [...HEAD_TABLE_ROLES] }, ...(guestIds ? { id: { in: guestIds } } : {}) },
      },
      select: { guestId: true },
    });
    let table = await prisma.seatingTable.findFirst({
      where: { eventId: event.id, shape: "HEAD" },
      orderBy: { sortOrder: "asc" },
    });
    if (!table && opts.create) {
      table = await prisma.seatingTable.create({
        data: {
          weddingId,
          eventId: event.id,
          name,
          shape: "HEAD",
          seats: HEAD_TABLE_ROLES.length,
          x: PLAN_WIDTH / 2,
          y: 70,
          sortOrder: -1,
        },
      });
    }
    if (!table || party.length === 0) continue;
    const tableId = table.id;
    const seated = await prisma.tableSeat.count({ where: { tableId, guestId: { notIn: party.map((p) => p.guestId) } } });
    await prisma.$transaction([
      ...party.map(({ guestId }) =>
        prisma.tableSeat.upsert({
          where: { guestId_eventId: { guestId, eventId: event.id } },
          update: { tableId },
          create: { guestId, tableId, eventId: event.id },
        }),
      ),
      ...(seated + party.length > table.seats
        ? [prisma.seatingTable.update({ where: { id: tableId }, data: { seats: seated + party.length } })]
        : []),
    ]);
  }
}

async function headTableName(locale: Locale) {
  const t = await getTranslations({ locale, namespace: "plan.seating" });
  return t("headTableName");
}
