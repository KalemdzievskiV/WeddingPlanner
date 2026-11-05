"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { replyReviewAction, reportReviewAction } from "@/actions/reviews";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";

const textareaClass =
  "block w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[15px] focus:border-vranec focus:outline-none focus:ring-2 focus:ring-vranec/15";

/** Vendor's public reply (one per review, editable) and report to admin (decision 81). */
export function ReviewReply({ reviewId, reply, reported }: { reviewId: string; reply: string | null; reported: boolean }) {
  const t = useTranslations("reviews.vendor");
  const te = useTranslations("errors");
  const [mode, setMode] = useState<"reply" | "report" | null>(null);
  const [replyState, sendReply, replyPending] = useFormAction(replyReviewAction.bind(null, reviewId), {} as FormState);
  const [reportState, sendReport, reportPending] = useFormAction(reportReviewAction.bind(null, reviewId), {} as FormState);
  const replyError = replyState.fieldErrors?.text ?? replyState.formError;
  const reportError = reportState.fieldErrors?.reason ?? reportState.formError;

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => setMode(mode === "reply" ? null : "reply")}>
          {reply ? t("editReply") : t("reply")}
        </Button>
        {reported || reportState.ok ? (
          <span className="inline-flex h-8 items-center text-sm text-stone">{t("reported")}</span>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setMode(mode === "report" ? null : "report")}>
            {t("report")}
          </Button>
        )}
      </div>
      {mode === "reply" && (
        <form onSubmit={sendReply} className="space-y-2">
          {replyState.ok && <Alert tone="success">{t("replySaved")}</Alert>}
          <label htmlFor={`reply-${reviewId}`} className="sr-only">
            {t("reply")}
          </label>
          <textarea id={`reply-${reviewId}`} name="text" rows={3} defaultValue={reply ?? ""} className={textareaClass} />
          {replyError && replyError !== "emailTaken" && <p className="text-sm text-danger">{te(replyError)}</p>}
          <Button type="submit" size="sm" disabled={replyPending}>
            {t("publishReply")}
          </Button>
        </form>
      )}
      {mode === "report" && !reportState.ok && (
        <form onSubmit={sendReport} className="space-y-2">
          <label htmlFor={`report-${reviewId}`} className="text-sm font-medium">
            {t("reportReason")}
          </label>
          <textarea id={`report-${reviewId}`} name="reason" rows={2} className={textareaClass} />
          {reportError && reportError !== "emailTaken" && <p className="text-sm text-danger">{te(reportError)}</p>}
          <Button type="submit" size="sm" variant="danger" disabled={reportPending}>
            {t("sendReport")}
          </Button>
        </form>
      )}
    </div>
  );
}
