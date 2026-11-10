"use client";

import { SAMPLE_INVITE_VIDEO } from "@svadba/shared";
import { ChevronDown, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type InviteEvent = { id: string; name: string; when: string };

/** Seconds between letters as the line above the names fills in. */
const LETTER = 0.08;

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
  const [run, setRun] = useState(0);
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
    setRun((n) => n + 1);
    void v.play().then(() => setWaiting(false));
  }

  const names = `${partner1} & ${partner2}`;
  const shade = Math.min(80, Math.max(0, overlay)) / 100;

  // The reveal, in order: greeting, the line above the names letter by letter, the names, then the rest.
  const line = headline || t("defaultHeadline");
  // Words keep their letters together, so a long line wraps between words; `at` is each letter's place in the line.
  let at = 0;
  const words = line.split(" ").map((w) => {
    const letters = Array.from(w).map((ch) => ({ ch, at: at++ }));
    at++; // a beat for the space
    return letters;
  });
  const start = greeting ? 0.9 : 0.4;
  const namesAt = start + at * LETTER + 0.5;
  const after = namesAt + 0.8 + 1.2; // once the second name has come into focus
  const T = {
    greeting: 0.2,
    line: start,
    names: namesAt,
    date: after,
    divider: after + 0.4,
    events: after + 0.8,
    message: after + 0.8 + events.length * 0.35 + (events.length ? 0.3 : 0),
  };

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

      {/* Keyed by `run`, so "Watch again" plays the text sequence again too. */}
      <div key={run} className="flex flex-1 flex-col items-center justify-center px-6 text-center [text-shadow:0_2px_18px_rgb(0_0_0/0.45)]">
        {greeting && (
          <p className="invite-rise mb-4 text-sm tracking-wide text-white/85" style={{ animationDelay: `${T.greeting}s` }}>
            {t("dear", { name: greeting })}
          </p>
        )}
        <p aria-label={line} className="text-xs font-medium uppercase tracking-[0.3em] text-white/85 sm:text-sm">
          {words.map((word, w) => (
            <Fragment key={w}>
              {w > 0 && " "}
              <span aria-hidden className="inline-block whitespace-nowrap">
                {word.map(({ ch, at }) => (
                  <span key={at} className="invite-letter" style={{ animationDelay: `${(T.line + at * LETTER).toFixed(3)}s` }}>
                    {ch}
                  </span>
                ))}
              </span>
            </Fragment>
          ))}
        </p>
        <h1 className={cn("mt-4 font-display font-light leading-[1.05]", preview ? "text-4xl" : "text-5xl sm:text-7xl")}>
          <span className="invite-name" style={{ animationDelay: `${T.names}s` }}>
            {partner1}
          </span>
          <span className="invite-name mx-3 font-extralight text-white/80" style={{ animationDelay: `${T.names + 0.4}s` }}>
            &
          </span>
          <span className="invite-name" style={{ animationDelay: `${T.names + 0.8}s` }}>
            {partner2}
          </span>
        </h1>
        {dateLabel && (
          <p className={cn("invite-rise mt-5 tabular-nums tracking-[0.15em]", preview ? "text-base" : "text-lg sm:text-xl")} style={{ animationDelay: `${T.date}s` }}>
            {dateLabel}
          </p>
        )}
        <span aria-hidden className="invite-line mt-6 block h-px w-24 bg-white/60" style={{ animationDelay: `${T.divider}s` }} />
        {events.length > 0 && (
          <ul className="mt-6 space-y-2.5">
            {events.map((e, i) => (
              <li
                key={e.id}
                className={cn("invite-rise", preview ? "text-sm" : "text-sm sm:text-base")}
                style={{ animationDelay: `${(T.events + i * 0.35).toFixed(2)}s` }}
              >
                <span className="font-semibold">{e.name}</span>
                {e.when && <span className="block text-white/85">{e.when}</span>}
              </li>
            ))}
          </ul>
        )}
        {message && (
          <p className={cn("invite-rise mt-6 max-w-md whitespace-pre-line text-white/90", preview ? "text-sm" : "text-base")} style={{ animationDelay: `${T.message}s` }}>
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
