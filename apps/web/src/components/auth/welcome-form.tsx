"use client";

import { useLocale, useTranslations } from "next-intl";

import { chooseAccountTypeAction } from "@/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";
import { AccountTypePicker } from "./account-type-picker";

export function WelcomeForm() {
  const t = useTranslations("auth.welcome");
  const te = useTranslations("errors");
  const locale = useLocale();
  const [state, action, pending] = useFormAction(chooseAccountTypeAction, {} as FormState);
  return (
    <form onSubmit={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      {state.formError && state.formError !== "emailTaken" && <Alert tone="error">{te(state.formError)}</Alert>}
      <AccountTypePicker defaultValue="COUPLE" error={state.fieldErrors?.accountType && te(state.fieldErrors.accountType)} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
