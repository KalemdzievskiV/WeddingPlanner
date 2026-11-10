"use client";

import { EVENT_TYPES, type EventType } from "@svadba/shared";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { deleteEventAction, saveEventAction } from "@/actions/plan-wedding";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";

// MapLibre is heavy: load it only when an event form opens.
const MapView = dynamic(() => import("@/components/map-view").then((m) => m.MapView), { ssr: false });

export type EventRow = {
  id: string;
  type: EventType;
  name: string | null;
  displayName: string;
  date: string;
  dateLabel: string;
  time: string | null;
  place: string | null;
  lat: number | null;
  lng: number | null;
  hasSeating: boolean;
};

export function EventsEditor({ events, editable }: { events: EventRow[]; editable: boolean }) {
  const t = useTranslations("plan.events");
  const te = useTranslations("errors");
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-line border-y border-line">
        {events.map((e) =>
          editing === e.id ? (
            <li key={e.id} className="py-4">
              <EventForm event={e} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={e.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-medium">
                  {e.displayName}
                  {e.lat != null && <MapPin aria-label={t("pinSet")} className="size-3.5 text-vranec" />}
                </p>
                <p className="text-sm text-stone tabular-nums">
                  {[e.dateLabel || t("noDate"), e.time, e.place].filter(Boolean).join(" · ")}
                </p>
              </div>
              {editable && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(e.id)} aria-label={`${t("type")}: ${e.displayName}`}>
                    <Pencil aria-hidden className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    aria-label={`${t("delete")}: ${e.displayName}`}
                    onClick={() => {
                      if (!confirm(t("confirmDelete", { name: e.displayName }))) return;
                      start(async () => {
                        const res = await deleteEventAction(e.id);
                        setError(res.formError && res.formError !== "emailTaken" ? te(res.formError) : null);
                      });
                    }}
                  >
                    <Trash2 aria-hidden className="size-4 text-danger" />
                  </Button>
                </div>
              )}
            </li>
          ),
        )}
      </ul>
      {error && <p className="text-sm text-danger">{error}</p>}
      {editable &&
        (editing === "new" ? (
          <EventForm event={null} onDone={() => setEditing(null)} />
        ) : (
          <Button variant="secondary" onClick={() => setEditing("new")}>
            <Plus aria-hidden className="size-4" /> {t("add")}
          </Button>
        ))}
    </div>
  );
}

function EventForm({ event, onDone }: { event: EventRow | null; onDone: () => void }) {
  const t = useTranslations("plan.events");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [state, onSubmit, pending] = useFormAction(saveEventAction.bind(null, event?.id ?? null), {} as FormState);
  const [type, setType] = useState<EventType>(event?.type ?? "ENGAGEMENT");
  const [point, setPoint] = useState(event?.lat != null && event.lng != null ? { lat: event.lat, lng: event.lng } : null);
  const fe = state.fieldErrors ?? {};
  const p = event?.id ?? "new";
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${p}-type`} label={t("type")}>
          <Select id={`${p}-type`} name="type" value={type} onChange={(e) => setType(e.target.value as EventType)}>
            {EVENT_TYPES.map((x) => (
              <option key={x} value={x}>
                {t(`types.${x}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`${p}-name`} label={t("name")} hint={t("nameHint")} error={fe.name && te(fe.name)}>
          <Input id={`${p}-name`} name="name" defaultValue={event?.name ?? ""} required={type === "CUSTOM"} />
        </Field>
        <Field id={`${p}-date`} label={t("date")} error={fe.date && te(fe.date)}>
          <Input id={`${p}-date`} name="date" type="date" defaultValue={event?.date} />
        </Field>
        <Field id={`${p}-time`} label={t("time")} error={fe.time && te(fe.time)}>
          <Input id={`${p}-time`} name="time" type="time" defaultValue={event?.time ?? ""} />
        </Field>
      </div>
      <Field id={`${p}-place`} label={t("place")}>
        <Input id={`${p}-place`} name="place" defaultValue={event?.place ?? ""} />
      </Field>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium">{t("pin")}</p>
          {point && (
            <button type="button" onClick={() => setPoint(null)} className="text-sm text-vranec hover:underline">
              {t("pinClear")}
            </button>
          )}
        </div>
        <MapView value={point} onChange={setPoint} label={t("pin")} className="h-64" />
        <p className="text-sm text-stone">{t("pinHint")}</p>
        <input type="hidden" name="lat" value={point?.lat ?? ""} />
        <input type="hidden" name="lng" value={point?.lng ?? ""} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="hasSeating" defaultChecked={event?.hasSeating ?? type === "RECEPTION"} />
        {t("hasSeating")}
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? tc("saving") : tc("save")}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}
