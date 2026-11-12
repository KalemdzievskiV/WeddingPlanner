"use client";

import type { GuestRole } from "@svadba/shared";
import { memo, useId } from "react";

/**
 * Guests on the seating plan (decision 132): a small person seen from above, sitting on a chair, with the name
 * curving around it. Our own drawing. Units are plan units; the figure faces "up" (−y) before it is turned.
 */

export type FigureLook = { side: "BRIDE" | "GROOM" | "BOTH"; child: boolean; role: GuestRole | null };

/** Shirt colour per side (coloured figures); plain figures are all the same grey. */
const SHIRT: Record<FigureLook["side"] | "PLAIN", [fill: string, stroke: string]> = {
  BRIDE: ["#dcbcd5", "#b48aab"],
  GROOM: ["#b6c6dd", "#869cbd"],
  BOTH: ["#c6d3b8", "#97a985"],
  PLAIN: ["#cdc6d2", "#a59dab"],
};
const SKIN = ["#f2cfae", "#cfa47f"] as const;
const HAIR = "#3b2f38";

/** The figure itself, centred on the chair, facing up. */
export const FigureShape = memo(function FigureShape({ look, plain }: { look: FigureLook; plain: boolean }) {
  const bride = !plain && look.role === "BRIDE";
  const groom = !plain && look.role === "GROOM";
  const [shirt, shirtLine] = bride ? ["#fdfbfd", "#d6c3d8"] : groom ? ["#3a3140", "#241d29"] : SHIRT[plain ? "PLAIN" : look.side];
  return (
    <g transform={look.child ? "scale(0.8)" : undefined}>
      {/* chair back */}
      <rect x={-11} y={1.5} width={22} height={10.5} rx={4} fill="var(--color-line-strong)" />
      {bride && <ellipse cx={0} cy={4.5} rx={9.5} ry={8} fill="#ffffff" fillOpacity={0.9} stroke="#e4d6e6" strokeWidth={0.6} />}
      <ellipse cx={0} cy={3} rx={bride ? 13.5 : 12.5} ry={bride ? 7.4 : 6.8} fill={shirt} stroke={shirtLine} strokeWidth={0.8} />
      {groom && <circle cx={-8.6} cy={0.6} r={1.5} fill="var(--color-vranec)" />}
      <circle cx={-8.5} cy={-5.6} r={2.4} fill={SKIN[0]} stroke={SKIN[1]} strokeWidth={0.6} />
      <circle cx={8.5} cy={-5.6} r={2.4} fill={SKIN[0]} stroke={SKIN[1]} strokeWidth={0.6} />
      <circle cx={0} cy={-0.5} r={7.2} fill={SKIN[0]} stroke={SKIN[1]} strokeWidth={0.6} />
      {/* hair over the back of the head, a soft fringe at the front */}
      <path d="M -6.82 -2.8 Q 0 -4.9 6.82 -2.8 A 7.2 7.2 0 1 1 -6.82 -2.8 Z" fill={HAIR} />
      {bride && <circle cx={0} cy={6.4} r={2.6} fill={HAIR} />}
    </g>
  );
});

/** An empty chair: dashed ring with its seat number. */
export function EmptyChair({ number, hidden }: { number: number; hidden?: boolean }) {
  return (
    <g opacity={hidden ? 0.45 : 1}>
      <circle r={11} fill="var(--color-surface)" fillOpacity={0.85} stroke="var(--color-line-strong)" strokeWidth={1.1} strokeDasharray="2.6 2" />
      <text textAnchor="middle" dominantBaseline="central" fontSize={hidden ? 7 : 8.5} fill="var(--color-stone)">
        {hidden ? "—" : number}
      </text>
    </g>
  );
}

const NAME_SIZE = 6.2;
const INNER = 15.5;
const LINE = 7;

/**
 * The guest's name curving around the chair, centred on `angle` (radians, screen coordinates, 0 = right),
 * which points away from the table. Below the chair the arc runs the other way so the text stays upright.
 * Full names use two arcs, so they read first name, then surname, from top to bottom.
 */
export const SeatName = memo(function SeatName({ name, firstOnly, angle }: { name: string; firstOnly: boolean; angle: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const words = name.trim().split(/\s+/).filter(Boolean);
  const lines = firstOnly || words.length < 2 ? [words[0] ?? ""] : [words[0]!, words.slice(1).join(" ")];
  const lower = Math.sin(angle) > 0.05;
  return (
    <g pointerEvents="none" className="seat-name">
      {lines.map((text, i) => {
        // Below the chair the letters hang inside the arc, so push the baseline out by their height.
        // Read top to bottom, the first name always comes first: outer arc above the chair, inner arc below it.
        const ring = lower ? i : lines.length - 1 - i;
        const r = INNER + ring * LINE + (lower ? NAME_SIZE * 0.72 : 0);
        const need = (text.length * NAME_SIZE * 0.56) / r;
        const size = need > Math.PI * 1.6 ? (NAME_SIZE * Math.PI * 1.6) / need : NAME_SIZE;
        const span = Math.min(Math.PI * 1.8, Math.max(need, 0.5) + 0.4);
        return (
          <g key={i}>
            <path id={`${id}-${i}`} d={arc(r, angle, span, lower)} fill="none" />
            <text
              fontSize={size}
              fontWeight={500}
              fill="var(--color-ink)"
              stroke="var(--color-surface)"
              strokeWidth={1.6}
              strokeLinejoin="round"
              paintOrder="stroke"
            >
              <textPath href={`#${id}-${i}`} startOffset="50%" textAnchor="middle">
                {text}
              </textPath>
            </text>
          </g>
        );
      })}
    </g>
  );
});

/** Arc around (0, 0) of radius r centred on `angle`; runs left to right as read (clockwise on top, anticlockwise below). */
function arc(r: number, angle: number, span: number, lower: boolean) {
  const a0 = lower ? angle + span / 2 : angle - span / 2;
  const a1 = lower ? angle - span / 2 : angle + span / 2;
  const p = (a: number) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  return `M ${p(a0)} A ${r} ${r} 0 ${span > Math.PI ? 1 : 0} ${lower ? 0 : 1} ${p(a1)}`;
}

/** A figure on its own (side panel, drag preview), `size` in CSS pixels. */
export const FigureBadge = memo(function FigureBadge({ look, plain, size = 40, className }: { look: FigureLook; plain: boolean; size?: number; className?: string }) {
  return (
    <svg viewBox="-15 -15 30 30" width={size} height={size} aria-hidden className={className}>
      <FigureShape look={look} plain={plain} />
    </svg>
  );
});
