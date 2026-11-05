"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

export function ForgotForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setPending(true);
    setError(false);
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: `/${locale}/reset-password` });
    setPending(false);
    if (error && error.status !== 400) setError(true);
    else setSentTo(email);
  }

  if (sentTo) return <Alert tone="success">{t("forgot.sent", { email: sentTo })}</Alert>;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <Alert tone="error">{t("genericError")}</Alert>}
      <Field id="email" label={t("email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {t("forgot.submit")}
      </Button>
    </form>
  );
}
