"use client";

import type { Locale } from "@svadba/shared";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createInquiryAction } from "@/actions/inquiries";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Link, useRouter } from "@/i18n/navigation";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";

type Option = { id: string; label: string };

/** Inquiry pre-filled from the wedding (decision 78). */
export function InquiryForm({
  businessId,
  events,
  halls,
  packages,
  defaultEventId,
  defaultGuests,
  today,
}: {
  businessId: string;
  events: (Option & { date: string | null })[];
  halls: Option[];
  packages: Option[];
  defaultEventId: string | null;
  defaultGuests: number | null;
  today: string;
}) {
  const t = useTranslations("inquiries.form");
  const te = useTranslations("errors");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [eventId, setEventId] = useState(defaultEventId ?? "");
  const [date, setDate] = useState(events.find((e) => e.id === defaultEventId)?.date ?? "");
  const [state, action, pending] = useFormAction(
    createInquiryAction.bind(null, businessId, locale),
    {} as FormState & { id?: string },
  );
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok && state.id) router.push(`/plan/inquiries/${state.id}`);
  }, [state, router]);

  return (
    <form onSubmit={action} className="space-y-5">
      {state.formError === "inquiryOpen" ? (
        <Alert tone="error">
          {te("inquiryOpen")}{" "}
          {state.id && (
            <Link href={`/plan/inquiries/${state.id}`} className="font-medium underline">
              {t("openExisting")}
            </Link>
          )}
        </Alert>
      ) : (
        state.formError && state.formError !== "emailTaken" && <Alert tone="error">{te(state.formError)}</Alert>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        {events.length > 0 && (
          <Field id="inq-event" label={t("event")}>
            <Select
              id="inq-event"
              name="eventId"
              value={eventId}
              onChange={(e) => {
                setEventId(e.target.value);
                // Follow the event's date when it has one.
                const d = events.find((ev) => ev.id === e.target.value)?.date;
                if (d) setDate(d);
              }}
            >
              <option value="">{t("noEvent")}</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field id="inq-date" label={t("date")} hint={t("dateHint")} error={fe.date && te(fe.date)}>
          <Input id="inq-date" name="date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field id="inq-guests" label={t("guests")} error={fe.guestCount && te(fe.guestCount)}>
          <Input id="inq-guests" name="guestCount" type="number" inputMode="numeric" min={1} defaultValue={defaultGuests ?? ""} />
        </Field>
        {halls.length > 0 && (
          <Field id="inq-hall" label={t("hall")}>
            <Select id="inq-hall" name="hallId" defaultValue="">
              <option value="">{t("anyHall")}</option>
              {halls.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {packages.length > 0 && (
          <Field id="inq-package" label={t("package")} className="sm:col-span-2">
            <Select id="inq-package" name="packageRef" defaultValue="">
              <option value="">{t("noPackage")}</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      <Field id="inq-message" label={t("message")} hint={t("messageHint")} error={fe.message && te(fe.message)}>
        <textarea
          id="inq-message"
          name="message"
          rows={6}
          aria-invalid={!!fe.message}
          placeholder={t("messagePlaceholder")}
          className="block w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[15px] placeholder:text-stone/70 focus:border-vranec focus:outline-none focus:ring-2 focus:ring-vranec/15"
        />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("sending") : t("send")}
      </Button>
    </form>
  );
}
