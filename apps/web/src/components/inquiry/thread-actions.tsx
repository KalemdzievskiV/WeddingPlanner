"use client";

import { CURRENCIES, OFFER_UNITS, type Currency } from "@svadba/shared";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  bookInquiryAction,
  cancelInquiryAction,
  declineInquiryAction,
  respondOfferAction,
  sendCoupleMessageAction,
  sendOfferAction,
  sendVendorMessageAction,
} from "@/actions/inquiries";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";
import { cn } from "@/lib/utils";

const textareaClass =
  "block w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[15px] placeholder:text-stone/70 focus:border-vranec focus:outline-none focus:ring-2 focus:ring-vranec/15";

export function MessageComposer({ inquiryId, side }: { inquiryId: string; side: "couple" | "vendor" }) {
  const t = useTranslations("inquiries.thread");
  const te = useTranslations("errors");
  const action = side === "couple" ? sendCoupleMessageAction : sendVendorMessageAction;
  const [state, submit, pending] = useFormAction(action.bind(null, inquiryId), {} as FormState);
  const form = useRef<HTMLFormElement>(null);
  const error = state.fieldErrors?.text ?? state.formError;

  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} onSubmit={submit} className="space-y-3">
      <label htmlFor="reply" className="sr-only">
        {t("reply")}
      </label>
      <textarea id="reply" name="text" rows={3} placeholder={t("replyPlaceholder")} className={textareaClass} aria-invalid={!!error} />
      {error && error !== "emailTaken" && <p className="text-sm text-danger">{te(error)}</p>}
      <Button type="submit" disabled={pending}>
        {t("send")}
      </Button>
    </form>
  );
}

/** Couple's answer to an offer (decision 79). */
export function OfferResponse({ offerId }: { offerId: string }) {
  const t = useTranslations("inquiries.offer");
  const [addToBudget, setAddToBudget] = useState(true);
  const [pending, start] = useTransition();
  const respond = (accept: boolean) => start(async () => void (await respondOfferAction(offerId, accept, addToBudget)));
  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <Checkbox checked={addToBudget} onChange={(e) => setAddToBudget(e.target.checked)} />
        {t("addToBudget")}
      </label>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => respond(true)}>
          {t("accept")}
        </Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => respond(false)}>
          {t("decline")}
        </Button>
      </div>
    </div>
  );
}

export function CancelInquiry({ inquiryId }: { inquiryId: string }) {
  const t = useTranslations("inquiries.thread");
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (confirm(t("cancelConfirm"))) start(async () => void (await cancelInquiryAction(inquiryId)));
      }}
    >
      {t("cancel")}
    </Button>
  );
}

type Tool = "offer" | "book" | "decline";

/** Vendor's actions on an open inquiry: send an offer, mark as booked, or decline. */
export function VendorTools({
  inquiryId,
  currency,
  halls,
  defaultDate,
  defaultHallId,
  defaultUnit,
}: {
  inquiryId: string;
  currency: Currency;
  halls: { id: string; name: string }[];
  defaultDate: string;
  defaultHallId: string | null;
  defaultUnit: "TOTAL" | "PER_PERSON";
}) {
  const t = useTranslations("inquiries.vendor");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [tool, setTool] = useState<Tool | null>(null);
  const [offerState, sendOffer, offerPending] = useFormAction(sendOfferAction.bind(null, inquiryId), {} as FormState);
  const [bookState, book, bookPending] = useFormAction(bookInquiryAction.bind(null, inquiryId), {} as FormState);
  const [declineState, decline, declinePending] = useFormAction(declineInquiryAction.bind(null, inquiryId), {} as FormState);
  const ofe = offerState.fieldErrors ?? {};
  const bfe = bookState.fieldErrors ?? {};

  // After a successful offer the form closes until the vendor opens a tool again.
  const [openedWith, setOpenedWith] = useState<FormState>(offerState);
  const offerOpen = tool === "offer" && (offerState === openedWith || !offerState.ok);

  const formError = [offerState, bookState, declineState].find((s) => s.formError)?.formError;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["offer", "book", "decline"] as const).map((k) => (
          <Button
            key={k}
            type="button"
            size="sm"
            variant={tool === k ? "primary" : k === "decline" ? "ghost" : "secondary"}
            aria-expanded={tool === k}
            onClick={() => {
              setOpenedWith(offerState);
              setTool(tool === k ? null : k);
            }}
          >
            {t(`tools.${k}`)}
          </Button>
        ))}
      </div>
      {formError && formError !== "emailTaken" && <Alert tone="error">{te(formError)}</Alert>}

      {offerOpen && (
        <form onSubmit={sendOffer} className="space-y-4 rounded-xl border border-line bg-linen/60 p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="offer-price" label={t("price")} error={ofe.price && te(ofe.price)}>
              <Input id="offer-price" name="price" type="number" inputMode="numeric" min={1} aria-invalid={!!ofe.price} />
            </Field>
            <Field id="offer-currency" label={t("currency")}>
              <Select id="offer-currency" name="currency" defaultValue={currency}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c === "EUR" ? "€ EUR" : "ден. MKD"}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="offer-unit" label={t("unit")}>
              <Select id="offer-unit" name="unit" defaultValue={defaultUnit}>
                {OFFER_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {t(`units.${u}`)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field id="offer-valid" label={t("validUntil")} hint={t("validHint")} error={ofe.validUntil && te(ofe.validUntil)}>
            <Input id="offer-valid" name="validUntil" type="date" className="sm:w-52" />
          </Field>
          <Field id="offer-note" label={t("note")} hint={t("noteHint")} error={ofe.note && te(ofe.note)}>
            <textarea id="offer-note" name="note" rows={3} className={textareaClass} />
          </Field>
          <Button type="submit" disabled={offerPending}>
            {t("sendOffer")}
          </Button>
        </form>
      )}

      {tool === "book" && (
        <form onSubmit={book} className="space-y-4 rounded-xl border border-line bg-linen/60 p-4">
          <p className="text-sm text-ink-soft">{t("bookText")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="book-date" label={t("bookDate")} error={bfe.date && te(bfe.date)}>
              <Input id="book-date" name="date" type="date" defaultValue={defaultDate} aria-invalid={!!bfe.date} />
            </Field>
            {halls.length > 0 && (
              <Field id="book-hall" label={t("bookHall")} error={bfe.hallId && te(bfe.hallId)}>
                <Select id="book-hall" name="hallId" defaultValue={defaultHallId ?? ""} aria-invalid={!!bfe.hallId}>
                  <option value="">{tc("choose")}</option>
                  {halls.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
          <Button type="submit" disabled={bookPending}>
            {t("confirmBook")}
          </Button>
        </form>
      )}

      {tool === "decline" && (
        <form onSubmit={decline} className={cn("space-y-4 rounded-xl border border-line bg-linen/60 p-4")}>
          <Field id="decline-text" label={t("declineMessage")} hint={t("declineHint")}>
            <textarea id="decline-text" name="text" rows={3} className={textareaClass} />
          </Field>
          <Button type="submit" variant="danger" disabled={declinePending}>
            {t("confirmDecline")}
          </Button>
        </form>
      )}
    </div>
  );
}
