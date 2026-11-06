import "server-only";
import { prisma } from "@svadba/db";
import { messages } from "@svadba/i18n";
import type { Locale } from "@svadba/shared";
import { strToU8, zipSync } from "fflate";
import { createTranslator } from "next-intl";
import writeXlsxFile, { type Row, type SheetData } from "write-excel-file/node";
import { formatDate } from "./format";
import { eventName } from "./plan-helpers";

/** Everything stored about a user (decision 91): one JSON file plus Excel sheets for the guest list and budget. */
export async function buildAccountExport(userId: string, locale: Locale) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      roles: true,
      locale: true,
      emailNotifications: true,
      createdAt: true,
      accounts: { select: { providerId: true, createdAt: true } },
      notifications: { select: { type: true, data: true, link: true, readAt: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      reviews: { select: { rating: true, text: true, createdAt: true, business: { select: { name: true } } } },
      memberships: {
        select: {
          role: true,
          business: {
            include: {
              city: { select: { nameEn: true } },
              halls: true,
              menuPackages: true,
              extras: true,
              servicePackages: true,
              travelFees: { include: { city: { select: { nameEn: true } } } },
              photos: { select: { url: true } },
              videoLinks: { select: { url: true } },
            },
          },
        },
      },
      weddingMember: { select: { role: true, weddingId: true } },
    },
  });

  const wedding = user.weddingMember
    ? await prisma.wedding.findUnique({
        where: { id: user.weddingMember.weddingId },
        include: {
          city: { select: { nameEn: true } },
          members: { select: { role: true, user: { select: { name: true } } } },
          events: { orderBy: { sortOrder: "asc" }, include: { scheduleItems: true } },
          households: {
            orderBy: { createdAt: "asc" },
            include: { guests: { orderBy: { sortOrder: "asc" }, include: { invitations: true, seats: { include: { table: true } } } } },
          },
          tables: true,
          budgetCategories: {
            orderBy: { sortOrder: "asc" },
            include: { expenses: { orderBy: { sortOrder: "asc" }, include: { payments: true, event: true } } },
          },
          tasks: { orderBy: { sortOrder: "asc" } },
          plannedVendors: { include: { business: { select: { name: true } } } },
          favorites: { include: { business: { select: { name: true, slug: true } } } },
          inquiries: { include: { business: { select: { name: true } }, messages: true, offers: true } },
          reviews: { include: { business: { select: { name: true } } } },
        },
      })
    : null;

  const { weddingMember, ...account } = user;
  const json = {
    exportedAt: new Date().toISOString(),
    account,
    wedding: wedding ? { yourRole: weddingMember?.role, ...wedding } : null,
  };

  const files: Record<string, Uint8Array> = {
    "svadba-data.json": strToU8(JSON.stringify(json, null, 2)),
  };
  if (wedding) {
    const t = createTranslator({ locale, messages: messages[locale], namespace: "account.export.sheets" });
    const tg = createTranslator({ locale, messages: messages[locale], namespace: "plan.guests" });
    const tb = createTranslator({ locale, messages: messages[locale], namespace: "plan.budget" });
    const te = createTranslator({ locale, messages: messages[locale], namespace: "plan.events" });
    const header = (labels: string[]): Row => labels.map((value) => ({ value, fontWeight: "bold" as const }));

    const events = wedding.events;
    const guestRows: SheetData = [
      header([
        t("household"),
        t("guest"),
        t("side"),
        t("ageGroup"),
        ...events.map((e) => eventName(e, te)),
        t("table"),
        t("guestNote"),
      ]),
    ];
    for (const h of wedding.households) {
      for (const g of h.guests) {
        guestRows.push([
          h.name,
          g.name,
          tg(`sides.${h.side}`),
          tg(`ageGroups.${g.ageGroup}`),
          ...events.map((e) => {
            const inv = g.invitations.find((i) => i.eventId === e.id);
            return inv ? tg(`rsvp.${inv.rsvp}`) : "—";
          }),
          g.seats.map((s) => s.table.name).join(", "),
          h.guestNote ?? "",
        ]);
      }
    }

    const budgetRows: SheetData = [
      header([t("category"), t("item"), t("costType"), t("amount"), t("currency"), t("payer"), t("event"), t("notes")]),
    ];
    const paymentRows: SheetData = [header([t("item"), t("paymentKind"), t("amount"), t("currency"), t("dueDate"), t("paidOn")])];
    for (const c of wedding.budgetCategories) {
      for (const x of c.expenses) {
        budgetRows.push([
          c.name,
          x.name,
          tb(`costTypes.${x.costType}`),
          x.amount,
          x.currency,
          tb(`payers.${x.payer}`),
          x.event ? eventName(x.event, te) : "",
          x.notes ?? "",
        ]);
        for (const p of x.payments) {
          paymentRows.push([
            x.name,
            tb(`paymentKinds.${p.kind}`),
            p.amount,
            p.currency,
            p.dueDate ? formatDate(p.dueDate) : "",
            p.paidAt ? formatDate(p.paidAt) : "",
          ]);
        }
      }
    }

    files[`${t("guestsFile")}.xlsx`] = await xlsx([{ sheet: t("guestsSheet"), data: guestRows }]);
    files[`${t("budgetFile")}.xlsx`] = await xlsx([
      { sheet: t("budgetSheet"), data: budgetRows },
      { sheet: t("paymentsSheet"), data: paymentRows },
    ]);
  }

  return zipSync(files, { level: 6 });
}

async function xlsx(sheets: { sheet: string; data: SheetData }[]) {
  const buffer = await writeXlsxFile(sheets.map((s) => ({ ...s, sheet: s.sheet.slice(0, 31) }))).toBuffer();
  return new Uint8Array(buffer);
}
