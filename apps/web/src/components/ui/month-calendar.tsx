import { cn } from "@/lib/utils";

export type DayStatus = "free" | "tentative" | "booked";

const statusClass: Record<DayStatus, string> = {
  free: "bg-olive-soft text-olive",
  tentative: "bg-amber-soft text-amber",
  booked: "bg-ink/[0.06] text-stone line-through decoration-stone/50",
};

/**
 * A month grid with a status per day (free / on hold / booked).
 * Weeks start on Monday, as in Macedonia.
 */
export function MonthCalendar({
  year,
  month,
  statuses,
  weekdayLabels,
  highlight,
  className,
}: {
  year: number;
  /** 0-based month */
  month: number;
  statuses: Record<number, DayStatus>;
  /** Seven short labels starting Monday */
  weekdayLabels: string[];
  highlight?: number;
  className?: string;
}) {
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className={cn("grid grid-cols-7 gap-1 text-center text-xs", className)}>
      {weekdayLabels.map((label) => (
        <div key={label} className="pb-1 text-[11px] font-medium uppercase tracking-wide text-stone">
          {label}
        </div>
      ))}
      {cells.map((day, i) =>
        day === null ? (
          <div key={`empty-${i}`} />
        ) : (
          <div
            key={day}
            className={cn(
              "flex aspect-square items-center justify-center rounded-md tabular-nums",
              statuses[day] ? statusClass[statuses[day]] : "text-ink-soft",
              highlight === day && "ring-2 ring-vranec ring-offset-1 ring-offset-surface font-semibold",
            )}
          >
            {day}
          </div>
        ),
      )}
    </div>
  );
}
