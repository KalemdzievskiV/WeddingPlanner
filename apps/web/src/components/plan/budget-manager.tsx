"use client";

import { COST_TYPES, CURRENCIES, PAYERS, PAYMENT_KINDS, type Currency, type Locale, type Payer } from "@svadba/shared";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import {
  deleteCategoryAction,
  deleteExpenseAction,
  deletePaymentAction,
  saveCategoryAction,
  saveExpenseAction,
  savePaymentAction,
  setPaymentPaidAction,
} from "@/actions/plan-budget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { formatDate, formatMoney } from "@/lib/format";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";
import { cn } from "@/lib/utils";

export type PaymentRow = {
  id: string;
  kind: (typeof PAYMENT_KINDS)[number];
  amount: number;
  currency: Currency;
  dueDate: string;
  paidAt: string;
};
export type ExpenseRow = {
  id: string;
  categoryId: string;
  name: string;
  costType: "FIXED" | "PER_PERSON";
  amount: number;
  childPrice: number | null;
  currency: Currency;
  eventId: string | null;
  guestsOverride: number | null;
  payer: Payer;
  notes: string | null;
  plannedTotal: number;
  plannedConv: number;
  people: number | null;
  usingEstimate: boolean;
  vendorName: string | null;
  payments: PaymentRow[];
};
export type CategoryRow = { id: string; name: string; planned: number; expenses: ExpenseRow[] };

type Props = {
  currency: Currency;
  total: number | null;
  planned: number;
  paid: number;
  byPayer: Record<Payer, { planned: number; paid: number }>;
  categories: CategoryRow[];
  events: { id: string; name: string }[];
  today: string;
  editable: boolean;
};

