"use client";

import { useLocale, useTranslations } from "next-intl";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";
import { CategoryPicker } from "./category-picker";

/** Shared by vendors (createBusinessAction) and admins (adminCreateBusinessAction). */
export function NewBusinessForm({
  action: serverAction,
  cities,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  cities: { id: string; name: string }[];
  submitLabel: string;
}) {
  const t = useTranslations("vendor.new");
  const te = useTranslations("errors");
  const locale = useLocale();
  const [state, action, pending] = useFormAction(serverAction, {} as FormState);
  const fe = state.fieldErrors ?? {};

  return (
    <form onSubmit={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      {state.formError && state.formError !== "emailTaken" && <Alert tone="error">{te(state.formError)}</Alert>}
      <CategoryPicker defaultValue="VENUE" error={fe.category && te(fe.category)} />
      <Field id="name" label={t("name")} error={fe.name && te(fe.name)}>
        <Input id="name" name="name" required maxLength={100} aria-invalid={!!fe.name} />
      </Field>
      <Field id="cityId" label={t("city")} error={fe.cityId && te(fe.cityId)}>
        <Select id="cityId" name="cityId" defaultValue="" required aria-invalid={!!fe.cityId}>
          <option value="" disabled>
            {t("chooseCity")}
          </option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
