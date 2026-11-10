"use client";

import { EVENT_TYPES, GUEST_ROLES, timelineSlots, type EventType, type GuestRole, type GuestSide } from "@svadba/shared";
import { ArrowDown, ArrowUp, GripVertical, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { resetTypicalDayAction, saveTypicalDayAction } from "@/actions/admin-typical-day";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";
import { cn } from "@/lib/utils";

// Admin editor for the "fill typical day" template (decision 111): one list, live times, one Save.

export type TypicalDayStepRow = {
  titleMk: string;
  titleSq: string | null;
  titleEn: string | null;
  durationMin: number;
  eventType: EventType | null;
  forAll: boolean;
  forSides: GuestSide[];
  forRoles: GuestRole[];
};
type Step = Omit<TypicalDayStepRow, "titleSq" | "titleEn" | "durationMin"> & {
  uid: number;
  titleSq: string;
  titleEn: string;
  /** Kept as typed so a half-typed number doesn't jump. */
  durationMin: string;
};

const SIDES = ["BRIDE", "GROOM"] as const;

/** Loaded steps get their index as uid (same on server and browser); added ones get the next free number. */
const toStep = (s: TypicalDayStepRow, uid: number): Step => ({
  ...s,
  uid,
  titleSq: s.titleSq ?? "",
  titleEn: s.titleEn ?? "",
  durationMin: String(s.durationMin),
});
const payload = (steps: Step[]) =>
  JSON.stringify(
    steps.map((s) => ({
      titleMk: s.titleMk,
      titleSq: s.titleSq,
      titleEn: s.titleEn,
      durationMin: s.durationMin.trim() === "" ? "" : Number(s.durationMin),
      eventType: s.eventType,
      forAll: s.forAll,
      forSides: s.forSides,
      forRoles: s.forRoles,
    })),
  );

/** `version` changes whenever the saved template changes (save or reset); the list then reloads from the server. */
export function TypicalDayEditor({
  startTime: savedStart,
  steps: savedSteps,
  custom,
  version,
}: {
  startTime: string;
  steps: TypicalDayStepRow[];
  custom: boolean;
  version: string;
}) {
  const t = useTranslations("admin.typicalDay");
  const ts = useTranslations("plan.schedule");
  const tg = useTranslations("plan.guests");
  const tev = useTranslations("plan.events.types");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [startTime, setStartTime] = useState(savedStart);
  const [steps, setSteps] = useState(() => savedSteps.map(toStep));
  const [syncedVersion, setSyncedVersion] = useState(version);
  const [state, submit, saving] = useFormAction(saveTypicalDayAction, {} as FormState);
  const [resetting, startReset] = useTransition();
  const [lastAction, setLastAction] = useState<"save" | "reset" | null>(null);
  const [dragUid, setDragUid] = useState<number | null>(null);
  // Step order at the last submit, so "steps.<i>" errors stay on the right step after reordering.
  const [submittedUids, setSubmittedUids] = useState<number[]>([]);
  const fe = state.fieldErrors ?? {};

  // New saved template from the server: show it.
  if (syncedVersion !== version) {
    setSyncedVersion(version);
    setStartTime(savedStart);
    setSteps(savedSteps.map(toStep));
  }

  const current = payload(steps);
  const dirty = startTime !== savedStart || current !== payload(savedSteps.map(toStep));
  const notice = dirty ? null : lastAction === "save" && state.ok ? t("saved") : lastAction === "reset" ? t("resetDone") : null;

  const validStart = /^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ? startTime : "00:00";
  const slots = timelineSlots(
    validStart,
    steps.map((s) => Math.max(0, Number(s.durationMin) || 0)),
  );
  const last = slots.at(-1);

  const update = (uid: number, patch: Partial<Step>) => setSteps((cur) => cur.map((s) => (s.uid === uid ? { ...s, ...patch } : s)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= steps.length || from === to) return;
    setSteps((cur) => {
      const next = [...cur];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it!);
      return next;
    });
  };
  const toggle = <T extends string>(list: T[], value: T, on: boolean) => (on ? [...list, value] : list.filter((v) => v !== value));

  const reset = () => {
    if (!confirm(t("confirmReset"))) return;
    startReset(async () => {
      if ((await resetTypicalDayAction()).ok) setLastAction("reset");
    });
  };

  const stepError = (uid: number, field: string) => {
    const key = fe[`steps.${submittedUids.indexOf(uid)}.${field}`];
    return key ? te(key) : undefined;
  };
  const hasStepErrors = Object.keys(fe).some((k) => k.startsWith("steps."));

  return (
    <form
      onSubmit={(e) => {
        setLastAction("save");
        setSubmittedUids(steps.map((s) => s.uid));
        submit(e);
      }}
      noValidate className="space-y-6">
      <input type="hidden" name="steps" value={current} />
      <Card className="flex flex-wrap items-end justify-between gap-4 p-5">
        <Field id="td-start" label={t("startTime")} error={fe.startTime && te(fe.startTime)} className="w-40">
          <Input id="td-start" name="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
        </Field>
        <div className="text-sm text-stone">
          <p>{custom ? t("custom") : t("builtIn")}</p>
          {last && (
            <p className="tabular-nums">
              {t("ends", { time: last.endLabel })}
              {last.endDayOffset > 0 && ` (${ts("nextDay")})`}
            </p>
          )}
        </div>
      </Card>

      {fe.steps && <Alert tone="error">{t("noSteps")}</Alert>}
      {hasStepErrors && <Alert tone="error">{t("stepsError")}</Alert>}

      <ol className="space-y-3">
        {steps.map((step, i) => {
          const slot = slots[i]!;
          const p = `td-${step.uid}`;
          return (
            <li
              key={step.uid}
              onDragOver={(e) => {
                if (dragUid !== null) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const from = steps.findIndex((s) => s.uid === dragUid);
                if (from >= 0) move(from, i);
                setDragUid(null);
              }}
              className={cn(dragUid === step.uid && "opacity-40")}
            >
              <Card className="flex gap-3 p-4 sm:gap-4">
                <div className="flex w-14 shrink-0 flex-col items-start gap-1 tabular-nums">
                  <span
                    draggable
                    onDragStart={(e) => {
                      setDragUid(step.uid);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDragUid(null)}
                    title={ts("drag")}
                    className="hidden cursor-grab text-stone sm:block"
                  >
                    <GripVertical aria-hidden className="size-4" />
                  </span>
                  <span className="font-semibold">{slot.label}</span>
                  {slot.dayOffset > 0 && (
                    <span className="rounded bg-amber-soft px-1.5 text-xs font-medium text-amber">{ts("nextDay")}</span>
                  )}
                </div>

                <fieldset className="min-w-0 flex-1 space-y-3">
                  <legend className="sr-only">{t("step", { n: i + 1 })}</legend>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field id={`${p}-mk`} label={t("titleMk")} error={stepError(step.uid, "titleMk")}>
                      <Input id={`${p}-mk`} value={step.titleMk} onChange={(e) => update(step.uid, { titleMk: e.target.value })} required />
                    </Field>
                    <Field id={`${p}-sq`} label={t("titleSq")} hint={step.titleSq ? undefined : t("fallbackHint")} error={stepError(step.uid, "titleSq")}>
                      <Input id={`${p}-sq`} value={step.titleSq} placeholder={step.titleMk} onChange={(e) => update(step.uid, { titleSq: e.target.value })} />
                    </Field>
                    <Field id={`${p}-en`} label={t("titleEn")} hint={step.titleEn ? undefined : t("fallbackHint")} error={stepError(step.uid, "titleEn")}>
                      <Input id={`${p}-en`} value={step.titleEn} placeholder={step.titleMk} onChange={(e) => update(step.uid, { titleEn: e.target.value })} />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
                    <Field id={`${p}-dur`} label={t("duration")} error={stepError(step.uid, "durationMin")}>
                      <Input
                        id={`${p}-dur`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={5}
                        value={step.durationMin}
                        onChange={(e) => update(step.uid, { durationMin: e.target.value })}
                        required
                      />
                    </Field>
                    <Field id={`${p}-ev`} label={t("eventType")} hint={t("eventHint")}>
                      <Select
                        id={`${p}-ev`}
                        value={step.eventType ?? ""}
                        onChange={(e) => update(step.uid, { eventType: (e.target.value || null) as EventType | null })}
                      >
                        <option value="">{t("noEvent")}</option>
                        {EVENT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {tev(type)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{t("whoFor")}</p>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={step.forAll} onChange={(e) => update(step.uid, { forAll: e.target.checked })} />
                        {ts("forAll")}
                      </label>
                      {SIDES.map((s) => (
                        <label key={s} className={cn("flex items-center gap-2 text-sm", step.forAll && "opacity-50")}>
                          <Checkbox
                            checked={step.forSides.includes(s)}
                            disabled={step.forAll}
                            onChange={(e) => update(step.uid, { forSides: toggle(step.forSides, s, e.target.checked) })}
                          />
                          {tg(`sides.${s}`)}
                        </label>
                      ))}
                    </div>
                    <div className={cn("flex flex-wrap gap-x-5 gap-y-2", step.forAll && "opacity-50")}>
                      <span className="w-full text-xs font-medium uppercase tracking-wide text-stone">{ts("forRoles")}</span>
                      {GUEST_ROLES.map((r) => (
                        <label key={r} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={step.forRoles.includes(r)}
                            disabled={step.forAll}
                            onChange={(e) => update(step.uid, { forRoles: toggle(step.forRoles, r, e.target.checked) })}
                          />
                          {tg(`roles.${r}`)}
                        </label>
                      ))}
                    </div>
                  </div>
                </fieldset>

                <div className="flex shrink-0 flex-col">
                  <Button type="button" variant="ghost" size="sm" aria-label={`${ts("moveUp")}: ${step.titleMk}`} title={ts("moveUp")} disabled={i === 0} onClick={() => move(i, i - 1)}>
                    <ArrowUp aria-hidden className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`${ts("moveDown")}: ${step.titleMk}`}
                    title={ts("moveDown")}
                    disabled={i === steps.length - 1}
                    onClick={() => move(i, i + 1)}
                  >
                    <ArrowDown aria-hidden className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`${t("deleteStep")}: ${step.titleMk}`}
                    title={t("deleteStep")}
                    onClick={() => setSteps((cur) => cur.filter((s) => s.uid !== step.uid))}
                  >
                    <Trash2 aria-hidden className="size-4 text-danger" />
                  </Button>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>

      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          setSteps((cur) => [
            ...cur,
            toStep(
              { titleMk: "", titleSq: null, titleEn: null, durationMin: 30, eventType: null, forAll: false, forSides: [], forRoles: [] },
              Math.max(-1, ...cur.map((s) => s.uid)) + 1,
            ),
          ])
        }
      >
        <Plus aria-hidden className="size-4" /> {t("addStep")}
      </Button>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-linen/95 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <Button type="submit" disabled={saving || resetting || !dirty}>
          {saving ? tc("saving") : t("save")}
        </Button>
        {custom && (
          <Button type="button" variant="danger" disabled={saving || resetting} onClick={reset}>
            <RotateCcw aria-hidden className="size-4" /> {t("reset")}
          </Button>
        )}
        <p className="text-sm text-stone" role="status">
          {dirty ? t("unsaved") : notice}
        </p>
      </div>
    </form>
  );
}
