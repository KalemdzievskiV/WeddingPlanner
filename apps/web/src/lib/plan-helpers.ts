import type { WeddingEvent } from "@svadba/db";

/** Display name of an event: its own name, or the translated type. */
export function eventName(
  e: Pick<WeddingEvent, "name" | "type">,
  t: (key: `types.${WeddingEvent["type"]}`) => string,
) {
  return e.name || t(`types.${e.type}`);
}

export const coupleNames = (w: { partner1: string; partner2: string }) => `${w.partner1} & ${w.partner2}`;

/** Whole days from today (Skopje) to a date; negative when past. */
export function daysUntil(date: Date, todayIso: string) {
  return Math.round((date.getTime() - new Date(`${todayIso}T00:00:00Z`).getTime()) / 86_400_000);
}
