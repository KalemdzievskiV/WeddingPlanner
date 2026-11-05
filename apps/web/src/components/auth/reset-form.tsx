"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

export function ResetForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const [state, setState] = useState<"idle" | "done" | "invalid" | "error">("idle");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const newPassword = String(new FormData(event.currentTarget).get("password") ?? "");
    if (newPassword.length < 8) return setFieldError(te("passwordMin"));
    setFieldError(null);
    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword, token });
    setPending(false);
    if (!error) setState("done");
    else if (error.code === "INVALID_TOKEN") setState("invalid");
    else setState("error");
  }

  if (state === "done") {
    return (
      <div className="space-y-5">
        <Alert tone="success">{t("reset.success")}</Alert>
        <ButtonLink href="/sign-in" className="w-full" size="lg">
          {t("signIn.submit")}
        </ButtonLink>
      </div>
    );
  }
  if (state === "invalid") return <InvalidToken />;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {state === "error" && <Alert tone="error">{t("genericError")}</Alert>}
      <Field id="password" label={t("reset.newPassword")} hint={t("signUp.passwordHint")} error={fieldError}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={!!fieldError} />
      </Field>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {t("reset.submit")}
      </Button>
    </form>
  );
}

export function InvalidToken() {
  const t = useTranslations("auth");
  return (
    <div className="space-y-5">
      <Alert tone="error">{t("reset.invalidToken")}</Alert>
      <ButtonLink href="/forgot-password" variant="secondary" className="w-full">
        {t("forgot.submit")}
      </ButtonLink>
    </div>
  );
}
