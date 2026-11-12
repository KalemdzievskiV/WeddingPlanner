"use client";

import { type InviteThemeKey, SAMPLE_INVITE_VIDEO } from "@svadba/shared";
import { ChevronDown, Music, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { inviteFontClass } from "@/lib/invite-fonts";
import { cn } from "@/lib/utils";
import { ArchFrame, Bow } from "./ornaments";
import { InviteSection } from "./invite-section";

/** closed → (tap) opening: seal breaks, flaps slide away → untie: the ribbon comes off → done: the envelope fades → gone. */
type Phase = "closed" | "opening" | "untie" | "done" | "gone";

const REDUCED = "(prefers-reduced-motion: reduce)";
const prefersReducedMotion = () => window.matchMedia(REDUCED).matches;
function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** Seconds between letters as the line above the names fills in. */
const LETTER = 0.07;

export type DesignedInviteProps = {
  theme: InviteThemeKey;
  videoUrl: string | null;
  /** 0–80: how strongly the video is washed out behind the frame. */
  overlay: number;
  headline: string | null;
  message: string | null;
  partner1: string;
  partner2: string;
  dateLabel: string;
  venue: string | null;
  /** Who the invitation is for, e.g. the family or guest name. */
  greeting?: string;
  /** Shown in an oval next to the countdown (the invitation picture). */
  photoUrl: string | null;
  /** Local wall-clock time "YYYY-MM-DDTHH:MM" to count down to; null hides the countdown. */
  countdownTo: string | null;
  /** Path of a built-in track, started by the tap on the seal. */
  musicSrc: string | null;
  /** Drawn in a phone-sized box (the editor) instead of the whole page. */
  preview?: boolean;
  /** Pinned to the top right corner, above the envelope (the language switcher). */
  corner?: ReactNode;
  /** The sections after the countdown (The Day, location, RSVP). */
  children?: ReactNode;
};

/**
 * The designed invitation (decision 130): an envelope the guest opens by tapping the wax seal,
 * then the cover with the couple's video softly behind an arched frame, a countdown, and the
 * sections passed as children. Reduced motion skips the envelope.
 */
export function DesignedInvite(props: DesignedInviteProps) {
  const { theme, preview = false, corner, children, musicSrc } = props;
  const t = useTranslations("invite");
  const [run, setRun] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const timers = useRef<number[]>([]);

  const [state, setPhase] = useState<Phase>("closed");
  // Reduced motion: no envelope, straight to the card.
  const reduced = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
  const phase: Phase = reduced ? "gone" : state;

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  // The page can't scroll away from the closed envelope.
  useEffect(() => {
    if (preview || phase === "gone" || phase === "done") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase, preview]);

  // Pause sound when the guest leaves the tab.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) {
        audio.current?.pause();
        setSoundOn(false);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  useEffect(() => () => audio.current?.pause(), []);

  // The video is muted (browsers only autoplay muted video); with music, the music is the sound.
  useEffect(() => {
    if (video.current) video.current.muted = musicSrc ? true : !soundOn;
  }, [soundOn, musicSrc]);

  function open() {
    if (phase !== "closed") return;
    // A tap counts as permission to play sound, so the music can start here.
    if (musicSrc) {
      audio.current ??= Object.assign(new Audio(musicSrc), { loop: true, volume: 0.6 });
      audio.current.play().then(
        () => setSoundOn(true),
        () => setSoundOn(false),
      );
    }
    setPhase("opening");
    const at = (ms: number, p: Phase) => timers.current.push(window.setTimeout(() => setPhase(p), ms));
    at(1500, "untie");
    at(2500, "done");
    at(3400, "gone");
  }

  function toggleSound() {
    if (musicSrc) {
      const a = (audio.current ??= Object.assign(new Audio(musicSrc), { loop: true, volume: 0.6 }));
      if (soundOn) {
        a.pause();
        setSoundOn(false);
      } else {
        void a.play().then(() => setSoundOn(true));
      }
    } else {
      setSoundOn((s) => !s);
    }
  }

  /** Editor only: close the envelope again to watch the opening once more. */
  function replay() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    audio.current?.pause();
    setSoundOn(false);
    setPhase("closed");
    setRun((n) => n + 1);
  }

  const revealed = phase === "done" || phase === "gone";
  const hasSound = !!musicSrc || !videoFailed;

  return (
    <div
      data-theme={theme}
      className={cn(
        "inv inv-serif relative isolate",
        inviteFontClass,
        preview ? "h-[680px] overflow-y-auto overflow-x-hidden rounded-[var(--radius-card)] border border-line shadow-[var(--shadow-card)]" : "min-h-[100svh]",
      )}
    >
      {corner && <div className={cn("right-3 top-3 z-50 rounded-lg bg-white/80 backdrop-blur", preview ? "absolute" : "fixed")}>{corner}</div>}

      {phase !== "gone" && <Envelope phase={phase} onOpen={open} greeting={props.greeting} partner1={props.partner1} partner2={props.partner2} preview={preview} />}

      <Cover {...props} preview={preview} revealed={revealed} run={run} videoRef={video} onVideoError={() => setVideoFailed(true)} />

      {props.countdownTo && <Countdown to={props.countdownTo} photoUrl={props.photoUrl} message={props.message} couple={`${props.partner1} & ${props.partner2}`} />}
      {!props.countdownTo && props.message && (
        <InviteSection>
          <p className="mx-auto max-w-sm whitespace-pre-line text-center text-lg italic">{props.message}</p>
        </InviteSection>
      )}

      {children}

      <footer className="pb-16 pt-4 text-center">
        <p className="inv-script text-4xl text-[var(--inv-accent)]">
          {props.partner1} & {props.partner2}
        </p>
        {props.dateLabel && <p className="mt-2 text-sm tracking-[0.25em] text-[var(--inv-soft)]">{props.dateLabel}</p>}
      </footer>

      {revealed && (hasSound || preview) && (
        <div className={cn("bottom-4 right-4 z-40 flex gap-2", preview ? "sticky float-right -mt-14 mb-4 mr-4 w-fit" : "fixed")}>
          {preview && (
            <button type="button" onClick={replay} className="h-10 rounded-full bg-[var(--inv-paper)]/90 px-4 text-sm font-medium shadow-md backdrop-blur">
              {t("replayEnvelope")}
            </button>
          )}
          {hasSound && (
            <button
              type="button"
              onClick={toggleSound}
              aria-label={soundOn ? t("soundOff") : musicSrc ? t("musicOn") : t("soundOn")}
              title={soundOn ? t("soundOff") : musicSrc ? t("musicOn") : t("soundOn")}
              className="grid size-10 place-items-center rounded-full bg-[var(--inv-paper)]/90 text-[var(--inv-accent)] shadow-md backdrop-blur transition hover:scale-105"
            >
              {soundOn ? <Volume2 aria-hidden className="size-5" /> : musicSrc ? <Music aria-hidden className="size-5" /> : <VolumeX aria-hidden className="size-5" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** The closed envelope: four embossed flaps meeting under a wax seal, with a ribboned card inside. */
function Envelope({
  phase,
  onOpen,
  greeting,
  partner1,
  partner2,
  preview,
}: {
  phase: Phase;
  onOpen: () => void;
  greeting?: string;
  partner1: string;
  partner2: string;
  preview: boolean;
}) {
  const t = useTranslations("invite");
  const opening = phase !== "closed";
  const untied = phase === "untie" || phase === "done";
  const initials = `${Array.from(partner1.trim())[0] ?? ""}${Array.from(partner2.trim())[0] ?? ""}`;
  const flap = (style: string) => cn("inv-flap", opening && style);

  return (
    <div
      className={cn(
        "inset-0 z-40 overflow-hidden bg-[var(--inv-bg)] transition-opacity duration-[900ms]",
        preview ? "absolute h-[680px]" : "fixed",
        phase === "done" && "pointer-events-none opacity-0",
      )}
    >
      {/* Inside: the card with a satin ribbon and bow. */}
      <div className="inv-paper inv-grain absolute inset-0">
        <div className={cn("inv-satin absolute left-1/2 top-0 h-1/2 w-12 -translate-x-1/2 transition-transform duration-[900ms] ease-in", untied && "-translate-y-full")} />
        <div className={cn("inv-satin absolute bottom-0 left-1/2 h-1/2 w-12 -translate-x-1/2 transition-transform duration-[900ms] ease-in", untied && "translate-y-full")} />
        <Bow className={cn("absolute left-1/2 top-1/2 w-44 -translate-x-1/2 -translate-y-[45%] transition-[opacity,transform] duration-700", untied && "scale-125 opacity-0")} />
      </div>

      {/* Flaps: bottom, sides, then the top one with the greeting. */}
      <div className={flap("translate-y-[105%] [transition-delay:250ms]")}>
        <div className="inv-face inv-grain" style={{ clipPath: "polygon(0 100%, 50% 47%, 100% 100%)", background: "linear-gradient(0deg, var(--inv-satin-2), var(--inv-satin-1) 80%)" }} />
      </div>
      <div className={flap("-translate-x-[105%] [transition-delay:120ms]")}>
        <div className="inv-face inv-grain" style={{ clipPath: "polygon(0 0, 52% 50%, 0 100%)", background: "linear-gradient(90deg, var(--inv-satin-2), var(--inv-satin-1) 85%)" }} />
      </div>
      <div className={flap("translate-x-[105%] [transition-delay:120ms]")}>
        <div className="inv-face inv-grain" style={{ clipPath: "polygon(100% 0, 48% 50%, 100% 100%)", background: "linear-gradient(270deg, var(--inv-satin-2), var(--inv-satin-1) 85%)" }} />
      </div>
      <div className={flap("-translate-y-[105%]")}>
        <div className="inv-face inv-grain" style={{ clipPath: "polygon(0 0, 100% 0, 50% 54%)", background: "linear-gradient(180deg, var(--inv-paper), var(--inv-satin-1) 70%, var(--inv-satin-2))" }} />
        <div className="absolute inset-x-0 top-[17%] px-10 text-center">
          {greeting && <p className="text-sm uppercase tracking-[0.3em] text-[var(--inv-soft)]">{t("for")}</p>}
          <p className="inv-script mt-1 text-4xl leading-tight text-[var(--inv-accent)] sm:text-5xl">{greeting ?? `${partner1} & ${partner2}`}</p>
        </div>
      </div>

      {/* The wax seal: tap to open. */}
      <button
        type="button"
        onClick={onOpen}
        disabled={opening}
        aria-label={t("tapToOpen")}
        className={cn(
          "absolute left-1/2 top-1/2 z-10 grid size-24 -translate-x-1/2 -translate-y-1/2 place-items-center transition-[opacity,transform] duration-500",
          opening && "scale-150 opacity-0",
        )}
      >
        <span className={cn("inv-seal grid size-24 place-items-center", !opening && "inv-pulse")}>
          <span className="grid size-[4.5rem] place-items-center rounded-full border border-white/35 shadow-[inset_0_2px_4px_rgb(0_0_0/0.25)]">
            <span className="inv-script text-3xl text-white/90 [text-shadow:0_-1px_0_rgb(0_0_0/0.3)]">{initials}</span>
          </span>
        </span>
      </button>
      <p
        className={cn(
          "absolute inset-x-0 top-[calc(50%+4.5rem)] z-10 px-6 text-center text-lg italic text-[var(--inv-ink)] transition-opacity duration-300",
          opening && "opacity-0",
        )}
      >
        {t("tapToOpen")}
      </p>
    </div>
  );
}

/** The first card: names, date and place in an arched frame, with the video softly behind. */
function Cover({
  videoUrl,
  overlay,
  headline,
  partner1,
  partner2,
  dateLabel,
  venue,
  greeting,
  preview,
  revealed,
  run,
  videoRef,
  onVideoError,
}: DesignedInviteProps & { revealed: boolean; run: number; videoRef: React.RefObject<HTMLVideoElement | null>; onVideoError: () => void }) {
  const t = useTranslations("invite");
  const [failed, setFailed] = useState(false);
  const section = useRef<HTMLElement>(null);
  const src = videoUrl || SAMPLE_INVITE_VIDEO;
  const wash = 0.25 + (Math.min(80, Math.max(0, overlay)) / 80) * 0.6;

  // Starts muted (browsers only autoplay muted video); reduced motion leaves it on the first frame.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || prefersReducedMotion()) return;
    v.muted = true;
    void v.play().catch(() => undefined);
  }, [videoRef, src]);

  const line = headline || t("defaultHeadline");
  let at = 0;
  const words = line.split(" ").map((w) => {
    const letters = Array.from(w).map((ch) => ({ ch, at: at++ }));
    at++;
    return letters;
  });
  const start = greeting ? 0.7 : 0.3;
  const namesAt = start + at * LETTER + 0.3;
  const after = namesAt + 1.6;

  const next = () => (section.current?.nextElementSibling as HTMLElement | null)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <section ref={section} className={cn("relative flex flex-col items-center justify-center overflow-hidden px-4 py-14", preview ? "min-h-[680px]" : "min-h-[100svh]")}>
      {!failed && (
        <video
          key={src}
          ref={videoRef}
          src={src}
          muted
          loop
          playsInline
          preload="auto"
          onError={() => {
            setFailed(true);
            onVideoError();
          }}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
      )}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[var(--inv-paper)]" style={{ opacity: failed ? 0.6 : wash }} />
      <div aria-hidden className="inv-grain absolute inset-0 -z-10" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-b from-transparent to-[var(--inv-bg)]" />

      <div className="relative aspect-[300/460] w-[min(86%,23rem)]">
        <div aria-hidden className="absolute inset-[3%] rounded-t-full bg-[var(--inv-paper)]/70 backdrop-blur-[2px]" />
        <ArchFrame className="absolute inset-0 h-full w-full" />
        {/* Keyed so "replay" in the editor plays the words again after the envelope. */}
        <div key={run} className="absolute inset-0 flex flex-col items-center justify-center px-[13%] pb-[8%] pt-[24%] text-center">
          {revealed && (
            <>
              {greeting && (
                <p className="invite-rise text-base italic text-[var(--inv-soft)]" style={{ animationDelay: "0.1s" }}>
                  {t("dear", { name: greeting })}
                </p>
              )}
              <p aria-label={line} className="mt-2 text-xs font-medium uppercase tracking-[0.28em] text-[var(--inv-soft)]">
                {words.map((word, w) => (
                  <Fragment key={w}>
                    {w > 0 && " "}
                    <span aria-hidden className="inline-block whitespace-nowrap">
                      {word.map(({ ch, at }) => (
                        <span key={at} className="invite-letter" style={{ animationDelay: `${(start + at * LETTER).toFixed(3)}s` }}>
                          {ch}
                        </span>
                      ))}
                    </span>
                  </Fragment>
                ))}
              </p>
              <h1 className={cn("inv-script mt-3 leading-[1.05] text-[var(--inv-accent)]", preview ? "text-5xl" : "text-[clamp(2.75rem,13vw,4.25rem)]")}>
                <span className="block">
                  <span className="invite-name" style={{ animationDelay: `${namesAt}s` }}>
                    {partner1}
                  </span>
                </span>
                <span className="block text-[0.6em] text-[var(--inv-soft)]">
                  <span className="invite-name" style={{ animationDelay: `${namesAt + 0.4}s` }}>
                    &
                  </span>
                </span>
                <span className="block">
                  <span className="invite-name" style={{ animationDelay: `${namesAt + 0.8}s` }}>
                    {partner2}
                  </span>
                </span>
              </h1>
              {dateLabel && (
                <p className="invite-rise mt-4 text-lg font-medium tabular-nums tracking-[0.2em]" style={{ animationDelay: `${after}s` }}>
                  {dateLabel}
                </p>
              )}
              {venue && (
                <p className="invite-rise mt-1 text-xs uppercase tracking-[0.25em] text-[var(--inv-soft)]" style={{ animationDelay: `${after + 0.3}s` }}>
                  {venue}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <button type="button" onClick={next} aria-label={t("scroll")} className="mt-6 flex flex-col items-center gap-1 text-xs uppercase tracking-[0.3em] text-[var(--inv-soft)]">
        {t("scroll")}
        <ChevronDown aria-hidden className="invite-cue size-5" />
      </button>
    </section>
  );
}

/** Days, hours, minutes and seconds to the start, with the invitation picture and the couple's message. */
function Countdown({ to, photoUrl, message, couple }: { to: string; photoUrl: string | null; message: string | null; couple: string }) {
  const t = useTranslations("invite");
  // Unknown on the server (its clock and time zone differ), so it fills in after the page loads.
  const [now, setNow] = useState<number | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  const [d, tm] = to.split("T");
  const [y, mo, da] = (d ?? "").split("-").map(Number);
  const [h, mi] = (tm ?? "00:00").split(":").map(Number);
  const target = new Date(y!, (mo ?? 1) - 1, da ?? 1, h ?? 0, mi ?? 0).getTime();
  const left = now == null ? null : Math.max(0, target - now);
  const parts =
    left == null
      ? null
      : [Math.floor(left / 86_400_000), Math.floor(left / 3_600_000) % 24, Math.floor(left / 60_000) % 60, Math.floor(left / 1000) % 60];
  const labels = [t("days"), t("hours"), t("minutes"), t("seconds")];

  return (
    <InviteSection title={t("countdown")}>
      {left === 0 ? (
        <p className="inv-script text-center text-4xl text-[var(--inv-accent)]">{t("countdownDone")}</p>
      ) : (
        <div className="inv-paper mx-auto grid max-w-sm grid-cols-4 divide-x divide-[var(--inv-line)]/60 rounded-2xl py-4" role="timer" aria-live="off">
          {labels.map((label, i) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-medium tabular-nums">{parts ? String(parts[i]).padStart(i === 0 ? 1 : 2, "0") : "–"}</p>
              <p className="mt-1 text-[0.65rem] uppercase tracking-[0.2em] text-[var(--inv-soft)]">{label}</p>
            </div>
          ))}
        </div>
      )}
      {message && <p className="mx-auto mt-8 max-w-sm whitespace-pre-line text-center text-lg italic">{message}</p>}
      {photoUrl && !photoFailed && (
        <div className="mx-auto mt-8 w-[min(70%,15rem)] rounded-[50%] border border-[var(--inv-line)] p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt={t("photoAlt", { couple })} onError={() => setPhotoFailed(true)} className="aspect-[3/4] w-full rounded-[50%] object-cover" />
        </div>
      )}
    </InviteSection>
  );
}
