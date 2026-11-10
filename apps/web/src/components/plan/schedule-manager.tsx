"use client";

import { GUEST_ROLES, timelineSlots, type GuestRole } from "@svadba/shared";
import { ArrowDown, ArrowUp, CalendarPlus, GripVertical, MapPin, Pencil, Plus, Printer, Sparkles, Star, Trash2, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import {
  deleteScheduleDayAction,
  deleteScheduleItemAction,
  fillTypicalDayAction,
  reorderScheduleAction,
  saveScheduleDayAction,
  saveScheduleItemAction,
  setScheduleItemMainAction,
  startTimelineAction,
} from "@/actions/plan-schedule";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, inputClass, Select } from "@/components/ui/field";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";
import { cn } from "@/lib/utils";

type Side = "BRIDE" | "GROOM";
const SIDES: Side[] = ["BRIDE", "GROOM"];

export type ScheduleItemRow = {
  id: string;
  title: string;
  durationMin: number;
  responsible: string | null;
  place: string | null;
  eventId: string | null;
  isMain: boolean;
  forAll: boolean;
  forSides: Side[];
  forRoles: GuestRole[];
  guestIds: string[];
};
export type ScheduleDayRow = { id: string; date: string; dateLabel: string; startTime: string; items: ScheduleItemRow[] };
export type ScheduleEventOption = { id: string; name: string; place: string | null; hasPin: boolean };
export type ScheduleGuestOption = { id: string; name: string; household: string };

export function PrintButton() {
  const t = useTranslations("plan.schedule");
  return (
    <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
      <Printer aria-hidden className="size-4" /> {t("print")}
    </Button>
  );
}

