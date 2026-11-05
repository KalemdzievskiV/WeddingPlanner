"use client";

import type { AccountType } from "@svadba/shared";
import { MailCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { signUpAction } from "@/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";
import { AccountTypePicker } from "./account-type-picker";

export function SignUpForm({ defaultType, next }: { defaultType?: AccountType; next?: string | null }) {
  const t = useTranslations("auth");
  const te = useTranslations("errors");
  const locale = useLocale();
  const [state, action, pending] = useFormAction(signUpAction, {} as FormState & { email?: string });
  const fe = state.fieldErrors ?? {};

  if (state.ok) {
    return (
      <div className="text-center">
        <MailCheck aria-hidden className="mx-auto size-10 text-vranec" />
        <h2 className="mt-4 font-display text-2xl">{t("checkEmail.title")}</h2>
        <p className="mt-2 text-ink-soft">{t("checkEmail.text", { email: state.email ?? "" })}</p>
        <Link href="/sign-in" className="mt-6 inline-block text-sm font-medium text-vranec underline-offset-4 hover:underline">
          {t("checkEmail.back")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={action} className="space-y-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      {state.formError && (
        <Alert tone="error">{state.formError === "emailTaken" ? t("signUp.emailTaken") : te(state.formError)}</Alert>
      )}
      <AccountTypePicker defaultValue={defaultType} error={fe.accountType ? te(fe.accountType) : undefined} />
      <Field id="name" label={t("signUp.name")} error={fe.name && te(fe.name)}>
        <Input id="name" name="name" autoComplete="name" required aria-invalid={!!fe.name} />
      </Field>
      <Field id="email" label={t("email")} error={fe.email && te(fe.email)}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!fe.email} />
      </Field>
      <Field id="password" label={t("password")} hint={t("signUp.passwordHint")} error={fe.password && te(fe.password)}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-invalid={!!fe.password}
        />
      </Field>
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {t("signUp.submit")}
      </Button>
    </form>
  );
}
