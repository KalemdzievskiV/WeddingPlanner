"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

export function SignInForm({ next }: { next?: string | null }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setNotice(null);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
      callbackURL: `/${locale}${next ?? "/app"}`,
    });
    setPending(false);
    if (!error) {
      router.push(next ?? "/app");
      router.refresh();
    } else if (error.code === "EMAIL_NOT_VERIFIED") {
      setNotice(t("signIn.notVerified"));
    } else if (error.code === "INVALID_EMAIL_OR_PASSWORD" || error.status === 401) {
      setError(t("signIn.invalidCredentials"));
    } else {
      setError(t("genericError"));
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert>{notice}</Alert>}
      <Field id="email" label={t("email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className="text-sm font-medium">
            {t("password")}
          </label>
          <Link href="/forgot-password" className="text-sm text-vranec underline-offset-4 hover:underline">
            {t("signIn.forgot")}
          </Link>
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {t("signIn.submit")}
      </Button>
    </form>
  );
}
