"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { removeInvitationAction, uploadInvitationAction } from "@/actions/plan-invitation";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ErrorKey } from "@/lib/form";
import { cn } from "@/lib/utils";

/** The couple's invitation picture, shown to guests on their RSVP link. */
export function InvitationCard({ url, editable }: { url: string | null; editable: boolean }) {
  const t = useTranslations("plan.guests.invitation");
  const te = useTranslations("errors");
  const [error, setError] = useState<ErrorKey | null>(null);
  const [pending, start] = useTransition();

  if (!url && !editable) return null;

  function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.append("invitation", file);
    start(async () => {
      const res = await uploadInvitationAction(fd);
      const key = res.fieldErrors?.invitation ?? (res.formError === "emailTaken" ? "generic" : res.formError);
      if (key) setError(key);
    });
  }

  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="shrink-0 self-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={t("alt")} className="h-28 w-auto max-w-40 rounded-lg border border-line object-contain" />
        </a>
      ) : (
        <div className="grid h-28 w-20 shrink-0 place-items-center rounded-lg border border-dashed border-line bg-linen text-stone">
          <ImagePlus aria-hidden className="size-6" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t("title")}</p>
        <p className="mt-1 text-sm text-stone">{t(url ? "hintSet" : "hintEmpty")}</p>
        {error && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {te(error)}
          </p>
        )}
      </div>
      {editable && (
        <div className="flex flex-wrap gap-2">
          <label className={cn(buttonClass("secondary"), "cursor-pointer", pending && "pointer-events-none opacity-60")}>
            <ImagePlus aria-hidden className="size-4" /> {pending ? t("uploading") : t(url ? "change" : "add")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={pending}
              onChange={(e) => {
                upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {url && (
            <Button
              variant="ghost"
              disabled={pending}
              aria-label={t("remove")}
              onClick={() => {
                if (confirm(t("confirmRemove"))) start(async () => void (await removeInvitationAction()));
              }}
            >
              <Trash2 aria-hidden className="size-4 text-danger" />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
