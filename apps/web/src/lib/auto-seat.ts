type Side = "BRIDE" | "GROOM" | "BOTH";

export type AutoTable = { id: string; seats: number; hidden: readonly number[]; taken: readonly number[]; sides: readonly Side[] };
export type AutoGuest = { id: string; family: string; side: Side; yes: boolean };

/**
 * Where "Seat guests automatically" puts each guest (decision 134). Pure, so it can be reasoned about on its own.
 * - Families whose guests said Yes go first, then the rest, in list order.
 * - A family goes to the table with the fewest free chairs that still holds all of it (fills gaps first),
 *   preferring tables of its own side, then tables with no side yet, and only then the other side's tables.
 * - A family that fits nowhere is split over the roomiest tables, by the same side preference.
 * - Only free, visible chairs within a table's seats are used; tables never go over capacity.
 */
export function autoSeatPlan(tables: readonly AutoTable[], guests: readonly AutoGuest[]) {
  const state = tables.map((tb) => {
    const skip = new Set([...tb.hidden, ...tb.taken]);
    const free = Array.from({ length: tb.seats }, (_, i) => i).filter((i) => !skip.has(i));
    const count = { BRIDE: 0, GROOM: 0 };
    for (const s of tb.sides) if (s !== "BOTH") count[s]++;
    return { id: tb.id, free, count };
  });
  const sideOf = (t: (typeof state)[number]): Side | null =>
    t.count.BRIDE > t.count.GROOM ? "BRIDE" : t.count.GROOM > t.count.BRIDE ? "GROOM" : null;
  // 0: own side (or a "both sides" family anywhere with a side), 1: no side yet, 2: the other side.
  const rank = (t: (typeof state)[number], side: Side) => {
    const ts = sideOf(t);
    if (ts === null) return side === "BOTH" ? 0 : 1;
    return side === "BOTH" || ts === side ? 0 : 2;
  };

  const families = new Map<string, AutoGuest[]>();
  for (const g of guests) families.set(g.family, [...(families.get(g.family) ?? []), g]);
  const ordered = [...families.values()].sort((a, b) => Number(b.some((g) => g.yes)) - Number(a.some((g) => g.yes)));

  const out: { guestId: string; tableId: string; seat: number }[] = [];
  const put = (t: (typeof state)[number], g: AutoGuest) => {
    out.push({ guestId: g.id, tableId: t.id, seat: t.free.shift()! });
    if (g.side !== "BOTH") t.count[g.side]++;
  };
  for (const members of ordered) {
    const side = members[0]!.side;
    const whole = state
      .filter((t) => t.free.length >= members.length)
      .sort((a, b) => rank(a, side) - rank(b, side) || a.free.length - b.free.length)[0];
    if (whole) {
      for (const g of members) put(whole, g);
      continue;
    }
    for (const g of members) {
      const t = state.filter((x) => x.free.length > 0).sort((a, b) => rank(a, side) - rank(b, side) || b.free.length - a.free.length)[0];
      if (!t) break;
      put(t, g);
    }
  }
  return out;
}
