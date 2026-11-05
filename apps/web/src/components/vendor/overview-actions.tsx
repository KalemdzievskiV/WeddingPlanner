"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { deleteBusinessAction, submitForReviewAction } from "@/actions/vendor";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function SubmitForReviewButton({ businessId, ready, label }: { businessId: string; ready: boolean; label: string }) {
  const te = useTranslations("errors");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {error && <Alert tone="error">{error}</Alert>}
      <Button
        disabled={!ready || pending}
        onClick={() =>
          start(async () => {
            const res = await submitForReviewAction(businessId);
            if (res.formError && res.formError !== "emailTaken") setError(te(res.formError));
          })
        }
      >
        {label}
      </Button>
    </div>
  );
}

export function DeleteBusinessButton({ businessId, name }: { businessId: string; name: string }) {
  const t = useTranslations("vendor.overview");
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="danger"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (confirm(t("confirmDelete", { name }))) start(async () => void (await deleteBusinessAction(businessId, locale)));
      }}
    >
      {t("delete")}
    </Button>
  );
}
