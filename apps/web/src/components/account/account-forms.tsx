"use client";

import { isLocale, LOCALES } from "@svadba/shared";
import { Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {useEffect, useRef} from "react";
import { updateProfileAction, uploadAvatarAction } from "@/actions/account";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";

export function AvatarForm({ name, image }: { name: string; image: string | null }) {
  const t = useTranslations("account");
  const te = useTranslations("errors");
  const [state, action, pending] = useFormAction(uploadAvatarAction, {} as FormState);
  const formRef = useRef<HTMLFormElement>(null);
  const error = state.fieldErrors?.photo ?? state.formError;

  return (
    <form ref={formRef} onSubmit={action} className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line-strong bg-rosehip font-display text-3xl text-vranec">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="size-full object-cover" />
        ) : (
          name.trim().charAt(0).toUpperCase()
        )}
      </div>
      <div className="space-y-2">
        <p className="font-medium">{t("photo")}</p>
        <label className={buttonClass("secondary", "sm", pending ? "pointer-events-none opacity-50" : "cursor-pointer")}>
          <Upload aria-hidden className="size-4" />
          {t("uploadPhoto")}
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={() => formRef.current?.requestSubmit()}
          />
        </label>
        {error && error !== "emailTaken" ? (
          <p className="text-sm text-danger">{te(error)}</p>
        ) : state.ok ? (
          <p className="text-sm text-olive" role="status">{t("photoSaved")}</p>
        ) : (
          <p className="text-sm text-stone">{t("photoHint")}</p>
        )}
      </div>
    </form>
  );
}

export function ProfileForm({ name, email, locale }: { name: string; email: string; locale: string }) {
  const t = useTranslations("account");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [state, action, pending] = useFormAction(updateProfileAction, {} as FormState & { locale?: string });
  const fe = state.fieldErrors ?? {};

  // After saving a different language, reopen this page in that language.
  useEffect(() => {
    if (state.ok && isLocale(state.locale) && state.locale !== currentLocale) {
      router.replace(pathname, { locale: state.locale });
    }
  }, [state, currentLocale, pathname, router]);

  return (
    <form onSubmit={action} className="space-y-5">
      {state.ok && <Alert tone="success">{t("saved")}</Alert>}
      {state.formError && state.formError !== "emailTaken" && <Alert tone="error">{te(state.formError)}</Alert>}
      <Field id="name" label={t("name")} error={fe.name && te(fe.name)}>
        <Input id="name" name="name" defaultValue={name} autoComplete="name" aria-invalid={!!fe.name} />
      </Field>
      <Field id="email" label={t("email")}>
        <Input id="email" value={email} readOnly disabled />
      </Field>
      <Field id="locale" label={t("locale")} hint={t("localeHint")}>
        <Select id="locale" name="locale" defaultValue={isLocale(locale) ? locale : "mk"}>
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {tc(`languages.${l}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? tc("saving") : tc("save")}
      </Button>
    </form>
  );
}
