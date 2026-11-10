"use client";

import { Download, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { SeatGuest, TableRow } from "./seating-planner";

/** "Table 2" before "Table 10", without Intl (server and browser must agree). */
function naturalCompare(a: string, b: string) {
  const split = (s: string) => s.toLowerCase().match(/\d+|\D+/g) ?? [];
  const x = split(a);
  const y = split(b);
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const p = x[i]!;
    const q = y[i]!;
    if (p === q) continue;
    const np = /^\d/.test(p);
    const nq = /^\d/.test(q);
    if (np && nq) return Number(p) - Number(q);
    return p < q ? -1 : 1;
  }
  return x.length - y.length;
}

type Seated = { table: TableRow; guests: SeatGuest[] };

/** Tables that have guests, head table first, then by name; guests in their seat order. */
function seatedTables(tables: TableRow[], byId: Map<string, SeatGuest>): Seated[] {
  return tables
    .map((table) => ({ table, guests: table.guestIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])) }))
    .filter((s) => s.guests.length > 0)
    .sort((a, b) => Number(b.table.shape === "HEAD") - Number(a.table.shape === "HEAD") || naturalCompare(a.table.name, b.table.name));
}

const fileSafe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "").trim();

/** Excel and print buttons for the seating list the restaurant needs: each table with its guests. */
export function SeatingListActions({
  tables,
  byId,
  eventName,
}: {
  tables: TableRow[];
  byId: Map<string, SeatGuest>;
  eventName: string;
}) {
  const t = useTranslations("plan.seating.export");
  const tg = useTranslations("plan.guests");
  const [busy, setBusy] = useState(false);
  const list = seatedTables(tables, byId);
  const note = (g: SeatGuest) => [g.role ? tg(`roles.${g.role}`) : "", g.child ? t("child") : ""].filter(Boolean).join(", ");

  async function download() {
    setBusy(true);
    try {
      const { default: writeXlsxFile } = await import("write-excel-file/browser");
      const bold = (value: string) => ({ value, fontWeight: "bold" as const });
      const rows = [
        [t("table"), t("number"), t("guest"), t("family"), t("note")].map(bold),
        ...list.flatMap(({ table, guests }) =>
          guests.map((g, i) => [{ value: table.name }, { value: i + 1, type: Number }, { value: g.name }, { value: g.household }, { value: note(g) }]),
        ),
      ];
      await writeXlsxFile(rows, {
        sheet: t("sheet").slice(0, 31),
        columns: [{ width: 18 }, { width: 5 }, { width: 28 }, { width: 24 }, { width: 18 }],
      }).toFile(`${t("file")}${eventName ? `-${fileSafe(eventName)}` : ""}.xlsx`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={download} disabled={busy || list.length === 0} title={t("hint")}>
        <Download aria-hidden className="size-4" /> {t("download")}
      </Button>
      <Button variant="secondary" onClick={() => window.print()} disabled={list.length === 0} title={t("hint")}>
        <Printer aria-hidden className="size-4" /> {t("print")}
      </Button>
    </>
  );
}

/** Print-only page: every table with its guests, numbered, for the restaurant. */
export function SeatingPrintList({
  tables,
  byId,
  couple,
  eventName,
}: {
  tables: TableRow[];
  byId: Map<string, SeatGuest>;
  couple: string;
  eventName: string;
}) {
  const t = useTranslations("plan.seating.export");
  const tg = useTranslations("plan.guests");
  const list = seatedTables(tables, byId);
  const guests = list.reduce((n, s) => n + s.guests.length, 0);
  const children = list.reduce((n, s) => n + s.guests.filter((g) => g.child).length, 0);

  return (
    <div className="hidden text-ink print:block">
      <h1 className="font-display text-2xl">
        {couple} · {t("title")}
        {eventName ? ` · ${eventName}` : ""}
      </h1>
      <p className="mt-1 mb-5 text-sm tabular-nums">{t("totals", { tables: list.length, guests, adults: guests - children, children })}</p>
      <div className="columns-3 gap-6 text-[13px]">
        {list.map(({ table, guests }) => (
          <section key={table.id} className="mb-4 break-inside-avoid rounded-md border border-line-strong p-3">
            <h2 className="flex items-baseline justify-between gap-2 border-b border-line-strong pb-1 text-base font-semibold">
              {table.name}
              <span className="text-xs font-normal tabular-nums">{t("count", { count: guests.length })}</span>
            </h2>
            <ol className="mt-1.5 space-y-0.5">
              {guests.map((g, i) => (
                <li key={g.id} className="flex gap-2">
                  <span className="w-5 shrink-0 text-right tabular-nums text-stone">{i + 1}.</span>
                  <span>
                    {g.name}
                    {(g.role || g.child) && (
                      <span className="text-stone"> ({[g.role ? tg(`roles.${g.role}`) : "", g.child ? t("child") : ""].filter(Boolean).join(", ")})</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
