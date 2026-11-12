"use client";

import { INVITE_OVERLAY_MAX, INVITE_THEMES, INVITE_TRACKS, type InviteThemeKey, SAMPLE_INVITE_VIDEO } from "@svadba/shared";
import { Check, ExternalLink } from "lucide-react";
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
import { DesignedInvite } from "@/components/invite/designed-invite";
import { cn } from "@/lib/utils";

export type InviteEvent = { id: string; name: string; when: string; place: string | null };

/** Swatch colours for the theme picker: page, paper, accent (match `.inv[data-theme]` in globals.css). */
const SWATCH: Record<InviteThemeKey, [string, string, string]> = {
  LILAC: ["#ede4ef", "#faf6fa", "#8a5f86"],
  IVORY: ["#f3ede2", "#fcfaf5", "#9c7a3a"],
  SAGE: ["#e7ece3", "#f7f9f4", "#5b7660"],
};

type Draft = {
  enabled: boolean;
  videoUrl: string;
  headline: string;
  message: string;
  overlay: number;
  eventIds: string[];
  theme: InviteThemeKey;
  music: string;
};

const textareaClass =
  "block w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[15px] focus:border-vranec focus:outline-none focus:ring-2 focus:ring-vranec/15";

/** Edits the designed invitation (decision 130), with a live preview next to the form. */
export function InviteEditor({
  initial,
  editable,
  partner1,
  partner2,
  dateLabel,
  events,
  previewHref,
  photoUrl,
  countdownTo,
}: {
  initial: Draft;
  editable: boolean;
  partner1: string;
  partner2: string;
  dateLabel: string;
  events: InviteEvent[];
  previewHref: string | null;
  photoUrl: string | null;
  countdownTo: string | null;
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

            <fieldset>
              <legend className="text-sm font-medium">{t("theme")}</legend>
              <input type="hidden" name="theme" value={draft.theme} />
              <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-3">
                {INVITE_THEMES.map((key) => {
                  const [bg, paper, accent] = SWATCH[key];
                  const on = draft.theme === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set("theme", key)}
                      className={cn(
                        "relative rounded-xl border p-2 text-left transition",
                        on ? "border-vranec ring-2 ring-vranec/20" : "border-line hover:border-line-strong",
                      )}
                    >
                      <span aria-hidden className="flex h-14 items-center justify-center rounded-lg" style={{ background: bg }}>
                        <span className="grid h-10 w-8 place-items-center rounded-t-full border" style={{ background: paper, borderColor: accent }}>
                          <span className="size-3 rounded-full" style={{ background: accent }} />
                        </span>
                      </span>
                      <span className="mt-1.5 block text-sm font-medium">{t(`themes.${key}`)}</span>
                      {on && <Check aria-hidden className="absolute right-2 top-2 size-4 text-vranec" />}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {INVITE_TRACKS.length > 0 ? (
              <Field id="invite-music" label={t("music")} hint={t("musicHint")} error={fe.music && te(fe.music)}>
                <select
                  id="invite-music"
                  name="music"
                  value={draft.music}
                  onChange={(e) => set("music", e.target.value)}
                  className="block h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-[15px] focus:border-vranec focus:outline-none focus:ring-2 focus:ring-vranec/15"
                >
                  <option value="">{t("noMusic")}</option>
                  {INVITE_TRACKS.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.title}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <input type="hidden" name="music" value="" />
            )}

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

            {events.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t("events")}</legend>
                <p className="text-sm text-stone">{t("eventsHint")}</p>
                <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
                  {events.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        name="eventIds"
                        value={e.id}
                        checked={draft.eventIds.includes(e.id)}
                        onChange={(ev) =>
                          set("eventIds", ev.target.checked ? [...draft.eventIds, e.id] : draft.eventIds.filter((id) => id !== e.id))
                        }
                      />
                      {e.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

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
        <DesignedInvite
          key={previewUrl ?? "sample"}
          preview
          theme={draft.theme}
          videoUrl={previewUrl}
          overlay={draft.overlay}
          headline={draft.headline.trim() || null}
          message={draft.message.trim() || null}
          partner1={partner1}
          partner2={partner2}
          dateLabel={dateLabel}
          venue={(events.filter((e) => draft.eventIds.includes(e.id)).find((e) => e.place) ?? events.find((e) => e.place))?.place ?? null}
          photoUrl={photoUrl}
          countdownTo={countdownTo}
          musicSrc={draft.music ? `/music/${draft.music}.mp3` : null}
        >
          <p className="px-6 pb-10 text-center text-sm italic text-[var(--inv-soft)]">{t("previewMore")}</p>
        </DesignedInvite>
      </div>
    </div>
  );
}
