"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { requestDeletionAction } from "@/actions/account";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useRouter } from "@/i18n/navigation";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";

export function ExportData() {
  const t = useTranslations("account.export");
  return (
    <div className="space-y-3">
      <h2 className="font-display text-2xl">{t("title")}</h2>
      <p className="text-ink-soft">{t("text")}</p>
      {/* A plain link: the browser saves the ZIP the route returns. */}
      <a href="/api/account/export" download className={buttonClass("secondary")}>
        <Download aria-hidden className="size-4" />
        {t("button")}
      </a>
    </div>
  );
}

export function DeleteAccount({ email, consequences }: { email: string; consequences: string[] }) {
  const t = useTranslations("account.delete");
  const te = useTranslations("errors");
  const router = useRouter();
  const [state, action, pending] = useFormAction(requestDeletionAction, {} as FormState);
  const fe = state.fieldErrors ?? {};

  // Sessions are gone once the action succeeds, so leave the signed-in area.
  useEffect(() => {
    if (!state.ok) return;
    router.replace("/");
    router.refresh();
  }, [state.ok, router]);

  return (
    <form onSubmit={action} className="space-y-4">
      <h2 className="font-display text-2xl">{t("title")}</h2>
      <p className="text-ink-soft">{t("text")}</p>
      {consequences.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
          {consequences.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}
      {state.formError && <Alert tone="error">{te(state.formError === "emailTaken" ? "generic" : state.formError)}</Alert>}
      <Field id="confirm" label={t("confirmLabel", { email })} error={fe.confirm && te(fe.confirm)}>
        <Input id="confirm" name="confirm" type="email" autoComplete="off" aria-invalid={!!fe.confirm} />
      </Field>
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? t("deleting") : t("button")}
      </Button>
    </form>
  );
}
