"use client";

import {
  Cake,
  CalendarHeart,
  Camera,
  Car,
  Church,
  DoorOpen,
  Gem,
  Home,
  Landmark,
  Music,
  PartyPopper,
  Shirt,
  Sparkles,
  Users,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from "lucide-react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Icons a journey dot can show (decision 123). Picked on the server, drawn here. */
export const JOURNEY_ICONS = {
  home: Home,
  church: Church,
  civil: Landmark,
  party: PartyPopper,
  ring: Gem,
  sparkles: Sparkles,
  calendar: CalendarHeart,
  camera: Camera,
  dinner: UtensilsCrossed,
  music: Music,
  cake: Cake,
  car: Car,
  dress: Shirt,
  guests: Users,
  entrance: DoorOpen,
  toast: Wine,
} satisfies Record<string, LucideIcon>;
export type JourneyIcon = keyof typeof JOURNEY_ICONS;

export type JourneyDot = { id: string; icon: JourneyIcon | null; time?: string; label: string; done: boolean; accent: boolean };
export type JourneyRow = {
  id: string;
  title?: string;
  href?: string;
  /** Share of this row's line drawn in the accent colour, from where the line enters (decision 123). */
  progress: number;
  dots?: JourneyDot[];
  content?: ReactNode;
};

/** Turn radius and the gap left for it on each side, in px. */
const R = 56;
/** Where the line sits inside a row, from its top, in px (room for dot icons above it). */
const LINE_Y = 58;
/** Dot positions along a row, from where the line enters (the start is left for the station title). */
const SLOTS = [0.32, 0.57, 0.82];
const CIRCLE = 176;

/**
 * The journey overview (decision 122): a line winding from the couple's circle through every station.
 * Rows alternate direction; the SVG line is measured from the rows, so content can be any height.
 * On phones (below sm) it is a straight vertical line instead (decision 124).
 */
export function Journey({
  partner1,
  partner2,
  rows,
}: {
  partner1: string;
  partner2: string;
  rows: JourneyRow[];
}) {
  const box = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [geo, setGeo] = useState<{ w: number; ys: number[]; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top;
      setGeo({
        w: el.clientWidth,
        h: el.scrollHeight,
        ys: rowRefs.current.map((r) => (r ? r.getBoundingClientRect().top - top + LINE_Y : 0)),
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("beforeprint", measure);
    window.addEventListener("afterprint", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("beforeprint", measure);
      window.removeEventListener("afterprint", measure);
    };
  }, [rows.length]);

  const pieces = geo ? roadPieces(geo.w, geo.ys, rows) : [];

  return (
    <div ref={box} className="relative mx-auto max-w-3xl">
      {geo && (
        <svg
          aria-hidden
          width={geo.w}
          height={geo.h}
          className="journey-reveal pointer-events-none absolute inset-0 hidden sm:block"
          fill="none"
          strokeLinecap="round"
        >
          {pieces.map((p, i) => (
            <g key={i}>
              <path d={p.d} stroke="var(--color-ink)" strokeOpacity={0.8} strokeWidth={3} />
              {p.accent && <path d={p.accent} stroke="var(--color-vranec)" strokeWidth={3.5} />}
            </g>
          ))}
        </svg>
      )}

      <CoupleCircle partner1={partner1} partner2={partner2} />

      {/* Phones: one straight line down the left (decision 124). */}
      <div className="relative">
        <span aria-hidden className="absolute bottom-0 left-[7px] top-0 w-0.5 bg-ink/70 sm:hidden" />
        {rows.map((row, i) => {
          const rtl = i % 2 === 1;
          return (
            <div
              key={row.id}
              ref={(r) => {
                rowRefs.current[i] = r;
              }}
              className={cn("relative pb-6 pl-8 sm:pb-10 sm:pl-0 print:break-inside-avoid", !!row.dots?.length && "sm:min-h-[196px]")}
            >
              {/* Station title: above the line where it enters (desktop), or as a heading (phones). */}
              {row.title && (
                <h2
                  className={cn(
                    "relative z-[1] mb-1 font-display text-lg text-ink sm:absolute sm:mb-0 sm:text-xl",
                    i === 0 ? "sm:left-1/2 sm:ml-6" : rtl ? "sm:right-[64px]" : "sm:left-[64px]",
                  )}
                >
                  <span aria-hidden className="absolute -left-8 top-1.5 size-4 rounded-full border-2 border-ink/70 bg-linen sm:hidden" />
                  {row.href ? (
                    <Link href={row.href} className="hover:text-vranec sm:inline-block sm:-translate-y-0 sm:pt-[16px]">
                      {row.title}
                    </Link>
                  ) : (
                    <span className="sm:inline-block sm:pt-[16px]">{row.title}</span>
                  )}
                </h2>
              )}

              {row.dots && row.dots.length > 0 && (
                <>
                  <ol className="hidden sm:block">
                    {row.dots.map((dot, k) => {
                      const at = SLOTS[k] ?? 0.5;
                      const x = `calc(${R}px + (100% - ${2 * R}px) * ${rtl ? 1 - at : at})`;
                      return (
                        <li key={dot.id} className="absolute w-36 -translate-x-1/2 text-center" style={{ left: x, top: 0 }}>
                          <DotIcon dot={dot} />
                          <span
                            aria-hidden
                            className={cn(
                              "absolute left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-linen",
                              dot.accent || dot.done ? "bg-vranec" : "bg-ink/80",
                            )}
                            style={{ top: LINE_Y }}
                          />
                          <span className="block pt-[74px] text-sm leading-tight">
                            {dot.time && <span className="block font-semibold tabular-nums text-ink">{dot.time}</span>}
                            <span className="text-ink-soft">{dot.label}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                  <ol className="space-y-2 sm:hidden">
                    {row.dots.map((dot) => {
                      const Icon = dot.icon ? JOURNEY_ICONS[dot.icon] : null;
                      return (
                        <li key={dot.id} className="relative flex items-center gap-2 text-sm">
                          <span
                            aria-hidden
                            className={cn(
                              "absolute -left-[29px] size-2.5 rounded-full",
                              dot.accent || dot.done ? "bg-vranec" : "bg-ink/80",
                            )}
                          />
                          {Icon && <Icon aria-hidden className={cn("size-4 shrink-0", dot.accent ? "text-vranec" : "text-ink-soft")} />}
                          {dot.time && <span className="font-semibold tabular-nums">{dot.time}</span>}
                          <span className="text-ink-soft">{dot.label}</span>
                        </li>
                      );
                    })}
                  </ol>
                </>
              )}

              {row.content && (
                <div
                  className={cn(
                    "text-sm text-ink-soft sm:px-[72px]",
                    row.dots?.length ? "" : "sm:pt-[74px]",
                    i === 0 && "sm:pl-[calc(50%+24px)]",
                  )}
                >
                  {row.content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DotIcon({ dot }: { dot: JourneyDot }) {
  const Icon = dot.icon ? JOURNEY_ICONS[dot.icon] : null;
  if (!Icon) return null;
  return (
    <Icon
      aria-hidden
      strokeWidth={1.6}
      className={cn("mx-auto mt-1 size-8", dot.accent ? "text-vranec" : "text-ink-soft")}
    />
  );
}

/** The couple's names curved over a circle with their monogram and the stitch mark (decision 122). */
function CoupleCircle({ partner1, partner2 }: { partner1: string; partner2: string }) {
  const initials = `${partner1.trim()[0] ?? ""}${partner2.trim()[0] ?? ""}`.toUpperCase();
  const names = `${partner1} & ${partner2}`;
  const r = CIRCLE / 2;
  return (
    <div className="relative mx-auto mb-2 hidden sm:block" style={{ width: CIRCLE + 80, height: CIRCLE + 40 }}>
      <svg viewBox={`0 0 ${CIRCLE + 80} ${CIRCLE + 40}`} className="h-full w-full" aria-label={names} role="img">
        <defs>
          {/* Names run over the top of the circle, just outside it. */}
          <path id="journey-arc" d={`M ${r + 40 - (r - 4)} ${r + 30} A ${r - 4} ${r - 4} 0 0 1 ${r + 40 + (r - 4)} ${r + 30}`} />
        </defs>
        <circle cx={r + 40} cy={r + 30} r={r - 14} fill="var(--color-surface)" stroke="var(--color-ink)" strokeOpacity={0.8} strokeWidth={3} />
        <circle cx={r + 40} cy={r + 30} r={r - 24} fill="none" stroke="var(--color-vranec)" strokeOpacity={0.35} strokeDasharray="2 5" />
        <text className="fill-ink font-display" fontSize={19} letterSpacing={1.5} textAnchor="middle">
          <textPath href="#journey-arc" startOffset="50%">
            {names}
          </textPath>
        </text>
        <text x={r + 40} y={r + 42} textAnchor="middle" className="fill-vranec font-display" fontSize={42} letterSpacing={2}>
          {initials}
        </text>
        <g transform={`translate(${r + 33} ${r + 56})`} stroke="var(--color-vranec)" strokeWidth={1.8} strokeLinecap="round">
          <path d="M1.5 1.5l11 11M12.5 1.5l-11 11" />
        </g>
      </svg>
    </div>
  );
}

/** Builds the winding line: one piece per row (the turn into it + its straight line), plus the accent overlay. */
function roadPieces(w: number, ys: number[], rows: JourneyRow[]) {
  const left = R;
  const right = w - R;
  const out: { d: string; accent: string | null }[] = [];
  const startX = w / 2;
  for (let i = 0; i < rows.length; i++) {
    const y = ys[i]!;
    const rtl = i % 2 === 1;
    // Where this row's line starts (entry) and ends (exit).
    const first = Math.min(R, 40);
    const entry = i === 0 ? startX + first : rtl ? right : left;
    const exit = rtl ? left : right;
    let turn = "";
    if (i === 0) {
      // Down from the couple's circle, then a curve into the first row.
      turn = `M ${startX} ${CIRCLE + 14} L ${startX} ${y - first} A ${first} ${first} 0 0 0 ${startX + first} ${y}`;
    } else {
      const py = ys[i - 1]!;
      const r = Math.min(R, (y - py) / 2);
      const side = rtl ? right : left; // the previous row exited on this side
      const outX = rtl ? side + r : side - r;
      const sweep = rtl ? 1 : 0;
      turn = `M ${side} ${py} A ${r} ${r} 0 0 ${sweep} ${outX} ${py + r} L ${outX} ${y - r} A ${r} ${r} 0 0 ${sweep} ${side} ${y}`;
    }
    const line = `M ${entry} ${y} L ${exit} ${y}`;
    const p = Math.max(0, Math.min(1, rows[i]!.progress));
    const prevDone = i > 0 && rows[i - 1]!.progress >= 1;
    const accentLine = p > 0 ? `M ${entry} ${y} L ${entry + (exit - entry) * p} ${y}` : "";
    const accent = [prevDone && i > 0 ? turn : "", accentLine].filter(Boolean).join(" ") || null;
    out.push({ d: `${turn} ${line}`, accent });
  }
  return out;
}
