"use client";

import { AGE_GROUPS, GUEST_SIDES, type AgeGroup, type GuestSide } from "@svadba/shared";
import { Download, FileSpreadsheet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { importGuestsAction } from "@/actions/plan-guests";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Select } from "@/components/ui/field";
import { parseCsv, parsePasted, parseTable, templateCsv, type ImportRow } from "@/lib/guest-import";
import { cn } from "@/lib/utils";

export function GuestImport({ events, onClose }: { events: { id: string; name: string }[]; onClose: () => void }) {
  const t = useTranslations("plan.import");
  const tg = useTranslations("plan.guests");
  const te = useTranslations("errors");
  const [tab, setTab] = useState<"paste" | "file">("paste");
  const [text, setText] = useState("");
  const [side, setSide] = useState<GuestSide>("BRIDE");
  const [age, setAge] = useState<AgeGroup>("ADULT");
  const [eventIds, setEventIds] = useState(events.map((e) => e.id));
  const [fileRows, setFileRows] = useState<ImportRow[] | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const rows = useMemo(
    () => (tab === "paste" ? parsePasted(text, side, age) : (fileRows ?? [])),
    [tab, text, side, age, fileRows],
  );
  const guestCount = rows.reduce((n, r) => n + r.guests.length, 0);

  async function readFile(file: File) {
    setMessage(null);
    try {
      let table: (string | number | boolean | null)[][];
      if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import("read-excel-file/browser");
        table = (await readSheet(file)).map((r) => r.map((c) => (c instanceof Date ? c.toISOString() : (c as string | number | boolean | null))));
      } else {
        table = parseCsv(await file.text());
      }
      const parsed = parseTable(table, side);
      if (parsed.length === 0) throw new Error("empty");
      setFileRows(parsed);
    } catch {
      setFileRows(null);
      setMessage({ tone: "error", text: t("fileError") });
    }
  }

  function downloadTemplate() {
    const headers = t("templateHeaders").split(",");
    const example = t("templateExample")
      .split(";")
      .map((r) => r.split("|"));
    const blob = new Blob([templateCsv(headers, example)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = t("templateFile");
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function submit() {
    start(async () => {
      const res = await importGuestsAction(rows, eventIds);
      if (res.ok) {
        setMessage({ tone: "success", text: t("added", { count: res.added ?? guestCount }) });
        setText("");
        setFileRows(null);
      } else if (res.formError && res.formError !== "emailTaken") {
        setMessage({ tone: "error", text: te(res.formError) });
      }
    });
  }

  return (
    <Card className="space-y-5 border-vranec/30 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl">{t("title")}</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t("close")}
        </Button>
      </div>

      <div role="tablist" className="inline-flex rounded-lg border border-line-strong p-0.5">
        {(["paste", "file"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn("rounded-md px-3 py-1.5 text-sm", tab === k ? "bg-ink text-white" : "text-ink-soft hover:text-ink")}
          >
            {k === "paste" ? t("pasteTab") : t("fileTab")}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="import-side" label={t("side")}>
          <Select id="import-side" value={side} onChange={(e) => setSide(e.target.value as GuestSide)}>
            {GUEST_SIDES.map((s) => (
              <option key={s} value={s}>
                {tg(`sides.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
        {tab === "paste" && (
          <Field id="import-age" label={t("ageGroup")}>
            <Select id="import-age" value={age} onChange={(e) => setAge(e.target.value as AgeGroup)}>
              {AGE_GROUPS.map((a) => (
                <option key={a} value={a}>
                  {tg(`ageGroups.${a}`)}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      {tab === "paste" ? (
        <Field id="import-text" label={t("pasteLabel")} hint={t("pasteHint")}>
          <textarea
            id="import-text"
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("pastePlaceholder")}
            className="block w-full rounded-lg border border-line-strong bg-surface px-3 py-2 font-mono text-sm leading-relaxed focus:border-vranec focus:outline-none focus:ring-2 focus:ring-vranec/15"
          />
        </Field>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-stone">{t("fileHint")}</p>
          <div className="flex flex-wrap gap-2">
            <label className={buttonClass("secondary", "md", "cursor-pointer")}>
              <FileSpreadsheet aria-hidden className="size-4" /> {t("fileLabel")}
              <input
                type="file"
                accept=".xlsx,.csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void readFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            <Button type="button" variant="ghost" onClick={downloadTemplate}>
              <Download aria-hidden className="size-4" /> {t("template")}
            </Button>
          </div>
        </div>
      )}

      {events.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t("events")}</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {events.map((e) => (
              <label key={e.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={eventIds.includes(e.id)}
                  onChange={(ev) => setEventIds((ids) => (ev.target.checked ? [...ids, e.id] : ids.filter((x) => x !== e.id)))}
                />
                {e.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={submit} disabled={pending || rows.length === 0}>
          {t("submit")}
        </Button>
        {rows.length > 0 && (
          <span className="text-sm text-ink-soft tabular-nums">{t("preview", { households: rows.length, guests: guestCount })}</span>
        )}
      </div>
    </Card>
  );
}
