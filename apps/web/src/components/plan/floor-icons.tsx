import type { FloorItemKind } from "@svadba/shared";

/**
 * Line drawings for room elements (decision 135): our own thin outline style, one stroke weight, drawn in
 * `currentColor`. Services, effects and signs sit in a circle; trees, plants, the arch and pianos stand free.
 * Each drawing has its own view box so tall trees or a wide piano fill their element without distortion.
 */

type Art = { vb: string; body: React.ReactNode };

/** Badge: a circle around a drawing made for the middle 24×24 of a 48×48 box. */
const badge = (body: React.ReactNode): Art => ({
  vb: "0 0 48 48",
  body: (
    <>
      <circle cx={24} cy={24} r={21} />
      {body}
    </>
  ),
});

/** Little leaf veins / branches inside a tree crown. */
const branches = (x: number, top: number, bottom: number) => (
  <>
    <path d={`M${x} ${bottom} V${top}`} />
    <path d={`M${x} ${top + (bottom - top) * 0.45} l-5 -5 M${x} ${top + (bottom - top) * 0.3} l4.5 -4.5`} />
  </>
);

const ART: Partial<Record<FloorItemKind, Art>> = {
  // ── Areas (small icon next to the name) ──
  DANCE_FLOOR: badge(<path d="M24 13 l2.6 8.4 8.4 2.6 -8.4 2.6 -2.6 8.4 -2.6 -8.4 -8.4 -2.6 8.4 -2.6 Z" />),
  DANCE_FLOOR_ROUND: badge(<path d="M24 13 l2.6 8.4 8.4 2.6 -8.4 2.6 -2.6 8.4 -2.6 -8.4 -8.4 -2.6 8.4 -2.6 Z" />),
  BAND: badge(
    <>
      <path d="M20 31 V15 l11 -2.5 V28" />
      <ellipse cx={17.5} cy={31} rx={3} ry={2.4} />
      <ellipse cx={28.5} cy={28.5} rx={3} ry={2.4} />
    </>,
  ),
  STAGE: badge(
    <>
      <path d="M12 30 h24 M14 30 a10 10 0 0 1 20 0" />
      <path d="M24 16 v4" />
    </>,
  ),
  TENT: badge(<path d="M11 32 L24 14 L37 32 Z M24 14 V32 M20 32 L24 25 L28 32" />),
  LABEL: badge(
    <>
      <path d="M14 15 h11 l9 9 -10 10 -10 -9 Z" />
      <circle cx={19} cy={20} r={1.6} />
    </>,
  ),
  BUFFET_LONG: badge(<path d="M18 13 v8 a3 3 0 0 0 6 0 v-8 M21 13 v22 M30 13 c-3 3 -3 9 0 11 v11" />),
  BUFFET_ROUND: badge(<path d="M18 13 v8 a3 3 0 0 0 6 0 v-8 M21 13 v22 M30 13 c-3 3 -3 9 0 11 v11" />),

  // ── Room ──
  DOOR: {
    vb: "0 0 48 48",
    body: (
      <>
        <path d="M8 40 H40" strokeDasharray="3 3" />
        <circle cx={8} cy={40} r={1.8} />
        <circle cx={40} cy={40} r={1.8} />
        <path d="M40 40 V8" strokeWidth={2.2} />
        <path d="M40 8 A32 32 0 0 0 8 40" strokeDasharray="1.5 2.5" />
      </>
    ),
  },
  ENTRANCE: { vb: "0 0 48 48", body: <path d="M24 42 V7 M15 16 L24 7 L33 16" /> },

  // ── Services ──
  WC: {
    vb: "0 0 48 48",
    body: (
      <>
        <rect x={5} y={5} width={38} height={38} rx={9} />
        <rect x={8.5} y={8.5} width={31} height={31} rx={6} strokeDasharray="2 2" />
        <circle cx={16} cy={15} r={2.4} />
        <path d="M16 19 l-4 10 h8 Z M14.5 29 v6 M17.5 29 v6" />
        <path d="M24 13 V37" />
        <circle cx={32} cy={15} r={2.4} />
        <path d="M29 20 h6 v9 h-6 Z M30.5 29 v6 M33.5 29 v6" />
      </>
    ),
  },
  BAR: badge(
    <>
      <path d="M14 14 h20 l-10 11 Z M24 25 v9 M19 34 h10" />
      <path d="M27 11 l4 8" />
      <circle cx={31.5} cy={19.5} r={1.6} />
    </>,
  ),
  DJ: {
    vb: "0 0 64 40",
    body: (
      <>
        <rect x={3} y={6} width={58} height={28} rx={3} />
        <circle cx={16} cy={20} r={8} />
        <circle cx={16} cy={20} r={2.2} />
        <circle cx={48} cy={20} r={8} />
        <circle cx={48} cy={20} r={2.2} />
        <circle cx={29} cy={13} r={1.4} />
        <circle cx={35} cy={13} r={1.4} />
        <circle cx={29} cy={19} r={1.4} />
        <circle cx={35} cy={19} r={1.4} />
        <rect x={28} y={24} width={8} height={4} rx={1} />
        <path d="M6 16 v8 M58 16 v8" />
      </>
    ),
  },
  CAKE: badge(
    <>
      <rect x={14} y={27} width={20} height={7} rx={1.5} />
      <rect x={17} y={21} width={14} height={6} rx={1.5} />
      <rect x={20} y={16} width={8} height={5} rx={1.5} />
      <path d="M24 16 v-3 M24 13 c-2 -2 0 -4 0 -4 c0 0 2 2 0 4" />
    </>,
  ),
  GIFTS: badge(
    <>
      <rect x={14} y={20} width={20} height={14} rx={1.5} />
      <path d="M12.5 15.5 h23 v4.5 h-23 Z M24 15.5 V34" />
      <path d="M24 15.5 c-2 -5 -8 -5 -7 -1.5 c0.6 1.6 4 1.5 7 1.5 c3 0 6.4 0.1 7 -1.5 c1 -3.5 -5 -3.5 -7 1.5" />
    </>,
  ),
  PHOTO: badge(
    <>
      <rect x={12} y={17} width={24} height={16} rx={2.5} />
      <path d="M19 17 l2 -3.5 h6 l2 3.5" />
      <circle cx={24} cy={25} r={4.5} />
      <circle cx={31.5} cy={20.5} r={0.9} />
    </>,
  ),
  KIDS: badge(
    <>
      <rect x={13} y={24} width={9} height={9} rx={1} />
      <rect x={17.5} y={15} width={9} height={9} rx={1} />
      <circle cx={30.5} cy={28.5} r={4.5} />
      <path d="M26 28.5 h9 M30.5 24 c-2 3 -2 6 0 9" />
    </>,
  ),
  HIGH_CHAIR: {
    vb: "0 0 48 48",
    body: (
      <>
        <circle cx={25} cy={8} r={3} />
        <path d="M17 12 h6 l1 10 h8 M17 12 v11 h15" />
        <path d="M26 17 h9 v3" />
        <path d="M20 23 l-6 20 M29 23 l6 20 M17 34 h15" />
      </>
    ),
  },

  // ── Music and effects ──
  SPEAKER: badge(
    <>
      <path d="M14 20 h5 l7 -6 v20 l-7 -6 h-5 Z" />
      <path d="M30 19 c2 2.5 2 7.5 0 10 M33 16 c4 4.5 4 11.5 0 16" />
    </>,
  ),
  MIC: badge(
    <>
      <rect x={21} y={11} width={6} height={12} rx={3} />
      <path d="M18 19 a6 6 0 0 0 12 0 M24 25 v9 M19 34 h10" />
      <path d="M23 8.5 l2 -2 M25 8.5 l-1 2" />
    </>,
  ),
  LIGHT: badge(
    <>
      <path d="M20 27 a7 7 0 1 1 8 0 v4 h-8 Z M21 34 h6" />
      <path d="M24 8 v3 M14 12 l2 2 M34 12 l-2 2 M10 21 h3 M35 21 h3" />
    </>,
  ),
  LASER: badge(
    <>
      <path d="M13 33 l5 -5 3 3 -5 5 Z M19.5 29.5 l3 3" />
      <path d="M21 27 L32 16" />
      <path d="M33 11 v4 M31 13 h4 M30.5 10.5 l1.5 1.5 M35.5 15.5 l-1.5 -1.5" />
      <path d="M17 12 v3 M15.5 13.5 h3" />
    </>,
  ),
  FIREWORK: badge(
    <>
      <path d="M17 31 l11 -11 4 4 -11 11 Z M28 20 l3 -3 4 4 -3 3" />
      <path d="M17 31 l-3 3 M20 34 l-2 2" />
      <path d="M24 9 l1.3 2.7 3 .4 -2.2 2 .6 3 -2.7 -1.5 -2.7 1.5 .6 -3 -2.2 -2 3 -.4 Z" />
      <path d="M13 18 l2 1 M14 23 l2 -.5" />
    </>,
  ),
  SMOKE: badge(
    <>
      <rect x={14} y={27} width={14} height={8} rx={1.5} />
      <path d="M28 30 h3" />
      <path d="M22 27 v-3 c-4 0 -5 -5 -1 -6 c0 -4 6 -5 7 -1 c4 -1 6 3 3 5 c1 3 -3 4 -5 2" />
    </>,
  ),
  PIANO: {
    vb: "0 0 80 32",
    body: (
      <>
        <rect x={3} y={4} width={74} height={24} rx={2} />
        <rect x={7} y={16} width={66} height={8} />
        <path d="M11 16 v8 M15 16 v8 M19 16 v8 M23 16 v8 M27 16 v8 M31 16 v8 M35 16 v8 M39 16 v8 M43 16 v8 M47 16 v8 M51 16 v8 M55 16 v8 M59 16 v8 M63 16 v8 M67 16 v8" strokeWidth={0.8} />
      </>
    ),
  },
  GRAND_PIANO: {
    vb: "0 0 48 58",
    body: (
      <>
        <path d="M6 46 V10 a10 10 0 0 1 20 0 c0 8 4 12 12 18 c4 3 4 6 4 9 V46 Z" />
        <rect x={6} y={46} width={36} height={8} />
        <path d="M6 42 h36" />
        <path d="M10 46 v8 M14 46 v8 M18 46 v8 M22 46 v8 M26 46 v8 M30 46 v8 M34 46 v8 M38 46 v8" strokeWidth={0.8} />
      </>
    ),
  },

  // ── Comfort and signs ──
  WATER: badge(
    <>
      <path d="M19 14 c-4 6 -5 8 -5 10 a5 5 0 0 0 10 0 c0 -2 -1 -4 -5 -10 Z" />
      <path d="M29 20 c-3 4.5 -4 6 -4 7.5 a4 4 0 0 0 8 0 c0 -1.5 -1 -3 -4 -7.5 Z" />
      <path d="M15 35 c2 -1.5 3 -1.5 5 0 s3 1.5 5 0 3 -1.5 5 0" />
    </>,
  ),
  FAN: badge(
    <>
      <circle cx={24} cy={24} r={2.5} />
      <path d="M24 21.5 c-1 -6 3 -10 7 -8 c3 2 -1 7 -7 8 Z" />
      <path d="M26.2 25.3 c5.5 2.3 6.4 7.3 2.7 9.5 c-3.3 1.4 -5.4 -4.4 -2.7 -9.5 Z" />
      <path d="M21.8 25.3 c-4.7 3.7 -9.5 2.7 -9.5 -1.6 c.4 -3.6 6.5 -3.5 9.5 1.6 Z" />
    </>,
  ),
  AIR_CON: badge(
    <path d="M24 12 v24 M13.6 18 l20.8 12 M13.6 30 l20.8 -12 M21 13.5 l3 3 3 -3 M21 34.5 l3 -3 3 3 M12.5 21.7 l4.1 -1.1 -1.1 -4.1 M35.5 26.3 l-4.1 1.1 1.1 4.1 M12.5 26.3 l4.1 1.1 -1.1 4.1 M35.5 21.7 l-4.1 -1.1 1.1 -4.1" />,
  ),
  HEATER: badge(
    <>
      <path d="M24 35 c-5 0 -8 -3 -8 -7 c0 -5 5 -7 5 -12 c3 2 4 4 4 7 c1 -1 2 -2 2 -4 c3 3 5 6 5 9 c0 4 -3 7 -8 7 Z" />
      <path d="M19 8 c-1.5 1.5 1.5 2.5 0 4 M24 7 c-1.5 1.5 1.5 2.5 0 4 M29 8 c-1.5 1.5 1.5 2.5 0 4" />
    </>,
  ),
  ACCESSIBLE: {
    vb: "0 0 48 48",
    body: (
      <>
        <circle cx={24} cy={8} r={3.2} />
        <path d="M23 13 l1 12 h9 l4 9" />
        <path d="M23 18 h8" />
        <path d="M18 22 a10 10 0 1 0 14 10" />
      </>
    ),
  },
  CAUTION: {
    vb: "0 0 48 48",
    body: (
      <>
        <path d="M24 6 L44 41 H4 Z" strokeLinejoin="round" />
        <path d="M24 18 v12" strokeWidth={2.6} />
        <circle cx={24} cy={35} r={1.2} fill="currentColor" />
      </>
    ),
  },
  COMPASS: {
    vb: "0 0 48 48",
    body: (
      <>
        <path d="M20 12 V3 l8 9 V3" />
        <path d="M24 16 L36 44 L24 37 L12 44 Z" />
        <path d="M24 16 L24 37 L12 44 Z" fill="currentColor" />
      </>
    ),
  },
  TARGET: {
    vb: "0 0 48 48",
    body: (
      <>
        <path d="M8 8 L21 21 M27 27 L40 40 M40 8 L27 21 M21 27 L8 40" />
        <circle cx={24} cy={24} r={3} />
      </>
    ),
  },

  // ── Nature and decor ──
  TREE_ROUND: {
    vb: "0 0 40 56",
    body: (
      <>
        <circle cx={20} cy={18} r={14} />
        {branches(20, 14, 52)}
        <path d="M11 52 h18" />
      </>
    ),
  },
  TREE_CLOUD: {
    vb: "0 0 48 56",
    body: (
      <>
        <path d="M14 36 c-6 0 -9 -6 -6 -10 c-3 -5 1 -11 6 -10 c1 -6 9 -9 13 -5 c5 -3 12 0 12 6 c5 1 7 8 3 11 c2 5 -3 9 -8 8 Z" />
        <path d="M21 36 V52 M27 36 V52 M21 41 c-3 0 -5 -2 -6 -4 M27 43 c3 0 5 -2 6 -5" />
        <path d="M14 52 h20" />
      </>
    ),
  },
  TREE_TALL: {
    vb: "0 0 32 56",
    body: (
      <>
        <path d="M16 4 c8 0 10 14 10 22 c0 8 -4 12 -10 12 s-10 -4 -10 -12 c0 -8 2 -22 10 -22 Z" />
        <path d="M14 38 V52 M18 38 V52" />
        <path d="M9 52 h14" />
      </>
    ),
  },
  TREE_PINE: {
    vb: "0 0 40 56",
    body: (
      <>
        <path d="M20 4 L28 16 h-4 L32 28 h-5 L35 40 H5 L13 28 H8 L16 16 h-4 Z" strokeLinejoin="round" />
        <path d="M17 40 V52 M23 40 V52" />
        <path d="M10 52 h20" />
      </>
    ),
  },
  TREE_LEAF: {
    vb: "0 0 32 56",
    body: (
      <>
        <path d="M16 4 c9 10 10 18 10 22 c0 7 -5 11 -10 11 s-10 -4 -10 -11 c0 -4 1 -12 10 -22 Z" />
        {branches(16, 14, 52)}
        <path d="M9 52 h14" />
      </>
    ),
  },
  HEDGE: {
    vb: "0 0 56 40",
    body: (
      <>
        <path d="M10 33 c-6 0 -8 -7 -4 -10 c-3 -5 2 -10 7 -8 c1 -6 9 -8 13 -4 c4 -4 12 -3 13 3 c6 -1 11 4 9 9 c4 3 2 10 -4 10 Z" />
        <path d="M16 20 c3 -2 6 -2 8 0 M30 17 c2 -1 5 -1 7 1 M22 27 c3 2 7 2 10 0 M12 26 c1 -1 3 -1 4 0 M38 25 c2 1 4 1 5 -1" />
      </>
    ),
  },
  HEDGE_ROW: {
    vb: "0 0 96 32",
    body: (
      <>
        <path d="M8 27 c-5 0 -7 -6 -3 -9 c-2 -5 3 -9 7 -7 c1 -5 8 -6 11 -3 c3 -4 10 -4 12 0 c3 -4 10 -4 12 0 c3 -4 10 -4 12 0 c3 -4 10 -4 12 0 c4 -3 10 0 9 5 c4 2 3 8 -1 9 c2 3 -1 6 -5 5 Z" />
        <path d="M14 18 c2 -1 4 -1 6 0 M34 15 c2 -1 4 -1 6 0 M56 18 c2 -1 4 -1 6 0 M76 15 c2 -1 4 -1 6 0 M24 22 c3 1 6 1 8 0 M46 22 c3 1 6 1 8 0 M66 22 c3 1 6 1 8 0" />
      </>
    ),
  },
  ARCH: {
    vb: "0 0 60 52",
    body: (
      <>
        <path d="M8 50 V24 a22 22 0 0 1 44 0 V50" />
        <path d="M14 50 V24 a16 16 0 0 1 32 0 V50" />
        <path d="M8 30 h6 M8 38 h6 M8 46 h6 M46 30 h6 M46 38 h6 M46 46 h6" />
        <circle cx={14} cy={12} r={2} />
        <circle cx={30} cy={4.5} r={2} />
        <circle cx={46} cy={12} r={2} />
        <circle cx={21} cy={7} r={1.4} />
        <circle cx={39} cy={7} r={1.4} />
      </>
    ),
  },
};

/** Kinds that read best without a name under them (unless the couple renamed them). */
export const QUIET_KINDS = new Set<FloorItemKind>([
  "TREE_ROUND",
  "TREE_CLOUD",
  "TREE_TALL",
  "TREE_PINE",
  "TREE_LEAF",
  "HEDGE",
  "HEDGE_ROW",
  "ARCH",
  "COMPASS",
  "TARGET",
  "PIANO",
  "GRAND_PIANO",
]);

export function hasFloorIcon(kind: FloorItemKind) {
  return kind in ART;
}

/** The line drawing for a room element, scaled to fit its box. */
export function FloorIcon({ kind, className, strokeWidth = 1.5 }: { kind: FloorItemKind; className?: string; strokeWidth?: number }) {
  const art = ART[kind];
  if (!art) return null;
  return (
    <svg
      viewBox={art.vb}
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {art.body}
    </svg>
  );
}
