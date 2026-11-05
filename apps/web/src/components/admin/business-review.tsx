"use client";

import { useTranslations } from "next-intl";
import {useState, useTransition} from "react";
import {
  approveBusinessAction,
  createClaimLinkAction,
  rejectBusinessAction,
  setHiddenAction,
} from "@/actions/admin-business";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";

export function ReviewActions({ id, status }: { id: string; status: string }) {
  const t = useTranslations("admin.businesses");
  const te = useTranslations("errors");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [state, rejectAction, rejectPending] = useFormAction(
    async (prev: FormState, fd: FormData) => {
      const res = await rejectBusinessAction(id, prev, fd);
      if (res.ok) {
        setRejecting(false);
        setMessage(t("rejected"));
      }
      return res;
    },
    {} as FormState,
  );

  return (
    <div className="space-y-4">
      {message && <Alert tone="success">{message}</Alert>}
      <div className="flex flex-wrap gap-2">
        {status !== "APPROVED" && status !== "HIDDEN" && (
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await approveBusinessAction(id);
                if (res.ok) setMessage(t("approved"));
              })
            }
          >
            {t("approve")}
          </Button>
        )}
        {status !== "REJECTED" && status !== "HIDDEN" && (
          <Button variant="secondary" disabled={pending} onClick={() => setRejecting((r) => !r)}>
            {t("reject")}
          </Button>
        )}
        {status === "HIDDEN" ? (
          <Button variant="secondary" disabled={pending} onClick={() => start(async () => void (await setHiddenAction(id, false)))}>
            {t("unhide")}
          </Button>
        ) : (
          <Button variant="ghost" disabled={pending} onClick={() => start(async () => void (await setHiddenAction(id, true)))}>
            {t("hide")}
          </Button>
        )}
      </div>
      {rejecting && (
        <form onSubmit={rejectAction} className="space-y-3">
          <Field id="reason" label={t("rejectReason")} hint={t("rejectHint")} error={state.fieldErrors?.reason && te(state.fieldErrors.reason)}>
            <textarea
              id="reason"
              name="reason"
              rows={3}
              required
              className="block w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[15px] focus:border-vranec focus:outline-none focus:ring-2 focus:ring-vranec/15"
            />
          </Field>
          <Button type="submit" variant="danger" disabled={rejectPending}>
            {t("reject")}
          </Button>
        </form>
      )}
    </div>
  );
}

export function CreateClaimLinkButton({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" size="sm" disabled={pending} onClick={() => start(async () => void (await createClaimLinkAction(id)))}>
      {label}
    </Button>
  );
}
