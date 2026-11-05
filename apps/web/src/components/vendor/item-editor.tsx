"use client";

import { CURRENCIES, DRINKS_OPTIONS, EXTRA_UNITS } from "@svadba/shared";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {useEffect, useState, useTransition, type ReactNode} from "react";
import { deleteItemAction, saveItemAction, type ItemKind } from "@/actions/vendor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";

export type EditorItem = {
  id: string;
  title: string;
  /** Short summary lines shown under the title. */
  details: string[];
  /** Form defaults, all as strings. */
  values: Record<string, string>;
};

type Option = { id: string; name: string };

/** List of items of one kind with inline add / edit / delete. */
export function ItemEditor({
  kind,
  businessId,
  items,
  addLabel,
  currency,
  cities = [],
  isBand = false,
}: {
  kind: ItemKind;
  businessId: string;
  items: EditorItem[];
  addLabel: string;
  currency: string;
  cities?: Option[];
  isBand?: boolean;
}) {
  const t = useTranslations("vendor.prices");
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  const form = (item: EditorItem | null) => (
    <ItemForm
      key={item?.id ?? "new"}
      kind={kind}
      businessId={businessId}
      item={item}
      currency={currency}
      cities={cities}
      isBand={isBand}
      onDone={() => setEditing(null)}
    />
  );

  return (
    <div className="space-y-3">
      {items.length === 0 && editing !== "new" && <p className="text-sm text-stone">{t("empty")}</p>}
      {items.map((item) =>
        editing === item.id ? (
          <Card key={item.id} className="border-vranec/30 p-5">
            {form(item)}
          </Card>
        ) : (
          <Card key={item.id} className="flex items-start gap-4 p-4 sm:p-5">
            <div className="min-w-0 flex-1">
              <p className="font-medium break-words">{item.title}</p>
              {item.details.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-sm text-ink-soft">
                  {item.details.map((d, i) => (
                    <li key={i} className="break-words">
                      {d}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="sm" onClick={() => setEditing(item.id)} aria-label={`${t("edit")}: ${item.title}`}>
                <Pencil aria-hidden className="size-4" />
                <span className="hidden sm:inline">{t("edit")}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={deleting}
                aria-label={`${t("delete")}: ${item.title}`}
                onClick={() => {
                  if (confirm(t("confirmDelete", { name: item.title }))) {
                    startDelete(async () => void (await deleteItemAction(kind, businessId, item.id)));
                  }
                }}
              >
                <Trash2 aria-hidden className="size-4 text-danger" />
              </Button>
            </div>
          </Card>
        ),
      )}
      {editing === "new" ? (
        <Card className="border-vranec/30 p-5">{form(null)}</Card>
      ) : (
        <Button variant="secondary" onClick={() => setEditing("new")}>
          <Plus aria-hidden className="size-4" /> {addLabel}
        </Button>
      )}
    </div>
  );
}

function ItemForm({
  kind,
  businessId,
  item,
  currency,
  cities,
  isBand,
  onDone,
}: {
  kind: ItemKind;
  businessId: string;
  item: EditorItem | null;
  currency: string;
  cities: Option[];
  isBand: boolean;
  onDone: () => void;
}) {
  const t = useTranslations("vendor");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [state, action, pending] = useFormAction(
    saveItemAction.bind(null, kind, businessId, item?.id ?? null),
    {} as FormState,
  );
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  const fe = state.fieldErrors ?? {};
  const v = (name: string, fallback = "") => item?.values[name] ?? fallback;
  const p = (k: string) => `${item?.id ?? "new"}-${kind}-${k}`;

  const input = (name: string, label: string, props: Record<string, unknown> = {}) => (
    <Field id={p(name)} label={label} error={fe[name] && te(fe[name])}>
      <Input id={p(name)} name={name} defaultValue={v(name)} aria-invalid={!!fe[name]} {...props} />
    </Field>
  );
  const textarea = (name: string, label: string, hint?: string) => (
    <Field id={p(name)} label={label} hint={hint} error={fe[name] && te(fe[name])}>
      <textarea
        id={p(name)}
        name={name}
        rows={4}
        defaultValue={v(name)}
        className="block w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[15px] leading-relaxed focus:border-vranec focus:outline-none focus:ring-2 focus:ring-vranec/15"
      />
    </Field>
  );
  const money = (name: string, label: string) => (
    <div className="grid grid-cols-[1fr_7rem] gap-2">
      {input(name, label, { type: "number", inputMode: "numeric", min: 0, step: 1 })}
      <Field id={p("currency")} label={t("prices.currency")}>
        <Select id={p("currency")} name="currency" defaultValue={v("currency", currency)}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c === "EUR" ? "€" : "ден."}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
  const names = (
    <div className="grid gap-4 sm:grid-cols-3">
      {input("nameMk", t("prices.nameMk"), { required: true, lang: "mk" })}
      {input("nameSq", t("prices.nameSq"), { lang: "sq" })}
      {input("nameEn", t("prices.nameEn"), { lang: "en" })}
    </div>
  );
  const number = (name: string, label: string) => input(name, label, { type: "number", inputMode: "numeric", min: 0, step: 1 });

  let fields: ReactNode;
  switch (kind) {
    case "hall":
      fields = (
        <>
          {input("name", t("prices.hallName"), { required: true })}
          <div className="grid gap-4 sm:grid-cols-2">
            {number("capacityMin", t("prices.capacityMin"))}
            {number("capacityMax", t("prices.capacityMax"))}
          </div>
          {textarea("description", t("prices.hallDescription"))}
        </>
      );
      break;
    case "menu":
      fields = (
        <>
          {names}
          <div className="grid gap-4 sm:grid-cols-2">
            {money("pricePerPerson", t("prices.pricePerPerson"))}
            {number("minGuests", t("prices.minGuests"))}
          </div>
          {textarea("courses", t("prices.courses"), t("prices.coursesHint"))}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={p("drinks")} label={t("prices.drinks")}>
              <Select id={p("drinks")} name="drinks" defaultValue={v("drinks", "NONE")}>
                {DRINKS_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {t(`prices.drinksOptions.${d}`)}
                  </option>
                ))}
              </Select>
            </Field>
            {input("drinksNote", t("prices.drinksNote"))}
          </div>
        </>
      );
      break;
    case "extra":
      fields = (
        <>
          {names}
          <div className="grid gap-4 sm:grid-cols-2">
            {money("price", t("prices.price"))}
            <Field id={p("unit")} label={t("prices.unit")}>
              <Select id={p("unit")} name="unit" defaultValue={v("unit", "FIXED")}>
                {EXTRA_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {t(`prices.units.${u}`)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </>
      );
      break;
    case "package":
      fields = (
        <>
          {names}
          <div className="grid gap-4 sm:grid-cols-2">
            {money("price", t("prices.price"))}
            {number("hours", t("prices.hours"))}
            {isBand && number("members", t("prices.members"))}
            {number("extraHourPrice", t("prices.extraHourPrice"))}
          </div>
          {textarea("includes", t("prices.includes"), t("prices.includesHint"))}
        </>
      );
      break;
    case "travel":
      fields = (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={p("cityId")} label={t("travel.city")} error={fe.cityId && te(fe.cityId)}>
            <Select id={p("cityId")} name="cityId" defaultValue={v("cityId")}>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          {money("price", t("travel.fee"))}
        </div>
      );
      break;
    case "video":
      fields = input("url", t("photos.videoUrl"), { type: "url", placeholder: "https://www.youtube.com/watch?v=…" });
      break;
  }

  return (
    <form onSubmit={action} className="space-y-4" noValidate>
      {fields}
      {state.formError && state.formError !== "emailTaken" && <p className="text-sm text-danger">{te(state.formError)}</p>}
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
