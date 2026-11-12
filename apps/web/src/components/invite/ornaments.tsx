import { useId } from "react";
import { cn } from "@/lib/utils";

/** Arched double frame with small flourishes, drawn in the theme's line colour (viewBox 300×460). */
export function ArchFrame({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 300 460" fill="none" className={cn("pointer-events-none", className)}>
      <g stroke="var(--inv-line)" strokeLinecap="round">
        <path d="M14 150C14 66 78 14 150 14s136 52 136 136v296H14z" strokeWidth="1.4" />
        <path d="M24 152C24 75 82 26 150 26s126 49 126 126v284H24z" strokeWidth="0.8" />
        {/* Keystone at the top of the arch. */}
        <path d="M138 14c4-9 8-12 12-12s8 3 12 12" strokeWidth="1" />
        <circle cx="150" cy="8" r="2" fill="var(--inv-line)" stroke="none" />
        {/* Corner curls at the bottom. */}
        <path d="M14 418c14 0 24 10 24 24M14 404c22 0 38 16 38 38" strokeWidth="0.9" />
        <path d="M286 418c-14 0-24 10-24 24M286 404c-22 0-38 16-38 38" strokeWidth="0.9" />
        {/* Leaves where the arch meets the sides. */}
        <path d="M14 150c-7-8-7-18 0-26 7 8 7 18 0 26zM286 150c-7-8-7-18 0-26 7 8 7 18 0 26z" strokeWidth="0.9" fill="var(--inv-paper)" />
      </g>
    </svg>
  );
}

/** A thin flourish with a small diamond in the middle, under section titles. */
export function Flourish({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 200 20" fill="none" className={cn("pointer-events-none", className)}>
      <g stroke="var(--inv-line)" strokeWidth="1" strokeLinecap="round">
        <path d="M88 10H30c-8 0-12-6-8-9 3-2 7 1 5 4" />
        <path d="M112 10h58c8 0 12-6 8-9-3-2-7 1-5 4" />
        <path d="M30 10c-10 0-16 4-22 0M170 10c10 0 16 4 22 0" />
      </g>
      <path d="M100 3l6 7-6 7-6-7z" fill="var(--inv-line)" />
    </svg>
  );
}

/** A satin bow, shaded with the theme's satin colours. */
export function Bow({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg aria-hidden viewBox="0 0 160 120" className={cn("pointer-events-none", className)}>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--inv-satin-1)" }} />
          <stop offset="0.45" style={{ stopColor: "var(--inv-satin-2)" }} />
          <stop offset="1" style={{ stopColor: "var(--inv-satin-3)" }} />
        </linearGradient>
        <filter id={`${id}d`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#3c2a3c" floodOpacity="0.25" />
        </filter>
      </defs>
      <g filter={`url(#${id}d)`} stroke="var(--inv-satin-3)" strokeWidth="0.8" fill={`url(#${id}s)`}>
        {/* Tails */}
        <path d="M74 58L46 116l14-4 8 8 14-56z" />
        <path d="M86 58l28 58-14-4-8 8-14-56z" />
        {/* Loops */}
        <path d="M76 52C56 22 18 14 10 30s14 40 40 34c12-3 20-8 26-12z" />
        <path d="M84 52c20-30 58-38 66-22s-14 40-40 34c-12-3-20-8-26-12z" />
        {/* Knot */}
        <ellipse cx="80" cy="54" rx="11" ry="13" />
      </g>
      {/* Sheen on the loops */}
      <g fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round">
        <path d="M22 30c10-6 30 0 46 18" />
        <path d="M138 30c-10-6-30 0-46 18" />
      </g>
    </svg>
  );
}
