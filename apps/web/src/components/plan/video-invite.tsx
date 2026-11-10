"use client";

import { SAMPLE_INVITE_VIDEO } from "@svadba/shared";
import { ChevronDown, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type InviteEvent = { id: string; name: string; when: string };

/**
 * Video invitation: a full-screen video with the key details in front, then a smooth hand-over
 * to the RSVP form when the video ends (or when the guest taps "Respond").
 * Browsers only autoplay muted video, so it starts muted with a sound button. With reduced motion,
 * or when autoplay is blocked, it waits for a tap on play.
 * `preview` draws it in a box (the editor) and never scrolls the page.
 */
export function VideoInvite({
  videoUrl,
  overlay,
  headline,
  message,
  partner1,
  partner2,
  dateLabel,
  events,
  greeting,
  targetId = "rsvp",
  preview = false,
}: {
  videoUrl: string | null;
  overlay: number;
  headline: string | null;
  message: string | null;
  partner1: string;
  partner2: string;
  dateLabel: string;
  events: InviteEvent[];
  /** Who the invitation is for, e.g. the family or guest name. */
  greeting?: string;
  targetId?: string;
  preview?: boolean;
}) {
  const t = useTranslations("invite");
  const video = useRef<HTMLVideoElement>(null);
  const box = useRef<HTMLElement>(null);
  const [muted, setMuted] = useState(true);
  const [ended, setEnded] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [failed, setFailed] = useState(false);
  const src = videoUrl || SAMPLE_INVITE_VIDEO;

  // Start playing (muted) unless the guest prefers less motion; fall back to a play button if blocked.
  // A new video remounts this component (callers key it by the link), so state starts fresh.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    (reduced ? Promise.reject(new Error("reduced motion")) : v.play()).then(
      () => setWaiting(false),
      () => setWaiting(true),
    );
  }, []);

  const toRsvp = () => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });

  function onEnded() {
    setEnded(true);
    if (preview) return;
    // Only move the page if the guest is still watching the video (not already scrolled down).
    const h = box.current?.offsetHeight ?? window.innerHeight;
    if (window.scrollY < h / 2) setTimeout(toRsvp, 900);
  }

  function play() {
    const v = video.current;
    if (!v) return;
    v.currentTime = 0;
    setEnded(false);
    void v.play().then(() => setWaiting(false));
  }

  const names = `${partner1} & ${partner2}`;
  const shade = Math.min(80, Math.max(0, overlay)) / 100;

  return (
    <section
      ref={box}
      aria-label={t("label", { couple: names })}
      className={cn(
        "relative isolate flex w-full flex-col overflow-hidden bg-ink text-white",
        preview ? "aspect-[9/16] max-h-[680px] rounded-[var(--radius-card)] sm:aspect-[4/5]" : "min-h-[560px] h-[100svh]",
      )}
    >
      {!failed && (
        <video
          ref={video}
          src={src}
          muted={muted}
          playsInline
          preload="auto"
          onEnded={onEnded}
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 -z-10 h-full w-full object-cover transition-[opacity,transform,filter] duration-[1600ms] ease-out",
            ended && "scale-105 opacity-60 blur-[2px]",
          )}
        />
      )}
      {/* Without a video (or while it loads) a soft mauve background keeps the text readable. */}
      <div aria-hidden className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_top,#8a4f7d,#3c2446)]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-black transition-opacity duration-[1600ms]" style={{ opacity: ended ? Math.max(shade, 0.55) : shade }} />
      {/* Fades the bottom into the page colour, so the hand-over to the RSVP form is seamless. */}
      {!preview && <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-12 bg-gradient-to-b from-transparent to-linen" />}

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center [text-shadow:0_2px_18px_rgb(0_0_0/0.45)]">
        {greeting && (
          <p className="invite-rise mb-4 text-sm tracking-wide text-white/85" style={{ animationDelay: "0.2s" }}>
            {t("dear", { name: greeting })}
          </p>
        )}
        <p className="invite-rise text-xs font-medium uppercase tracking-[0.3em] text-white/85 sm:text-sm" style={{ animationDelay: "0.4s" }}>
          {headline || t("defaultHeadline")}
        </p>
        <h1
          className={cn("invite-rise mt-4 font-display font-light leading-[1.05]", preview ? "text-4xl" : "text-5xl sm:text-7xl")}
          style={{ animationDelay: "0.7s" }}
        >
          {partner1}
          <span className="mx-3 inline-block font-extralight text-white/80">&</span>
          {partner2}
        </h1>
        {dateLabel && (
          <p className={cn("invite-rise mt-5 tabular-nums tracking-[0.15em]", preview ? "text-base" : "text-lg sm:text-xl")} style={{ animationDelay: "1s" }}>
            {dateLabel}
          </p>
        )}
        <span aria-hidden className="invite-rise mt-6 block h-px w-24 bg-white/60" style={{ animationDelay: "1.2s" }} />
        {events.length > 0 && (
          <ul className="invite-rise mt-6 space-y-2.5" style={{ animationDelay: "1.4s" }}>
            {events.map((e) => (
              <li key={e.id} className={preview ? "text-sm" : "text-sm sm:text-base"}>
                <span className="font-semibold">{e.name}</span>
                {e.when && <span className="block text-white/85">{e.when}</span>}
              </li>
            ))}
          </ul>
        )}
        {message && (
          <p className={cn("invite-rise mt-6 max-w-md whitespace-pre-line text-white/90", preview ? "text-sm" : "text-base")} style={{ animationDelay: "1.7s" }}>
            {message}
          </p>
        )}
      </div>

      <div className={cn("relative flex min-h-24 items-end justify-between gap-3 px-4 sm:px-6", preview ? "pb-5" : "pb-14")}>
        <div className="flex gap-2">
          {!failed && !waiting && !ended && (
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? t("soundOn") : t("soundOff")}
              title={muted ? t("soundOn") : t("soundOff")}
              className="grid size-10 place-items-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25"
            >
              {muted ? <VolumeX aria-hidden className="size-5" /> : <Volume2 aria-hidden className="size-5" />}
            </button>
          )}
          {!failed && (waiting || ended) && (
            <button
              type="button"
              onClick={play}
              aria-label={ended ? t("replay") : t("play")}
              title={ended ? t("replay") : t("play")}
              className="grid size-10 place-items-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25"
            >
              {ended ? <RotateCcw aria-hidden className="size-5" /> : <Play aria-hidden className="size-5" />}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={preview ? undefined : toRsvp}
          className={cn("absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-sm font-medium", preview ? "bottom-3" : "bottom-12")}
        >
          <span className="rounded-full bg-white px-6 py-2.5 text-ink shadow-lg transition hover:bg-white/90">{t("respond")}</span>
          <ChevronDown aria-hidden className="invite-cue size-5 text-white/80" />
        </button>
        <span />
      </div>
    </section>
  );
}
