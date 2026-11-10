"use client";

import { INVITE_OVERLAY_MAX, SAMPLE_INVITE_VIDEO } from "@svadba/shared";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { saveVideoInviteAction } from "@/actions/plan-invitation";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { Link } from "@/i18n/navigation";
import type { FormState } from "@/lib/form";
import { useFormAction } from "@/lib/use-form-action";
import { type InviteEvent, VideoInvite } from "./video-invite";

type Draft = { enabled: boolean; videoUrl: string; headline: string; message: string; overlay: number };

const textareaClass =
  "block w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[15px] focus:border-vranec focus:outline-none focus:ring-2 focus:ring-vranec/15";

/** Edits the video invitation, with a live preview next to the form. */
export function InviteEditor({
  initial,
  editable,
  partner1,
  partner2,
  dateLabel,
  events,
  previewHref,
}: {
  initial: Draft;
  editable: boolean;
  partner1: string;
  partner2: string;
  dateLabel: string;
  events: InviteEvent[];
  previewHref: string | null;
}) {
  const t = useTranslations("plan.invite");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [draft, setDraft] = useState<Draft>(initial);
  const [state, onSubmit, pending] = useFormAction(saveVideoInviteAction, {} as FormState);
  const fe = state.fieldErrors ?? {};
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  // Only an https link plays; anything else previews the sample until it's fixed.
  const previewUrl = /^https:\/\//i.test(draft.videoUrl.trim()) ? draft.videoUrl.trim() : null;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_minmax(0,22rem)]">
      <Card className="p-5 sm:p-6">
        <h2 className="text-xl font-semibold">{t("title")}</h2>
        <p className="mt-1 text-sm text-stone">{t("lead")}</p>
        <form onSubmit={onSubmit} className="mt-5 space-y-5" noValidate>
          <fieldset disabled={!editable} className="space-y-5">
            <label className="flex items-start gap-2 text-sm">
              <Checkbox name="enabled" checked={draft.enabled} onChange={(e) => set("enabled", e.target.checked)} className="mt-0.5" />
              <span>
                <span className="font-medium">{t("enabled")}</span>
                <span className="block text-stone">{t("enabledHint")}</span>
              </span>
            </label>

            <Field id="invite-video" label={t("videoUrl")} hint={t("videoUrlHint")} error={fe.videoUrl && te(fe.videoUrl)}>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="invite-video"
                  name="videoUrl"
                  type="url"
                  inputMode="url"
                  placeholder="https://…/video.mp4"
                  value={draft.videoUrl}
                  onChange={(e) => set("videoUrl", e.target.value)}
                  className="min-w-0 flex-1"
                />
                {draft.videoUrl && (
                  <Button type="button" variant="ghost" onClick={() => set("videoUrl", "")}>
                    {t("useSample")}
                  </Button>
                )}
              </div>
            </Field>
            {!draft.videoUrl && (
              <p className="-mt-3 text-sm text-stone">
                {t("sampleNote")}{" "}
                <a href={SAMPLE_INVITE_VIDEO} target="_blank" rel="noreferrer" className="text-vranec hover:underline">
                  Mixkit
                </a>
              </p>
            )}

            <Field id="invite-headline" label={t("headline")} hint={t("headlineHint")} error={fe.headline && te(fe.headline)}>
              <Input
                id="invite-headline"
                name="headline"
                maxLength={80}
                placeholder={t("headlinePlaceholder")}
                value={draft.headline}
                onChange={(e) => set("headline", e.target.value)}
              />
            </Field>

            <Field id="invite-message" label={t("message")} hint={t("messageHint")} error={fe.message && te(fe.message)}>
              <textarea
                id="invite-message"
                name="message"
                rows={3}
                maxLength={600}
                placeholder={t("messagePlaceholder")}
                value={draft.message}
                onChange={(e) => set("message", e.target.value)}
                className={textareaClass}
              />
            </Field>

            <Field id="invite-overlay" label={t("overlay", { value: draft.overlay })} hint={t("overlayHint")} error={fe.overlay && te(fe.overlay)}>
              <input
                id="invite-overlay"
                name="overlay"
                type="range"
                min={0}
                max={INVITE_OVERLAY_MAX}
                step={5}
                value={draft.overlay}
                onChange={(e) => set("overlay", Number(e.target.value))}
                className="w-full accent-vranec"
              />
            </Field>

            <p className="text-sm text-stone">{t("detailsNote")}</p>
          </fieldset>

          {state.ok && !pending && <Alert tone="success">{t("saved")}</Alert>}
          {state.formError && <Alert tone="error">{te(state.formError === "emailTaken" ? "generic" : state.formError)}</Alert>}
          <div className="flex flex-wrap gap-2">
            {editable && (
              <Button type="submit" disabled={pending}>
                {pending ? tc("saving") : tc("save")}
              </Button>
            )}
            {previewHref && (
              <Link href={previewHref} target="_blank" className={buttonClass("secondary")}>
                <ExternalLink aria-hidden className="size-4" /> {t("openAsGuest")}
              </Link>
            )}
          </div>
          {previewHref && !initial.enabled && <p className="text-xs text-stone">{t("openAsGuestOff")}</p>}
        </form>
      </Card>

      <div className="space-y-2 lg:sticky lg:top-4">
        <p className="text-sm font-medium text-ink-soft">{t("preview")}</p>
        <VideoInvite
          key={previewUrl ?? "sample"}
          preview
          videoUrl={previewUrl}
          overlay={draft.overlay}
          headline={draft.headline.trim() || null}
          message={draft.message.trim() || null}
          partner1={partner1}
          partner2={partner2}
          dateLabel={dateLabel}
          events={events}
        />
      </div>
    </div>
  );
}
