"use client";

import type { Rsvp } from "@svadba/shared";
import { Download, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GuestRow, HouseholdRow } from "./guest-manager";

type EventOption = { id: string; name: string };
export type GuestMatch = { household: HouseholdRow; guest: GuestRow };

type Tally = Record<Rsvp, number> & { invited: number };

function tally(households: HouseholdRow[], eventId: string): Tally {
  const t: Tally = { invited: 0, PENDING: 0, YES: 0, NO: 0 };
  for (const h of households)
    for (const g of h.guests)
      for (const i of g.invitations)
        if (i.eventId === eventId) {
          t.invited++;
          t[i.rsvp]++;
        }
  return t;
}

/** One card per event: invited · coming · waiting (decision 108). Clicking filters the list. */
export function EventSummary({
  households,
  events,
  active,
  onPick,
}: {
  households: HouseholdRow[];
  events: EventOption[];
  active: string;
  onPick: (eventId: string) => void;
}) {
  const t = useTranslations("plan.guests");
  return (
    <div role="group" aria-label={t("summary")} className="grid grid-cols-2 gap-2 lg:grid-cols-4 print:hidden">
      {events.map((e) => {
        const n = tally(households, e.id);
        const on = active === e.id;
        return (
          <button
            key={e.id}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(on ? "" : e.id)}
            className={cn(
              "min-w-0 rounded-xl border bg-surface p-3 text-left transition-colors hover:border-vranec/50 sm:p-4",
              on ? "border-vranec ring-1 ring-vranec" : "border-line",
            )}
          >
            <p className="truncate text-sm font-medium text-ink-soft">{e.name}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {n.invited} <span className="text-sm font-normal text-stone">{t("statInvited")}</span>
            </p>
            <p className="mt-1 text-sm tabular-nums">
              <span className="text-olive">
                {n.YES} {t("statYes")}
              </span>
              <span className="text-stone">
                {" · "}
                {n.PENDING} {t("statPending")}
              </span>
              {n.NO > 0 && (
                <span className="text-danger">
                  {" · "}
                  {n.NO} {t("statNo")}
                </span>
              )}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function answer(g: GuestRow, eventId: string): Rsvp | null {
  return g.invitations.find((i) => i.eventId === eventId)?.rsvp ?? null;
}

/** Excel of the guests matching the current filter (decision 109) and a print button (decision 110). */
export function GuestListActions({
  matches,
  events,
  eventId,
}: {
  matches: GuestMatch[];
  events: EventOption[];
  eventId: string;
}) {
  const t = useTranslations("plan.guests");
  const ts = useTranslations("account.export.sheets");
  const [busy, setBusy] = useState(false);
  const shown = eventId ? events.filter((e) => e.id === eventId) : events;

  async function download() {
    setBusy(true);
    try {
      const { default: writeXlsxFile } = await import("write-excel-file/browser");
      const bold = (value: string) => ({ value, fontWeight: "bold" as const });
      const rows = [
        [ts("household"), ts("guest"), ts("side"), ts("ageGroup"), t("role"), ...shown.map((e) => e.name), ts("guestNote")].map(bold),
        ...matches.map(({ household: h, guest: g }) =>
          [
            h.name,
            g.name,
            t(`sides.${h.side}`),
            t(`ageGroups.${g.ageGroup}`),
            g.role ? t(`roles.${g.role}`) : "",
            ...shown.map((e) => {
              const a = answer(g, e.id);
              return a ? t(`rsvp.${a}`) : "—";
            }),
            h.guestNote ?? "",
          ].map((value) => ({ value })),
        ),
      ];
      const one = eventId ? shown[0] : undefined;
      const picked = one ? `-${one.name.replace(/[\\/:*?"<>|]+/g, "").trim()}` : "";
      await writeXlsxFile(rows, { sheet: ts("guestsSheet").slice(0, 31) }).toFile(`${ts("guestsFile")}${picked}.xlsx`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button variant="secondary" onClick={download} disabled={busy || matches.length === 0}>
        <Download aria-hidden className="size-4" /> {t("download")}
      </Button>
      <Button variant="secondary" onClick={() => window.print()} disabled={matches.length === 0}>
        <Printer aria-hidden className="size-4" /> {t("print")}
      </Button>
    </div>
  );
}

/** Print-only list of the matching guests, grouped by household (decision 110). */
export function GuestPrintList({
  matches,
  events,
  eventId,
  couple,
  totals,
}: {
  matches: GuestMatch[];
  events: EventOption[];
  eventId: string;
  couple: string;
  totals: string;
}) {
  const t = useTranslations("plan.guests");
  const picked = events.find((e) => e.id === eventId);
  const groups: { household: HouseholdRow; guests: GuestRow[] }[] = [];
  for (const m of matches) {
    const last = groups.at(-1);
    if (last?.household.id === m.household.id) last.guests.push(m.guest);
    else groups.push({ household: m.household, guests: [m.guest] });
  }

  return (
    <div className="hidden print:block">
      <h1 className="font-display text-2xl">
        {couple} · {t("printTitle")}
        {picked ? ` · ${picked.name}` : ""}
      </h1>
      <p className="mt-1 mb-4 text-sm tabular-nums">{totals}</p>
      <div className="columns-2 gap-8 text-sm">
        {groups.map(({ household: h, guests }) => (
          <div key={h.id} className="mb-3 break-inside-avoid">
            <p className="font-semibold">
              {h.name} <span className="font-normal text-stone">· {t(`sides.${h.side}`)}</span>
            </p>
            <ul>
              {guests.map((g) => {
                const answers = (picked ? [picked] : events).flatMap((e) => {
                  const a = answer(g, e.id);
                  return a ? [picked ? t(`rsvp.${a}`) : `${e.name}: ${t(`rsvp.${a}`)}`] : [];
                });
                return (
                  <li key={g.id} className="flex justify-between gap-3 border-b border-line py-0.5">
                    <span>
                      {g.name}
                      {g.role && <span className="text-stone"> ({t(`roles.${g.role}`)})</span>}
                    </span>
                    <span className="text-right text-stone">{answers.join(" · ")}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