export function BudgetManager(props: Props) {
  const t = useTranslations("plan.budget");
  const locale = useLocale() as Locale;
  const m = (n: number, c: Currency = props.currency) => formatMoney(n, c, locale);
  const [addingCategory, setAddingCategory] = useState(false);
  const diff = props.total != null ? props.total - props.planned : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("total")} value={props.total != null ? m(props.total) : "—"} hint={props.total == null ? t("noTotal") : undefined} />
        <Stat
          label={t("planned")}
          value={m(props.planned)}
          hint={diff != null ? (diff < 0 ? t("overBudget", { amount: m(-diff) }) : t("underBudget", { amount: m(diff) })) : undefined}
          danger={diff != null && diff < 0}
        />
        <Stat label={t("paid")} value={m(props.paid)} />
        <Stat label={t("left")} value={m(Math.max(0, props.planned - props.paid))} />
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-display text-lg">{t("byPayer")}</h2>
        <ul className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {PAYERS.filter((p) => props.byPayer[p].planned > 0 || p === "COUPLE").map((p) => (
            <li key={p} className="flex justify-between gap-3 border-b border-line pb-2">
              <span>{t(`payers.${p}`)}</span>
              <span className="tabular-nums text-ink-soft">
                {m(props.byPayer[p].planned)} · <span className="text-olive">{m(props.byPayer[p].paid)}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-stone">{t("rate", { currency: props.currency === "EUR" ? "€" : "ден." })}</p>
      </Card>

      {props.categories.map((c) => (
        <CategoryCard key={c.id} category={c} {...props} />
      ))}

      {props.editable &&
        (addingCategory ? (
          <Card className="p-5">
            <CategoryForm category={null} onDone={() => setAddingCategory(false)} />
          </Card>
        ) : (
          <Button variant="secondary" onClick={() => setAddingCategory(true)}>
            <Plus aria-hidden className="size-4" /> {t("addCategory")}
          </Button>
        ))}
    </div>
  );
}

function Stat({ label, value, hint, danger }: { label: string; value: string; hint?: string; danger?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-stone">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className={cn("mt-0.5 text-xs", danger ? "font-medium text-danger" : "text-stone")}>{hint}</p>}
    </Card>
  );
}

function CategoryCard({ category: c, ...props }: { category: CategoryRow } & Props) {
  const t = useTranslations("plan.budget");
  const locale = useLocale() as Locale;
  const [renaming, setRenaming] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [, start] = useTransition();

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-linen/60 px-5 py-3">
        {renaming ? (
          <CategoryForm category={c} onDone={() => setRenaming(false)} />
        ) : (
          <h2 className="font-display text-lg">{c.name}</h2>
        )}
        <div className="flex items-center gap-1">
          <span className="mr-2 text-sm font-semibold tabular-nums">{formatMoney(c.planned, props.currency, locale)}</span>
          {props.editable && !renaming && (
            <>
              <Button variant="ghost" size="sm" aria-label={`${t("editCategory")}: ${c.name}`} onClick={() => setRenaming(true)}>
                <Pencil aria-hidden className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`${t("deleteCategory")}: ${c.name}`}
                onClick={() => {
                  if (confirm(t("confirmDeleteCategory", { name: c.name }))) start(async () => void (await deleteCategoryAction(c.id)));
                }}
              >
                <Trash2 aria-hidden className="size-4 text-danger" />
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="divide-y divide-line">
        {c.expenses.length === 0 && editing !== "new" && <p className="px-5 py-3 text-sm text-stone">{t("emptyCategory")}</p>}
        {c.expenses.map((e) =>
          editing === e.id ? (
            <div key={e.id} className="p-5">
              <ExpenseForm expense={e} categoryId={c.id} categories={props.categories} events={props.events} currency={props.currency} onDone={() => setEditing(null)} />
            </div>
          ) : (
            <ExpenseItem key={e.id} expense={e} {...props} onEdit={() => setEditing(e.id)} />
          ),
        )}
        {props.editable &&
          (editing === "new" ? (
            <div className="p-5">
              <ExpenseForm expense={null} categoryId={c.id} categories={props.categories} events={props.events} currency={props.currency} onDone={() => setEditing(null)} />
            </div>
          ) : (
            <div className="px-5 py-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing("new")}>
                <Plus aria-hidden className="size-4" /> {t("addExpense")}
              </Button>
            </div>
          ))}
      </div>
    </Card>
  );
}

function ExpenseItem({ expense: e, editable, currency, today, onEdit }: { expense: ExpenseRow; onEdit: () => void } & Props) {
  const t = useTranslations("plan.budget");
  const locale = useLocale() as Locale;
  const [addingPayment, setAddingPayment] = useState(false);
  const [, start] = useTransition();
  const m = (n: number, c: Currency) => formatMoney(n, c, locale);

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{e.name}</p>
          <p className="mt-0.5 flex flex-wrap gap-x-2 text-sm text-stone">
            <span>{t(`payers.${e.payer}`)}</span>
            {e.costType === "PER_PERSON" && e.people != null && (
              <span>· {t("perPerson", { people: e.people, price: m(e.amount, e.currency) })}</span>
            )}
            {e.usingEstimate && <span className="text-amber">· {t("usingEstimate")}</span>}
            {e.vendorName && <span>· {t("fromVendor", { name: e.vendorName })}</span>}
          </p>
          {e.notes && <p className="mt-1 text-sm text-ink-soft">{e.notes}</p>}
        </div>
        <div className="text-right">
          <p className="font-semibold tabular-nums">{m(e.plannedTotal, e.currency)}</p>
          {e.currency !== currency && <p className="text-xs text-stone tabular-nums">≈ {m(e.plannedConv, currency)}</p>}
        </div>
        {editable && (
          <div className="flex">
            <Button variant="ghost" size="sm" aria-label={`${t("edit")}: ${e.name}`} onClick={onEdit}>
              <Pencil aria-hidden className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`${t("delete")}: ${e.name}`}
              onClick={() => {
                if (confirm(t("confirmDelete", { name: e.name }))) start(async () => void (await deleteExpenseAction(e.id)));
              }}
            >
              <Trash2 aria-hidden className="size-4 text-danger" />
            </Button>
          </div>
        )}
      </div>

      {(e.payments.length > 0 || addingPayment) && (
        <ul className="mt-3 space-y-1.5 border-l-2 border-line pl-3">
          {e.payments.map((p) => {
            const overdue = !p.paidAt && p.dueDate && p.dueDate < today;
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="min-w-28">{t(`paymentKinds.${p.kind}`)}</span>
                <span className="font-medium tabular-nums">{m(p.amount, p.currency)}</span>
                {p.paidAt ? (
                  <Badge tone="success">{t("paidOn", { date: formatDate(p.paidAt) })}</Badge>
                ) : p.dueDate ? (
                  <Badge tone={overdue ? "accent" : "warning"}>
                    {overdue ? `${t("overdue")} · ${formatDate(p.dueDate)}` : t("dueOn", { date: formatDate(p.dueDate) })}
                  </Badge>
                ) : null}
                {editable && (
                  <span className="ml-auto flex items-center">
                    <Button variant="ghost" size="sm" onClick={() => start(async () => void (await setPaymentPaidAction(p.id, !p.paidAt)))}>
                      {!p.paidAt && <Check aria-hidden className="size-4" />}
                      {p.paidAt ? t("markUnpaid") : t("markPaid")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t("delete")}
                      onClick={() => start(async () => void (await deletePaymentAction(p.id)))}
                    >
                      <Trash2 aria-hidden className="size-4 text-danger" />
                    </Button>
                  </span>
                )}
              </li>
            );
          })}
          {addingPayment && (
            <li>
              <PaymentForm expenseId={e.id} currency={e.currency} onDone={() => setAddingPayment(false)} />
            </li>
          )}
        </ul>
      )}
      {editable && !addingPayment && (
        <Button variant="ghost" size="sm" className="mt-1 -ml-3" onClick={() => setAddingPayment(true)}>
          <Plus aria-hidden className="size-4" /> {t("addPayment")}
        </Button>
      )}
    </div>
  );
}

function useDone(state: FormState, onDone: () => void) {
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);
}

