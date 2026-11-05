"use client";

import { TASK_BUCKETS } from "@svadba/shared";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { deleteTaskAction, saveTaskAction, toggleTaskAction } from "@/actions/plan-tasks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";
import { cn } from "@/lib/utils";

export type TaskRow = {
  id: string;
  title: string;
  monthsBefore: number | null;
  dueDate: string;
  dueLabel: string;
  overdue: boolean;
  assignee: string | null;
  done: boolean;
};

const bucketKey = (n: number | null) =>
  n == null ? "bNone" : n === -1 ? "bAfter" : (`b${n}` as "b12" | "b11" | "b9" | "b7" | "b4" | "b2" | "b0");

export function ChecklistManager({
  tasks,
  editable,
  people,
  hasDate,
}: {
  tasks: TaskRow[];
  editable: boolean;
  people: string[];
  hasDate: boolean;
}) {
  const t = useTranslations("plan.checklist");
  const [showDone, setShowDone] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [done, setDone] = useState(() => Object.fromEntries(tasks.map((x) => [x.id, x.done])));
  const [, start] = useTransition();
  const doneCount = Object.values(done).filter(Boolean).length;
  const groups = [...TASK_BUCKETS, null].map((b) => ({
    bucket: b,
    tasks: tasks.filter((x) => x.monthsBefore === b && (showDone || !done[x.id])),
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-56 flex-1">
          <p className="font-semibold tabular-nums">{t("progress", { done: doneCount, total: tasks.length })}</p>
          <div className="mt-2 h-2 max-w-sm overflow-hidden rounded-full bg-ink/[0.07]">
            <div className="h-full rounded-full bg-olive" style={{ width: `${tasks.length ? (doneCount / tasks.length) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setShowDone((v) => !v)}>
            {showDone ? t("hideDone") : t("showDone", { count: doneCount })}
          </Button>
          {editable && (
            <Button onClick={() => setEditing("new")}>
              <Plus aria-hidden className="size-4" /> {t("addTask")}
            </Button>
          )}
        </div>
      </div>
      {!hasDate && <p className="text-sm text-stone">{t("setDate")}</p>}
      {editing === "new" && (
        <Card className="border-vranec/30 p-5">
          <TaskForm task={null} people={people} onDone={() => setEditing(null)} />
        </Card>
      )}

      {groups
        .filter((g) => g.tasks.length > 0)
        .map((g) => (
          <section key={String(g.bucket)}>
            <h2 className="mb-2 font-display text-lg">{t(`buckets.${bucketKey(g.bucket)}`)}</h2>
            <Card className="divide-y divide-line">
              {g.tasks.map((task) =>
                editing === task.id ? (
                  <div key={task.id} className="p-4">
                    <TaskForm task={task} people={people} onDone={() => setEditing(null)} />
                  </div>
                ) : (
                  <div key={task.id} className="flex items-start gap-3 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={!!done[task.id]}
                      disabled={!editable}
                      aria-label={task.title}
                      onChange={(e) => {
                        const value = e.target.checked;
                        setDone((d) => ({ ...d, [task.id]: value }));
                        start(async () => void (await toggleTaskAction(task.id, value)));
                      }}
                      className="mt-0.5 size-5 shrink-0 rounded accent-olive"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-[15px]", done[task.id] && "text-stone line-through")}>{task.title}</p>
                      <p className="flex flex-wrap gap-x-1.5 text-sm text-stone">
                        {task.assignee && <span>{task.assignee}</span>}
                        {task.assignee && task.dueLabel && !done[task.id] && <span aria-hidden>·</span>}
                        {task.dueLabel && !done[task.id] && (
                          <span className={cn(task.overdue && "font-medium text-danger")}>
                            {task.overdue ? `${t("overdue")} · ${task.dueLabel}` : t("due", { date: task.dueLabel })}
                          </span>
                        )}
                      </p>
                    </div>
                    {editable && (
                      <div className="flex shrink-0">
                        <Button variant="ghost" size="sm" aria-label={`${t("edit")}: ${task.title}`} onClick={() => setEditing(task.id)}>
                          <Pencil aria-hidden className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`${t("delete")}: ${task.title}`}
                          onClick={() => {
                            if (confirm(t("confirmDelete", { name: task.title }))) start(async () => void (await deleteTaskAction(task.id)));
                          }}
                        >
                          <Trash2 aria-hidden className="size-4 text-danger" />
                        </Button>
                      </div>
                    )}
                  </div>
                ),
              )}
            </Card>
          </section>
        ))}
    </div>
  );
}

function TaskForm({ task, people, onDone }: { task: TaskRow | null; people: string[]; onDone: () => void }) {
  const t = useTranslations("plan.checklist");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [state, onSubmit, pending] = useFormAction(saveTaskAction.bind(null, task?.id ?? null), {} as FormState);
  const fe = state.fieldErrors ?? {};
  const p = task?.id ?? "new-task";
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field id={`${p}-title`} label={t("taskTitle")} error={fe.title && te(fe.title)}>
        <Input id={`${p}-title`} name="title" defaultValue={task?.title} aria-invalid={!!fe.title} autoFocus />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id={`${p}-when`} label={t("when")}>
          <Select id={`${p}-when`} name="monthsBefore" defaultValue={task?.monthsBefore?.toString() ?? ""}>
            {TASK_BUCKETS.map((b) => (
              <option key={b} value={b}>
                {t(`buckets.${bucketKey(b)}`)}
              </option>
            ))}
            <option value="">{t("buckets.bNone")}</option>
          </Select>
        </Field>
        <Field id={`${p}-due`} label={t("dueDate")} error={fe.dueDate && te(fe.dueDate)}>
          <Input id={`${p}-due`} name="dueDate" type="date" defaultValue={task?.dueDate} />
        </Field>
        <Field id={`${p}-assignee`} label={t("assignee")}>
          <Input id={`${p}-assignee`} name="assignee" defaultValue={task?.assignee ?? ""} list={`${p}-people`} placeholder={t("assigneePlaceholder")} />
          <datalist id={`${p}-people`}>
            {people.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Field>
      </div>
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
