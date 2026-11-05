"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { joinWeddingAction } from "@/actions/plan-wedding";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function JoinWeddingButton({ token, label }: { token: string; label: string }) {
  const te = useTranslations("errors");
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      <Button
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await joinWeddingAction(token, locale);
            if (res?.formError && res.formError !== "emailTaken") setError(te(res.formError));
          })
        }
      >
        {label}
      </Button>
    </div>
  );
}