export function ScheduleBoard({
  days,
  events,
  guests,
  editable,
}: {
  days: ScheduleDayRow[];
  events: ScheduleEventOption[];
  guests: ScheduleGuestOption[];
  editable: boolean;
}) {
  const t = useTranslations("plan.schedule");
  const [addingDay, setAddingDay] = useState(false);
  const [pending, start] = useTransition();

  if (days.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="mx-auto max-w-md text-ink-soft">{t("noDays")}</p>
        {editable && (
          <Button className="mt-5" disabled={pending} onClick={() => start(async () => void (await startTimelineAction()))}>
            <Plus aria-hidden className="size-4" /> {t("startDay")}
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {days.map((day) => (
        <DayCard key={day.id} day={day} events={events} guests={guests} editable={editable} />
      ))}
      {editable &&
        (addingDay ? (
          <Card className="p-5 print:hidden">
            <DayForm day={null} onDone={() => setAddingDay(false)} />
          </Card>
        ) : (
          <Button variant="secondary" className="print:hidden" onClick={() => setAddingDay(true)}>
            <CalendarPlus aria-hidden className="size-4" /> {t("addDay")}
          </Button>
        ))}
    </div>
  );
}

function DayCard({
  day,
  events,
  guests,
  editable,
}: {
  day: ScheduleDayRow;
  events: ScheduleEventOption[];
  guests: ScheduleGuestOption[];
  editable: boolean;
}) {
  const t = useTranslations("plan.schedule");
  const locale = useLocale();
  const [editing, setEditing] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [items, setOptimisticItems] = useOptimistic(day.items);
  const slots = timelineSlots(
    day.startTime,
    items.map((i) => i.durationMin),
  );
  const eventById = new Map(events.map((e) => [e.id, e]));

  const reorder = (next: ScheduleItemRow[]) =>
    start(async () => {
      setOptimisticItems(next);
      await reorderScheduleAction(
        day.id,
        next.map((i) => i.id),
      );
    });
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it!);
    reorder(next);
  };
  const toggleMain = (item: ScheduleItemRow) =>
    start(async () => {
      setOptimisticItems(items.map((i) => (i.id === item.id ? { ...i, isMain: !i.isMain } : i)));
      await setScheduleItemMainAction(item.id, !item.isMain);
    });
  const anyMain = items.some((i) => i.isMain);

  return (
    <Card className="break-inside-avoid p-6 print:border-0 print:p-0 print:shadow-none">
      {editingDay ? (
        <div className="mb-5 print:hidden">
          <DayForm day={day} onDone={() => setEditingDay(false)} />
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tabular-nums">{day.dateLabel || t("undated")}</h2>
            <p className="text-sm text-stone tabular-nums">
              {t("startTime")} {day.startTime}
            </p>
          </div>
          {editable && (
            <div className="flex flex-wrap gap-1 print:hidden">
              <Button
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => {
                  if (items.length && !confirm(t("confirmFillReplace"))) return;
                  start(async () => void (await fillTypicalDayAction(day.id, locale)));
                }}
              >
                <Sparkles aria-hidden className="size-4" /> {t("fillTypical")}
              </Button>
              <Button variant="ghost" size="sm" aria-label={t("editDay")} title={t("editDay")} onClick={() => setEditingDay(true)}>
                <Pencil aria-hidden className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t("deleteDay")}
                title={t("deleteDay")}
                disabled={pending}
                onClick={() => {
                  if (confirm(t("confirmDeleteDay"))) start(async () => void (await deleteScheduleDayAction(day.id)));
                }}
              >
                <Trash2 aria-hidden className="size-4 text-danger" />
              </Button>
            </div>
          )}
        </div>
      )}

      {editable && items.length > 0 && (
        <p className="mb-3 flex items-center gap-1.5 text-sm text-stone print:hidden">
          <Star aria-hidden className="size-3.5 shrink-0 fill-vranec text-vranec" />
          {anyMain ? t("mainHintSome") : t("mainHint")}
        </p>
      )}
      {items.length === 0 && editing !== "new" ? (
        <p className="text-sm text-stone">{t("empty")}</p>
      ) : (
        <ol className="divide-y divide-line border-y border-line">
          {items.map((item, idx) => {
            const slot = slots[idx]!;
            const ev = item.eventId ? eventById.get(item.eventId) : undefined;
            const place = item.place ?? ev?.place ?? null;
            if (editing === item.id)
              return (
                <li key={item.id} className="py-4">
                  <ItemForm dayId={day.id} item={item} events={events} guests={guests} onDone={() => setEditing(null)} />
                </li>
              );
            return (
              <li
                key={item.id}
                draggable={editable}
                onDragStart={(e) => {
                  setDragId(item.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  if (dragId) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = items.findIndex((i) => i.id === dragId);
                  if (from >= 0) move(from, idx);
                  setDragId(null);
                }}
                onDragEnd={() => setDragId(null)}
                className={cn("flex items-start gap-3 py-3 break-inside-avoid", dragId === item.id && "opacity-40")}
              >
                {editable && (
                  <span title={t("drag")} className="hidden shrink-0 cursor-grab pt-0.5 text-stone sm:block print:hidden">
                    <GripVertical aria-hidden className="size-4" />
                  </span>
                )}
                <div className="w-16 shrink-0 tabular-nums">
                  <p className="font-semibold">{slot.label}</p>
                  {slot.dayOffset > 0 && (
                    <p className="mt-0.5 inline-block rounded bg-amber-soft px-1.5 text-xs font-medium text-amber">{t("nextDay")}</p>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-medium">
                    {item.isMain && <Star aria-label={t("mainMark")} className="size-4 shrink-0 fill-vranec text-vranec" />}
                    {item.title}
                  </p>
                  <p className="text-sm text-stone tabular-nums">
                    {t("minutes", { count: item.durationMin })} · {t("until", { time: slot.endLabel })}
                    {slot.endDayOffset > slot.dayOffset && ` (${t("nextDay")})`}
                  </p>
                  {(ev || place) && (
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-soft">
                      {ev?.hasPin && <MapPin aria-hidden className="size-3.5 shrink-0 text-vranec" />}
                      {[ev?.name, place].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {item.responsible && <p className="text-sm text-stone">{item.responsible}</p>}
                  <Audience item={item} />
                </div>
                {editable && (
                  <div className="flex shrink-0 flex-wrap justify-end print:hidden">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-pressed={item.isMain}
                      aria-label={`${t(item.isMain ? "unmarkMain" : "markMain")}: ${item.title}`}
                      title={t(item.isMain ? "unmarkMain" : "markMain")}
                      disabled={pending}
                      onClick={() => toggleMain(item)}
                    >
                      <Star aria-hidden className={cn("size-4", item.isMain ? "fill-vranec text-vranec" : "text-stone")} />
                    </Button>
                    <Button variant="ghost" size="sm" aria-label={`${t("moveUp")}: ${item.title}`} title={t("moveUp")} disabled={idx === 0 || pending} onClick={() => move(idx, idx - 1)}>
                      <ArrowUp aria-hidden className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`${t("moveDown")}: ${item.title}`}
                      title={t("moveDown")}
                      disabled={idx === items.length - 1 || pending}
                      onClick={() => move(idx, idx + 1)}
                    >
                      <ArrowDown aria-hidden className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm" aria-label={`${t("edit")}: ${item.title}`} onClick={() => setEditing(item.id)}>
                      <Pencil aria-hidden className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`${t("delete")}: ${item.title}`}
                      onClick={() => {
                        if (confirm(t("confirmDelete", { name: item.title }))) start(async () => void (await deleteScheduleItemAction(item.id)));
                      }}
                    >
                      <Trash2 aria-hidden className="size-4 text-danger" />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {editable && (
        <div className="mt-4 print:hidden">
          {editing === "new" ? (
            <ItemForm dayId={day.id} item={null} events={events} guests={guests} onDone={() => setEditing(null)} />
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setEditing("new")}>
              <Plus aria-hidden className="size-4" /> {t("addItem")}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

/** "Everyone" or a short list: sides, roles, number of picked guests. */
function Audience({ item }: { item: ScheduleItemRow }) {
  const t = useTranslations("plan.schedule");
  const tg = useTranslations("plan.guests");
  const parts = item.forAll
    ? [t("forAll")]
    : [
        ...item.forSides.map((s) => tg(`sides.${s}`)),
        ...item.forRoles.map((r) => tg(`roles.${r}`)),
        ...(item.guestIds.length ? [t("picked", { count: item.guestIds.length })] : []),
      ];
  if (!parts.length) return null;
  return (
    <p className="mt-1 flex items-start gap-1 text-xs text-stone">
      <Users aria-hidden className="mt-px size-3.5 shrink-0" />
      <span>{parts.join(", ")}</span>
    </p>
  );
}

function DayForm({ day, onDone }: { day: ScheduleDayRow | null; onDone: () => void }) {
  const t = useTranslations("plan.schedule");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [state, onSubmit, pending] = useFormAction(saveScheduleDayAction.bind(null, day?.id ?? null), {} as FormState);
  const fe = state.fieldErrors ?? {};
  const p = `day-${day?.id ?? "new"}`;
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);
  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-[12rem_8rem]">
        <Field id={`${p}-date`} label={t("dayDate")} error={fe.date && te(fe.date)}>
          <Input id={`${p}-date`} name="date" type="date" defaultValue={day?.date} />
        </Field>
        <Field id={`${p}-start`} label={t("startTime")} error={fe.startTime && te(fe.startTime)}>
          <Input id={`${p}-start`} name="startTime" type="time" defaultValue={day?.startTime ?? "10:00"} required />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? tc("saving") : tc("save")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}

function ItemForm({
  dayId,
  item,
  events,
  guests,
  onDone,
}: {
  dayId: string;
  item: ScheduleItemRow | null;
  events: ScheduleEventOption[];
  guests: ScheduleGuestOption[];
  onDone: () => void;
}) {
  const t = useTranslations("plan.schedule");
  const tg = useTranslations("plan.guests");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [state, onSubmit, pending] = useFormAction(saveScheduleItemAction.bind(null, dayId, item?.id ?? null), {} as FormState);
  const [forAll, setForAll] = useState(item?.forAll ?? false);
  const [picked, setPicked] = useState<string[]>(item?.guestIds ?? []);
  const [q, setQ] = useState("");
  const fe = state.fieldErrors ?? {};
  const p = `${dayId}-${item?.id ?? "new"}`;
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  const needle = q.trim().toLowerCase();
  const pickedSet = new Set(picked);
  const shown = needle
    ? guests.filter((g) => g.name.toLowerCase().includes(needle) || g.household.toLowerCase().includes(needle)).slice(0, 30)
    : guests.filter((g) => pickedSet.has(g.id));

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-vranec/30 bg-surface p-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <Field id={`${p}-title`} label={t("what")} error={fe.title && te(fe.title)}>
          <Input id={`${p}-title`} name="title" defaultValue={item?.title} required />
        </Field>
        <Field id={`${p}-dur`} label={t("duration")} error={fe.durationMin && te(fe.durationMin)}>
          <Input id={`${p}-dur`} name="durationMin" type="number" inputMode="numeric" min={0} step={5} defaultValue={item?.durationMin ?? 30} required />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${p}-event`} label={t("event")}>
          <Select id={`${p}-event`} name="eventId" defaultValue={item?.eventId ?? ""}>
            <option value="">{t("noEvent")}</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`${p}-place`} label={t("place")} hint={t("placeHint")}>
          <Input id={`${p}-place`} name="place" defaultValue={item?.place ?? ""} />
        </Field>
        <Field id={`${p}-resp`} label={t("responsible")}>
          <Input id={`${p}-resp`} name="responsible" defaultValue={item?.responsible ?? ""} />
        </Field>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox name="isMain" defaultChecked={item?.isMain ?? false} className="mt-0.5" />
        <span>
          <span className="font-medium">{t("isMain")}</span>
          <span className="block text-stone">{t("isMainHint")}</span>
        </span>
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">{t("whoFor")}</legend>
        <p className="text-sm text-stone">{t("whoForHint")}</p>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="forAll" checked={forAll} onChange={(e) => setForAll(e.target.checked)} />
          {t("forAll")}
        </label>
        <div className={cn("space-y-3", forAll && "pointer-events-none opacity-50")} aria-disabled={forAll}>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {SIDES.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <Checkbox name="forSides" value={s} defaultChecked={item?.forSides.includes(s)} disabled={forAll} />
                {tg(`sides.${s}`)}
              </label>
            ))}
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-stone">{t("forRoles")}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {GUEST_ROLES.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm">
                  <Checkbox name="forRoles" value={r} defaultChecked={item?.forRoles.includes(r)} disabled={forAll} />
                  {tg(`roles.${r}`)}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-stone">
              {t("forGuests")} {picked.length > 0 && <span className="normal-case tracking-normal">· {t("picked", { count: picked.length })}</span>}
            </p>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("searchGuests")}
              aria-label={t("searchGuests")}
              disabled={forAll}
              className={cn(inputClass, "max-w-sm")}
            />
            {shown.length > 0 && (
              <ul className="mt-2 max-h-56 space-y-1 overflow-auto">
                {shown.map((g) => (
                  <li key={g.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={pickedSet.has(g.id)}
                        disabled={forAll}
                        onChange={(e) => setPicked((cur) => (e.target.checked ? [...cur, g.id] : cur.filter((id) => id !== g.id)))}
                      />
                      {g.name} <span className="text-stone">· {g.household}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {!forAll && picked.map((id) => <input key={id} type="hidden" name="guestIds" value={id} />)}
          </div>
        </div>
      </fieldset>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? tc("saving") : tc("save")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}
