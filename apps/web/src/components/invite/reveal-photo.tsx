"use client";

import { Hand } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Grid used to measure how much of the oval has been wiped. */
const COLS = 12;
const ROWS = 16;
/** Once this share of the oval is wiped, the rest clears by itself. */
const DONE_AT = 0.5;

/**
 * The couple's photo in an oval, frosted over. Swiping (or moving the mouse) across it wipes the frost
 * away like a scratch card; past half, the rest fades. Vertical swipes still scroll the page.
 * The frost is the photo drawn tiny and scaled up, which blurs it the same way in every browser.
 */
export function RevealPhoto({ src, alt }: { src: string; alt: string }) {
  const t = useTranslations("invite");
  const box = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const wiped = useRef(new Set<number>());
  const started = useRef(false);
  const [failed, setFailed] = useState(false);
  const [touched, setTouched] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [done, setDone] = useState(false);
  // The sharp photo stays hidden until the frost is painted over it, so it never flashes.
  const [painted, setPainted] = useState(false);

  /** Paints the frosted photo over the whole canvas (only before the first wipe). */
  function paint() {
    const c = canvas.current;
    const b = box.current;
    const i = img.current;
    if (!c || !b || started.current) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = b.clientWidth;
    const h = b.clientHeight;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const paper = getComputedStyle(b).getPropertyValue("--inv-paper").trim() || "#faf6fa";
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, w, h);
    if (i && i.complete && i.naturalWidth > 0) {
      // Cover-fit the photo into a tiny canvas, then stretch it back up: a soft blur.
      const small = document.createElement("canvas");
      small.width = 18;
      small.height = Math.round((18 * h) / w);
      const sctx = small.getContext("2d");
      if (sctx) {
        const scale = Math.max(small.width / i.naturalWidth, small.height / i.naturalHeight);
        const dw = i.naturalWidth * scale;
        const dh = i.naturalHeight * scale;
        sctx.drawImage(i, (small.width - dw) / 2, (small.height - dh) / 2, dw, dh);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(small, 0, 0, w, h);
      }
      // A pearly wash on top, so it reads as frosted glass rather than a bad photo.
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      setPainted(true);
    }
  }

  // The image may finish (or fail) before React attaches its handlers.
  useEffect(() => {
    const i = img.current;
    if (i?.complete) {
      if (i.naturalWidth === 0) setFailed(true);
      else paint();
    }
    const b = box.current;
    if (!b) return;
    const ro = new ResizeObserver(() => paint());
    ro.observe(b);
    return () => ro.disconnect();
  }, [src]);

  function finish() {
    setClearing(true);
    window.setTimeout(() => setDone(true), 700);
  }

  function wipe(x: number, y: number) {
    const c = canvas.current;
    const b = box.current;
    const ctx = c?.getContext("2d");
    if (!c || !b || !ctx || clearing) return;
    const w = b.clientWidth;
    const h = b.clientHeight;
    const r = w * 0.11;
    started.current = true;
    if (!touched) setTouched(true);
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = r * 2;
    ctx.beginPath();
    const from = last.current ?? { x, y };
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";

    // Mark grid cells along the stroke; only cells inside the oval count.
    const steps = Math.max(1, Math.ceil(Math.hypot(x - from.x, y - from.y) / (r / 2)));
    for (let s = 0; s <= steps; s++) {
      const px = from.x + ((x - from.x) * s) / steps;
      const py = from.y + ((y - from.y) * s) / steps;
      for (let cy = 0; cy < ROWS; cy++) {
        for (let cx = 0; cx < COLS; cx++) {
          const mx = ((cx + 0.5) * w) / COLS;
          const my = ((cy + 0.5) * h) / ROWS;
          if (Math.hypot(mx - px, my - py) <= r) wiped.current.add(cy * COLS + cx);
        }
      }
    }
    last.current = { x, y };
    let inside = 0;
    let hit = 0;
    for (let cy = 0; cy < ROWS; cy++) {
      for (let cx = 0; cx < COLS; cx++) {
        const nx = (cx + 0.5) / COLS - 0.5;
        const ny = (cy + 0.5) / ROWS - 0.5;
        if (nx * nx + ny * ny <= 0.25) {
          inside++;
          if (wiped.current.has(cy * COLS + cx)) hit++;
        }
      }
    }
    if (hit / inside >= DONE_AT) finish();
  }

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  if (failed) return null;

  return (
    <div className="mx-auto mt-8 w-[min(70%,15rem)] rounded-[50%] border border-[var(--inv-line)] p-2">
      <div ref={box} className="relative aspect-[3/4] overflow-hidden rounded-[50%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={img} src={src} alt={alt} onLoad={paint} onError={() => setFailed(true)} className={cn("absolute inset-0 h-full w-full object-cover", !painted && !done && "opacity-0")} />
        {!done && (
          <>
            <canvas
              ref={canvas}
              aria-hidden
              className={cn("absolute inset-0 h-full w-full cursor-grab touch-pan-y transition-opacity duration-700", clearing && "opacity-0")}
              onPointerDown={(e) => {
                last.current = point(e);
                wipe(last.current.x, last.current.y);
              }}
              onPointerMove={(e) => {
                // Touch and pen only wipe while pressed; a mouse wipes just by moving across.
                if (e.pointerType !== "mouse" && e.buttons === 0) return;
                const p = point(e);
                wipe(p.x, p.y);
              }}
              onPointerLeave={() => (last.current = null)}
              onPointerUp={() => (last.current = null)}
              onPointerCancel={() => (last.current = null)}
            />
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2 text-center text-[var(--inv-ink)] transition-opacity duration-500",
                touched && "opacity-0",
              )}
            >
              <Hand className="invite-swipe size-7" />
              <span className="px-6 text-base italic">{t("swipeToReveal")}</span>
            </div>
            <button type="button" onClick={finish} className="sr-only focus:not-sr-only focus:absolute focus:bottom-4 focus:left-1/2 focus:-translate-x-1/2 focus:rounded-full focus:bg-[var(--inv-paper)] focus:px-4 focus:py-2 focus:text-sm">
              {t("showPhoto")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
