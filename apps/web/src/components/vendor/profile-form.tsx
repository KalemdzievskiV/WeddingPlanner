"use client";

import { CURRENCIES } from "@svadba/shared";
import { useTranslations } from "next-intl";
import {useState, type ReactNode} from "react";
import { updateBusinessProfileAction } from "@/actions/vendor";
import { MapView } from "@/components/map-view";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";
import { cn } from "@/lib/utils";

export type ProfileValues = {
  category: string;
  name: string;
  descriptionMk: string;
  descriptionSq: string | null;
  descriptionEn: string | null;
  cityId: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  viber: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  lineup: string | null;
  currency: string;
};

type Option = { id: string; name: string };

export function ProfileForm({
  businessId,
  values,
  cities,
  features,
  genres,
  selectedFeatures,
  selectedGenres,
}: {
  businessId: string;
  values: ProfileValues;
  cities: Option[];
  features: Option[];
  genres: Option[];
  selectedFeatures: string[];
  selectedGenres: string[];
}) {
  const t = useTranslations("vendor.profile");
  const te = useTranslations("errors");
  const [state, action, pending] = useFormAction(
    updateBusinessProfileAction.bind(null, businessId),
    {} as FormState,
  );
  const [point, setPoint] = useState(values.lat != null && values.lng != null ? { lat: values.lat, lng: values.lng } : null);
  const fe = state.fieldErrors ?? {};
  const err = (k: string) => (fe[k] ? te(fe[k]) : undefined);
  const isBand = values.category === "BAND";

  const text = (name: keyof ProfileValues, label: string, props: Record<string, unknown> = {}) => (
    <Field id={name} label={label} error={err(name)}>
      <Input id={name} name={name} defaultValue={(values[name] as string | null) ?? ""} aria-invalid={!!fe[name]} {...props} />
    </Field>
  );

  return (
    <form onSubmit={action} className="space-y-6" noValidate>
      {state.ok && <Alert tone="success">{t("saved")}</Alert>}
      {(state.formError || Object.keys(fe).length > 0) && (
        <Alert tone="error">{state.formError && state.formError !== "emailTaken" ? te(state.formError) : te("checkFields")}</Alert>
      )}

      <Section title={t("basics")}>
        <div className="grid gap-5 sm:grid-cols-2">
          {text("name", t("name"), { required: true, maxLength: 100 })}
          <Field id="cityId" label={isBand ? t("homeCity") : t("city")} error={err("cityId")}>
            <Select id="cityId" name="cityId" defaultValue={values.cityId ?? ""}>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {text("address", t("address"), { autoComplete: "street-address" })}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium">{t("pin")}</p>
            {point && (
              <button type="button" onClick={() => setPoint(null)} className="text-sm text-vranec hover:underline">
                {t("pinClear")}
              </button>
            )}
          </div>
          <MapView value={point} onChange={setPoint} label={t("pin")} className="h-72" />
          <p className="text-sm text-stone">{t("pinHint")}</p>
          <input type="hidden" name="lat" value={point?.lat ?? ""} />
          <input type="hidden" name="lng" value={point?.lng ?? ""} />
        </div>
      </Section>

      <Section title={t("description")} lead={t("descriptionHint")}>
        {(["descriptionMk", "descriptionSq", "descriptionEn"] as const).map((name) => (
          <Field key={name} id={name} label={t(name)} error={err(name)}>
            <textarea
              id={name}
              name={name}
              rows={name === "descriptionMk" ? 6 : 4}
              defaultValue={values[name] ?? ""}
              lang={name === "descriptionMk" ? "mk" : name === "descriptionSq" ? "sq" : "en"}
              className="block w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[15px] leading-relaxed focus:border-vranec focus:outline-none focus:ring-2 focus:ring-vranec/15"
            />
          </Field>
        ))}
      </Section>

      {values.category === "VENUE" && features.length > 0 && (
        <Section title={t("features")}>
          <CheckboxGrid name="features" options={features} selected={selectedFeatures} />
        </Section>
      )}

      {isBand && (
        <Section title={t("genres")}>
          <CheckboxGrid name="genres" options={genres} selected={selectedGenres} />
          <Field id="lineup" label={t("lineup")} hint={t("lineupHint")} error={err("lineup")}>
            <Input id="lineup" name="lineup" defaultValue={values.lineup ?? ""} />
          </Field>
        </Section>
      )}

      <Section title={t("contact")}>
        <div className="grid gap-5 sm:grid-cols-2">
          {text("phone", t("phone"), { type: "tel", autoComplete: "tel" })}
          {text("email", t("email"), { type: "email" })}
          {text("viber", t("viber"), { type: "tel" })}
          {text("whatsapp", t("whatsapp"), { type: "tel" })}
          {text("instagram", t("instagram"), { type: "url", placeholder: t("linkPlaceholder") })}
          {text("facebook", t("facebook"), { type: "url", placeholder: t("linkPlaceholder") })}
          {text("website", t("website"), { type: "url", placeholder: t("linkPlaceholder") })}
          <Field id="currency" label={t("currency")}>
            <Select id="currency" name="currency" defaultValue={values.currency}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c === "EUR" ? "€ EUR" : "ден. MKD"}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button type="submit" size="lg" disabled={pending} className="shadow-lg">
          {t("save")}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <Card className="space-y-5 p-6 sm:p-7">
      <div>
        <h2 className="font-display text-xl">{title}</h2>
        {lead && <p className="mt-1 text-sm text-stone">{lead}</p>}
      </div>
      {children}
    </Card>
  );
}

function CheckboxGrid({ name, options, selected }: { name: string; options: Option[]; selected: string[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <label
          key={o.id}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm transition-colors",
            "hover:border-line-strong has-[:checked]:border-vranec/40 has-[:checked]:bg-rosehip/50",
          )}
        >
          <Checkbox name={name} value={o.id} defaultChecked={selected.includes(o.id)} />
          {o.name}
        </label>
      ))}
    </div>
  );
}
