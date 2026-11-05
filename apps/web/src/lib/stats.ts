import "server-only";
import { prisma } from "@svadba/db";
import { todayIso } from "./dates";

type Counter = "views" | "inquiries" | "favorites";

const today = () => new Date(`${todayIso()}T00:00:00Z`);

/** Adds to today's counter for a business (decision 84). Favourites can go down when removed. */
export async function bumpStat(businessId: string, counter: Counter, by = 1) {
  const date = today();
  await prisma.businessStatDay.upsert({
    where: { businessId_date: { businessId, date } },
    create: { businessId, date, [counter]: Math.max(0, by) },
    update: { [counter]: { increment: by } },
  });
}

/** Counts a profile view once per visitor per day. Returns true when it was counted. */
export async function recordView(businessId: string, visitor: string) {
  const date = today();
  const { count } = await prisma.businessView.createMany({ data: [{ businessId, date, visitor }], skipDuplicates: true });
  if (count > 0) await bumpStat(businessId, "views");
  return count > 0;
}

/** Monthly totals for the last 12 months (oldest first), for the vendor dashboard. */
export async function monthlyStats(businessId: string) {
  const [y, m] = todayIso().split("-").map(Number) as [number, number];
  const months = Array.from({ length: 12 }, (_, i) => {
    const idx = y * 12 + (m - 1) - (11 - i);
    return { year: Math.floor(idx / 12), month: idx % 12 };
  });
  const from = new Date(Date.UTC(months[0]!.year, months[0]!.month, 1));
  const days = await prisma.businessStatDay.findMany({ where: { businessId, date: { gte: from } } });
  const rows = months.map((mo) => ({ ...mo, views: 0, inquiries: 0, favorites: 0 }));
  for (const d of days) {
    const row = rows.find((r) => r.year === d.date.getUTCFullYear() && r.month === d.date.getUTCMonth());
    if (!row) continue;
    row.views += d.views;
    row.inquiries += d.inquiries;
    row.favorites += d.favorites;
  }
  return rows;
}
