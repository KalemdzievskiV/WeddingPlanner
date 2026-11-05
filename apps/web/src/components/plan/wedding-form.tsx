"use client";

import { CURRENCIES } from "@svadba/shared";
import { useLocale, useTranslations } from "next-intl";
import { createWeddingAction, updateWeddingAction } from "@/actions/plan-wedding";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";

export type WeddingValues = {
  partner1: string;
  partner2: string;
  date: string;
  cityId: string;
  estimatedGuests: string;
  budgetTotal: string;
  currency: string;
};

/** Setup wizard (mode "create") and wedding details in Settings (mode "edit"). */
export function WeddingForm({
  mode,
  values,
  cities,
}: {
  mode: "create" | "edit";
  values?: WeddingValues;
  cities: { id: string; name: string }[];
}) {
  const t = useTranslations("plan.setup");
  const tc = useTranslations("common");
  const ts = useTranslations("plan.settings");
  const te = useTranslations("errors");
  const locale = useLocale();
  const [state, onSubmit, pending] = useFormAction(
    mode === "create" ? createWeddingAction : updateWeddingAction,
    {} as FormState,
  );
  const fe = state.fieldErrors ?? {};
  const err = (k: string) => (fe[k] ? te(fe[k]) : undefined);
  const v = values;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {state.ok && <Alert tone="success">{ts("saved")}</Alert>}
      {state.formError && state.formError !== "emailTaken" && <Alert tone="error">{te(state.formError)}</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="partner1" label={t("partner1")} error={err("partner1")}>
          <Input id="partner1" name="partner1" defaultValue={v?.partner1} required maxLength={60} aria-invalid={!!fe.partner1} />
        </Field>
        <Field id="partner2" label={t("partner2")} error={err("partner2")}>
          <Input id="partner2" name="partner2" defaultValue={v?.partner2} required maxLength={60} aria-invalid={!!fe.partner2} />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="date" label={t("date")} hint={t("dateHint")} error={err("date")}>
          <Input id="date" name="date" type="date" defaultValue={v?.date} />
        </Field>
        <Field id="cityId" label={t("city")}>
          <Select id="cityId" name="cityId" defaultValue={v?.cityId ?? ""}>
            <option value="">{t("noCity")}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id="estimatedGuests" label={t("estimatedGuests")} hint={t("estimatedHint")} error={err("estimatedGuests")}>
        <Input
          id="estimatedGuests"
          name="estimatedGuests"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={v?.estimatedGuests}
          className="sm:w-48"
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-[1fr_10rem]">
        <Field id="budgetTotal" label={t("budgetTotal")} error={err("budgetTotal")}>
          <Input id="budgetTotal" name="budgetTotal" type="number" inputMode="numeric" min={0} defaultValue={v?.budgetTotal} />
        </Field>
        <Field id="currency" label={t("currency")}>
          <Select id="currency" name="currency" defaultValue={v?.currency ?? "EUR"}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c === "EUR" ? "€ EUR" : "ден. MKD"}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {mode === "create" ? t("submit") : tc("save")}
      </Button>
    </form>
  );
}
