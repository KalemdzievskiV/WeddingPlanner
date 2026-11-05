import "server-only";
import { prisma, type Wedding } from "@svadba/db";
import { PAYERS, type Payer } from "@svadba/shared";
import { countForEvent, plannedCost, toCurrency } from "./planner-calc";

/** Everything the budget page and the overview need, with totals in the wedding's currency. */
export async function loadBudget(wedding: Wedding) {
  const [categories, guests, events] = await Promise.all([
    prisma.budgetCategory.findMany({
      where: { weddingId: wedding.id },
      orderBy: { sortOrder: "asc" },
      include: {
        expenses: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: { payments: { orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }] }, plannedVendor: true },
        },
      },
    }),
    prisma.guest.findMany({ where: { weddingId: wedding.id }, select: { ageGroup: true, invitations: true } }),
    prisma.weddingEvent.findMany({ where: { weddingId: wedding.id }, orderBy: { sortOrder: "asc" } }),
  ]);
  const reception = events.find((e) => e.type === "RECEPTION") ?? events[0];
  const counts = (eventId: string | null) => {
    const id = eventId ?? reception?.id;
    return id ? countForEvent(guests, id) : { adults: 0, children: 0 };
  };
  const cur = wedding.currency;

  let planned = 0;
  let paid = 0;
  const byPayer = Object.fromEntries(PAYERS.map((p) => [p, { planned: 0, paid: 0 }])) as Record<
    Payer,
    { planned: number; paid: number }
  >;

  const rows = categories.map((c) => {
    let catPlanned = 0;
    const expenses = c.expenses.map((e) => {
      const cost = plannedCost(e, counts, wedding.estimatedGuests);
      const usingEstimate =
        e.costType === "PER_PERSON" && e.guestsOverride == null && counts(e.eventId).adults + counts(e.eventId).children === 0;
      const plannedConv = toCurrency(cost.total, e.currency, cur);
      const paidConv = e.payments
        .filter((p) => p.paidAt)
        .reduce((n, p) => n + toCurrency(p.amount, p.currency, cur), 0);
      catPlanned += plannedConv;
      planned += plannedConv;
      paid += paidConv;
      byPayer[e.payer].planned += plannedConv;
      byPayer[e.payer].paid += paidConv;
      return { ...e, plannedTotal: cost.total, people: cost.people, usingEstimate, plannedConv, paidConv };
    });
    return { ...c, expenses, planned: catPlanned };
  });

  const payments = rows.flatMap((c) =>
    c.expenses.flatMap((e) => e.payments.map((p) => ({ ...p, expenseName: e.name, expenseId: e.id }))),
  );

  return { categories: rows, events, planned, paid, byPayer, payments };
}
