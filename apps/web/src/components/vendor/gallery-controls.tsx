"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {useEffect, useRef, useTransition} from "react";
import { createGalleryAction, deleteGalleryAction } from "@/actions/vendor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";

export function NewGalleryForm({ businessId }: { businessId: string }) {
  const t = useTranslations("vendor.photos");
  const te = useTranslations("errors");
  const [state, action, pending] = useFormAction(createGalleryAction.bind(null, businessId), {} as FormState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} onSubmit={action} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div className="flex-1">
        <label htmlFor="gallery-title" className="sr-only">
          {t("galleryTitle")}
        </label>
        <Input id="gallery-title" name="title" placeholder={t("galleryTitle")} maxLength={80} aria-invalid={!!state.fieldErrors?.title} />
        {state.fieldErrors?.title && <p className="mt-1 text-sm text-danger">{te(state.fieldErrors.title)}</p>}
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        <Plus aria-hidden className="size-4" /> {t("createGallery")}
      </Button>
    </form>
  );
}

export function DeleteGalleryButton({ businessId, galleryId, title }: { businessId: string; galleryId: string; title: string }) {
  const t = useTranslations("vendor.photos");
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (confirm(t("confirmDeleteGallery", { title }))) start(async () => void (await deleteGalleryAction(businessId, galleryId)));
      }}
    >
      <Trash2 aria-hidden className="size-4 text-danger" /> {t("deleteGallery")}
    </Button>
  );
}
