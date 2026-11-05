"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { deleteReviewAction, saveReviewAction } from "@/actions/reviews";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";
import { cn } from "@/lib/utils";

/** Couple's review of a booked vendor after the wedding (decisions 16, 81). */
export function ReviewForm({ businessId, existing }: { businessId: string; existing: { rating: number; text: string } | null }) {
  const t = useTranslations("reviews.form");
  const te = useTranslations("errors");
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [state, action, pending] = useFormAction(saveReviewAction.bind(null, businessId), {} as FormState);
  const [deleting, startDelete] = useTransition();
  const fe = state.fieldErrors ?? {};

  if (!open) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3 border-vranec/25 p-5">
        <p className="text-sm text-ink-soft">{existing ? t("yours") : t("invite")}</p>
        <Button variant={existing ? "secondary" : "primary"} size="sm" onClick={() => setOpen(true)}>
          {existing ? t("edit") : t("write")}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="border-vranec/25 p-5">
      <form onSubmit={action} className="space-y-4">
        {state.ok && <Alert tone="success">{t("saved")}</Alert>}
        {state.formError && state.formError !== "emailTaken" && <Alert tone="error">{te(state.formError)}</Alert>}
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t("rating")}</legend>
          <input type="hidden" name="rating" value={rating || ""} />
          <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                aria-label={t("stars", { count: i })}
                aria-pressed={rating === i}
                onClick={() => setRating(i)}
                onMouseEnter={() => setHover(i)}
                className="rounded p-0.5"
              >
                <Star
                  aria-hidden
                  className={cn("size-7 transition-colors", i <= (hover || rating) ? "fill-amber text-amber" : "text-line-strong")}
                />
              </button>
            ))}
          </div>
          {fe.rating && <p className="mt-1 text-sm text-danger">{te(fe.rating)}</p>}
        </fieldset>
        <Field id="review-text" label={t("text")} hint={t("textHint")} error={fe.text && te(fe.text)}>
          <textarea
            id="review-text"
            name="text"
            rows={5}
            defaultValue={existing?.text}
            aria-invalid={!!fe.text}
            className="block w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[15px] focus:border-vranec focus:outline-none focus:ring-2 focus:ring-vranec/15"
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {t("publish")}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          {existing && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="ml-auto"
              disabled={deleting}
              onClick={() => {
                if (!confirm(t("deleteConfirm"))) return;
                startDelete(async () => {
                  await deleteReviewAction(businessId);
                  setOpen(false);
                });
              }}
            >
              {t("delete")}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
