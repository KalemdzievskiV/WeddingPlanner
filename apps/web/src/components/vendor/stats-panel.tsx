import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { calendarLabels } from "@/lib/dates";
import { monthlyStats } from "@/lib/stats";
import { cn } from "@/lib/utils";

const METRICS = ["views", "inquiries", "favorites"] as const;

/** Vendor stats (decision 84): this month vs last, a 12-month views chart, and a table of all three. */
export async function StatsPanel({ businessId }: { businessId: string }) {
  const t = await getTranslations("vendor.stats");
  const cal = calendarLabels(await getTranslations("common.calendar"));
  const rows = await monthlyStats(businessId);
  const current = rows[11]!;
  const previous = rows[10]!;
  const max = Math.max(1, ...rows.map((r) => r.views));
  const short = (m: number) => cal.months[m]!.slice(0, 3);

  return (
    <Card className="p-6">
      <h2 className="font-display text-2xl">{t("title")}</h2>
      <p className="mt-1 text-sm text-stone">{t("lead")}</p>

      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        {METRICS.map((m) => {
          const diff = current[m] - previous[m];
          return (
            <div key={m} className="rounded-xl border border-line bg-linen/60 p-4">
              <dt className="text-sm text-ink-soft">{t(`metrics.${m}`)}</dt>
              <dd className="mt-1 text-3xl font-semibold tabular-nums">{current[m]}</dd>
              <dd className="mt-1 text-xs text-stone tabular-nums">
                {t("vsLast", { count: previous[m] })}
                {diff !== 0 && (
                  <span className={cn("ml-1 font-medium", diff > 0 ? "text-olive" : "text-ink-soft")}>
                    ({diff > 0 ? "+" : "−"}
                    {Math.abs(diff)})
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      <figure className="mt-8">
        <figcaption className="text-sm font-medium">{t("chartTitle")}</figcaption>
        <div className="mt-4 flex h-40 items-end gap-1.5 border-b border-line-strong" aria-hidden>
          {rows.map((r) => (
            <div key={`${r.year}-${r.month}`} className="group relative flex h-full flex-1 items-end">
              <div
                className={cn("w-full rounded-t-[4px] transition-colors", r === current ? "bg-vranec" : "bg-vranec/45 group-hover:bg-vranec/70")}
                style={{ height: `${(r.views / max) * 100}%`, minHeight: r.views ? 3 : 0 }}
              />
              <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-white tabular-nums group-hover:block">
                {short(r.month)} · {r.views}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex gap-1.5 text-[11px] text-stone" aria-hidden>
          {rows.map((r) => (
            <span key={`${r.year}-${r.month}`} className="flex-1 text-center">
              {short(r.month)}
            </span>
          ))}
        </div>
      </figure>

      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-medium text-vranec">{t("showTable")}</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-stone">
                <th className="py-2 pr-4 font-medium">{t("month")}</th>
                {METRICS.map((m) => (
                  <th key={m} className="py-2 pr-4 text-right font-medium">
                    {t(`metrics.${m}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[...rows].reverse().map((r) => (
                <tr key={`${r.year}-${r.month}`} className="border-t border-line">
                  <td className="py-2 pr-4">
                    {cal.months[r.month]} {r.year}
                  </td>
                  {METRICS.map((m) => (
                    <td key={m} className="py-2 pr-4 text-right">
                      {r[m]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}
