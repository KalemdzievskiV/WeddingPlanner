"use client";

import { Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { deleteScheduleItemAction, saveScheduleItemAction } from "@/actions/plan-tasks";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";

export type ScheduleRow = { id: string; time: string; title: string; responsible: string | null; place: string | null };

export function PrintButton() {
  const t = useTranslations("plan.schedule");
  return (
    <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
      <Printer aria-hidden className="size-4" /> {t("print")}
    </Button>
  );
}

export function ScheduleManager({ eventId, items, editable }: { eventId: string; items: ScheduleRow[]; editable: boolean }) {
  const t = useTranslations("plan.schedule");
  const [editing, setEditing] = useState<string | null>(null);
  const [, start] = useTransition();

  return (
    <div className="space-y-3">
      {items.length === 0 && editing !== "new" ? (
        <p className="text-sm text-stone">{t("empty")}</p>
      ) : (
        <ol className="relative space-y-0 border-l-2 border-rosehip pl-5">
          {items.map((item) =>
            editing === item.id ? (
              <li key={item.id} className="py-3">
                <ItemForm eventId={eventId} item={item} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li key={item.id} className="group relative flex gap-4 py-2.5 break-inside-avoid">
                <span aria-hidden className="absolute -left-[27px] top-4 size-3 rounded-full border-2 border-vranec bg-surface" />
                <span className="w-14 shrink-0 font-semibold tabular-nums">{item.time}</span>
                <div className="min-w-0 flex-1">
                  <p>{item.title}</p>
                  {(item.responsible || item.place) && (
                    <p className="text-sm text-stone">{[item.responsible, item.place].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
                {editable && (
                  <div className="flex shrink-0 print:hidden">
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
            ),
          )}
        </ol>
      )}
      {editable &&
        (editing === "new" ? (
          <ItemForm eventId={eventId} item={null} onDone={() => setEditing(null)} />
        ) : (
          <Button variant="secondary" size="sm" className="print:hidden" onClick={() => setEditing("new")}>
            <Plus aria-hidden className="size-4" /> {t("addItem")}
          </Button>
        ))}
    </div>
  );
}

function ItemForm({ eventId, item, onDone }: { eventId: string; item: ScheduleRow | null; onDone: () => void }) {
  const t = useTranslations("plan.schedule");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [state, onSubmit, pending] = useFormAction(
    saveScheduleItemAction.bind(null, eventId, item?.id ?? null),
    {} as FormState,
  );
  const fe = state.fieldErrors ?? {};
  const p = `${eventId}-${item?.id ?? "new"}`;
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-vranec/30 bg-surface p-4 print:hidden" noValidate>
      <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
        <Field id={`${p}-time`} label={t("time")} error={fe.time && te(fe.time)}>
          <Input id={`${p}-time`} name="time" type="time" defaultValue={item?.time} required />
        </Field>
        <Field id={`${p}-title`} label={t("what")} error={fe.title && te(fe.title)}>
          <Input id={`${p}-title`} name="title" defaultValue={item?.title} required />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${p}-resp`} label={t("responsible")}>
          <Input id={`${p}-resp`} name="responsible" defaultValue={item?.responsible ?? ""} />
        </Field>
        <Field id={`${p}-place`} label={t("place")}>
          <Input id={`${p}-place`} name="place" defaultValue={item?.place ?? ""} />
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