function CategoryForm({ category, onDone }: { category: CategoryRow | null; onDone: () => void }) {
  const t = useTranslations("plan.budget");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [state, onSubmit, pending] = useFormAction(saveCategoryAction.bind(null, category?.id ?? null), {} as FormState);
  useDone(state, onDone);
  const id = `cat-${category?.id ?? "new"}`;
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2" noValidate>
      <div>
        <label htmlFor={id} className="sr-only">
          {t("categoryName")}
        </label>
        <Input id={id} name="name" defaultValue={category?.name} placeholder={t("categoryName")} autoFocus aria-invalid={!!state.fieldErrors?.name} />
        {state.fieldErrors?.name && <p className="mt-1 text-sm text-danger">{te(state.fieldErrors.name)}</p>}
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {tc("save")}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone}>
        {tc("cancel")}
      </Button>
    </form>
  );
}

function ExpenseForm({
  expense,
  categoryId,
  categories,
  events,
  currency,
  onDone,
}: {
  expense: ExpenseRow | null;
  categoryId: string;
  categories: CategoryRow[];
  events: { id: string; name: string }[];
  currency: Currency;
  onDone: () => void;
}) {
  const t = useTranslations("plan.budget");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [state, onSubmit, pending] = useFormAction(saveExpenseAction.bind(null, expense?.id ?? null), {} as FormState);
  const [costType, setCostType] = useState(expense?.costType ?? "FIXED");
  useDone(state, onDone);
  const fe = state.fieldErrors ?? {};
  const p = `exp-${expense?.id ?? `new-${categoryId}`}`;
  const num = { type: "number", inputMode: "numeric" as const, min: 0, step: 1 };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${p}-name`} label={t("expenseName")} error={fe.name && te(fe.name)}>
          <Input id={`${p}-name`} name="name" defaultValue={expense?.name} autoFocus />
        </Field>
        <Field id={`${p}-cat`} label={t("category")}>
          <Select id={`${p}-cat`} name="categoryId" defaultValue={expense?.categoryId ?? categoryId}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_7rem]">
        <Field id={`${p}-type`} label={t("costType")}>
          <Select id={`${p}-type`} name="costType" value={costType} onChange={(e) => setCostType(e.target.value as typeof costType)}>
            {COST_TYPES.map((c) => (
              <option key={c} value={c}>
                {t(`costTypes.${c}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`${p}-amount`} label={costType === "PER_PERSON" ? t("pricePerAdult") : t("amount")} error={fe.amount && te(fe.amount)}>
          <Input id={`${p}-amount`} name="amount" {...num} defaultValue={expense?.amount} />
        </Field>
        <Field id={`${p}-cur`} label={t("currency")}>
          <Select id={`${p}-cur`} name="currency" defaultValue={expense?.currency ?? currency}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c === "EUR" ? "€" : "ден."}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {costType === "PER_PERSON" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id={`${p}-child`} label={t("childPrice")}>
            <Input id={`${p}-child`} name="childPrice" {...num} defaultValue={expense?.childPrice ?? ""} />
          </Field>
          <Field id={`${p}-event`} label={t("countGuestsOf")}>
            <Select id={`${p}-event`} name="eventId" defaultValue={expense?.eventId ?? events[0]?.id ?? ""}>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field id={`${p}-override`} label={t("guestsOverride")} hint={t("guestsOverrideHint")}>
            <Input id={`${p}-override`} name="guestsOverride" {...num} defaultValue={expense?.guestsOverride ?? ""} />
          </Field>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${p}-payer`} label={t("payer")}>
          <Select id={`${p}-payer`} name="payer" defaultValue={expense?.payer ?? "COUPLE"}>
            {PAYERS.map((x) => (
              <option key={x} value={x}>
                {t(`payers.${x}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`${p}-notes`} label={t("notes")}>
          <Input id={`${p}-notes`} name="notes" defaultValue={expense?.notes ?? ""} />
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

function PaymentForm({ expenseId, currency, onDone }: { expenseId: string; currency: Currency; onDone: () => void }) {
  const t = useTranslations("plan.budget");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [state, onSubmit, pending] = useFormAction(savePaymentAction.bind(null, expenseId, null), {} as FormState);
  useDone(state, onDone);
  const fe = state.fieldErrors ?? {};
  const p = `pay-${expenseId}`;
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-vranec/30 bg-surface p-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_6rem]">
        <Field id={`${p}-kind`} label={t("payments")}>
          <Select id={`${p}-kind`} name="kind" defaultValue="DEPOSIT">
            {PAYMENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`paymentKinds.${k}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`${p}-amount`} label={t("amount")} error={fe.amount && te(fe.amount)}>
          <Input id={`${p}-amount`} name="amount" type="number" inputMode="numeric" min={0} autoFocus />
        </Field>
        <Field id={`${p}-cur`} label={t("currency")}>
          <Select id={`${p}-cur`} name="currency" defaultValue={currency}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c === "EUR" ? "€" : "ден."}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${p}-due`} label={t("dueDate")}>
          <Input id={`${p}-due`} name="dueDate" type="date" />
        </Field>
        <Field id={`${p}-paid`} label={t("paidAt")}>
          <Input id={`${p}-paid`} name="paidAt" type="date" />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {tc("save")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}
