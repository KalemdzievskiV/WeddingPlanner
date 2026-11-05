import { convertPrice, type Currency } from "@svadba/shared";

type Invitation = { eventId: string; rsvp: "PENDING" | "YES" | "NO" };
type GuestRow = { ageGroup: "CHILD" | "YOUNG" | "ADULT" | "OLDER"; invitations: Invitation[] };

/** Invited guests for an event, excluding those who said no, split into adults and children. */
export function countForEvent(guests: GuestRow[], eventId: string) {
  let adults = 0;
  let children = 0;
  let yes = 0;
  let no = 0;
  for (const g of guests) {
    const inv = g.invitations.find((i) => i.eventId === eventId);
    if (!inv) continue;
    if (inv.rsvp === "NO") {
      no++;
      continue;
    }
    if (inv.rsvp === "YES") yes++;
    if (g.ageGroup === "CHILD") children++;
    else adults++;
  }
  return { adults, children, yes, no, total: adults + children };
}

type ExpenseRow = {
  costType: "FIXED" | "PER_PERSON";
  amount: number;
  childPrice: number | null;
  currency: Currency;
  eventId: string | null;
  guestsOverride: number | null;
};

/**
 * Planned cost of an expense in its own currency (decisions 69 and 86).
 * Per-person: override count, else the higher of the guest list (adults + children at child price)
 * and the couple's estimate, so the budget doesn't drop while the list is half-filled.
 */
export function plannedCost(
  e: ExpenseRow,
  counts: (eventId: string | null) => { adults: number; children: number },
  estimatedGuests: number | null,
) {
  if (e.costType === "FIXED") return { total: e.amount, people: null as number | null, usingEstimate: false };
  if (e.guestsOverride != null) return { total: e.amount * e.guestsOverride, people: e.guestsOverride, usingEstimate: false };
  const c = counts(e.eventId);
  const listed = c.adults + c.children;
  // Guests not on the list yet are counted at the adult price.
  const missing = Math.max(0, (estimatedGuests ?? 0) - listed);
  return {
    total: (c.adults + missing) * e.amount + c.children * (e.childPrice ?? e.amount),
    people: listed + missing,
    usingEstimate: missing > 0,
  };
}

export const toCurrency = (amount: number, from: Currency, to: Currency) => convertPrice(amount, from, to);

/** Adds months to a UTC date (negative = earlier). */
export function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/** Due date of a checklist task: its exact date, or derived from the wedding date and its bucket. */
export function taskDueDate(task: { dueDate: Date | null; monthsBefore: number | null }, weddingDate: Date | null) {
  if (task.dueDate) return task.dueDate;
  if (!weddingDate || task.monthsBefore == null) return null;
  if (task.monthsBefore === -1) return new Date(weddingDate.getTime() + 14 * 86_400_000);
  if (task.monthsBefore === 0) return new Date(weddingDate.getTime() - 7 * 86_400_000);
  return addMonths(weddingDate, -task.monthsBefore);
}
