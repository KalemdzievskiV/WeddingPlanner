"use client";

import type { DayStatus } from "@svadba/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { setDaysAction, setUnmarkedDaysAction } from "@/actions/vendor";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { calendarLabels, monthTitle } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Brush = DayStatus | "CLEAR";
type Calendar = { key: string; name: string };

const dayClass: Record<DayStatus, string> = {
  FREE: "bg-olive-soft text-olive border-olive/30",
  TENTATIVE: "bg-amber-soft text-amber border-amber/30",
  BOOKED: "bg-ink/[0.08] text-ink-soft border-ink/15 line-through decoration-ink/30",
};
const swatch: Record<Brush, string> = {
  FREE: "bg-olive",
  TENTATIVE: "bg-amber",
  BOOKED: "bg-stone",
  CLEAR: "border border-line-strong bg-surface",
};

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const MONTHS_AHEAD = 24;

export function CalendarEditor({
  businessId,
  calendars,
  initialDays,
  unmarkedDays,
  today,
}: {
  businessId: string;
  calendars: Calendar[];
  /** calendarKey → (YYYY-MM-DD → status) */
  initialDays: Record<string, Record<string, DayStatus>>;
  unmarkedDays: "FREE" | "UNKNOWN";
  today: string;
}) {
  const t = useTranslations("vendor.calendar");
  const labels = calendarLabels(useTranslations("common.calendar"));
  const [calendarKey, setCalendarKey] = useState(calendars[0]?.key ?? "main");
  const [days, setDays] = useState(initialDays);
  const [brush, setBrush] = useState<Brush>("BOOKED");
  const [unmarked, setUnmarked] = useState(unmarkedDays);
  const [error, setError] = useState(false);
  const [, start] = useTransition();
  const [ty, tm] = today.split("-").map(Number) as [number, number];
  const [offset, setOffset] = useState(0);

  const year = ty + Math.floor((tm - 1 + offset) / 12);
  const month = (tm - 1 + offset) % 12;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const current = days[calendarKey] ?? {};

  function apply(dates: string[]) {
    const status = brush === "CLEAR" ? null : brush;
    const previous = days;
    setDays((all) => {
      const next = { ...(all[calendarKey] ?? {}) };
      for (const d of dates) {
        if (status) next[d] = status;
        else delete next[d];
      }
      return { ...all, [calendarKey]: next };
    });
    setError(false);
    start(async () => {
      const res = await setDaysAction(businessId, calendarKey, dates, status);
      if (!res.ok) {
        setDays(previous);
        setError(true);
      }
    });
  }

  const weekends = () => {
    const dates: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = iso(year, month, d);
      const wd = new Date(Date.UTC(year, month, d)).getUTCDay();
      if ((wd === 0 || wd === 6) && date >= today) dates.push(date);
    }
    if (dates.length) apply(dates);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        {calendars.length > 1 && (
          <div>
            <label htmlFor="calendar-hall" className="mb-1.5 block text-sm font-medium">
              {t("hall")}
            </label>
            <Select id="calendar-hall" value={calendarKey} onChange={(e) => setCalendarKey(e.target.value)} className="w-56">
              {calendars.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">{t("lead")}</legend>
          <div className="flex flex-wrap gap-1.5">
            {(["FREE", "TENTATIVE", "BOOKED", "CLEAR"] as const).map((b) => (
              <label
                key={b}
                className={cn(
                  "flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm transition-colors",
                  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-vranec/30",
                  brush === b ? "border-ink bg-ink text-white" : "border-line-strong bg-surface hover:border-ink-soft/50",
                )}
              >
                <input type="radio" name="brush" value={b} checked={brush === b} onChange={() => setBrush(b)} className="sr-only" />
                <span aria-hidden className={cn("size-3 rounded-sm", swatch[b])} />
                {t(`brush.${b}`)}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" aria-label={t("prev")} disabled={offset === 0} onClick={() => setOffset((o) => o - 1)}>
            <ChevronLeft aria-hidden className="size-5" />
          </Button>
          <h2 className="text-lg font-semibold" aria-live="polite">
            {monthTitle(year, month, labels)}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            aria-label={t("next")}
            disabled={offset >= MONTHS_AHEAD}
            onClick={() => setOffset((o) => o + 1)}
          >
            <ChevronRight aria-hidden className="size-5" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {labels.weekdays.map((w) => (
            <div key={w} className="pb-1 text-xs font-medium uppercase tracking-wide text-stone">
              {w}
            </div>
          ))}
          {Array.from({ length: firstWeekday }, (_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1;
            const date = iso(year, month, d);
            const status = current[date];
            const past = date < today;
            return (
              <button
                key={date}
                type="button"
                disabled={past}
                onClick={() => apply([date])}
                aria-label={`${d}. ${status ? t(`brush.${status}`) : ""}`}
                aria-pressed={!!status}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-lg border text-sm tabular-nums transition-colors sm:text-base",
                  status ? dayClass[status] : "border-line text-ink hover:border-ink-soft/50",
                  past && "cursor-not-allowed opacity-35",
                  date === today && "ring-2 ring-vranec/60 ring-offset-1",
                )}
              >
                {d}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" size="sm" onClick={weekends}>
            {t("weekends")}
          </Button>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {t("saveError")}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="unmarked">{t("unmarked")}</label>
        <Select
          id="unmarked"
          value={unmarked}
          className="h-9 w-auto"
          onChange={(e) => {
            const value = e.target.value as "FREE" | "UNKNOWN";
            setUnmarked(value);
            start(async () => void (await setUnmarkedDaysAction(businessId, value)));
          }}
        >
          <option value="FREE">{t("unmarkedOptions.FREE")}</option>
          <option value="UNKNOWN">{t("unmarkedOptions.UNKNOWN")}</option>
        </Select>
      </div>
    </div>
  );
}
