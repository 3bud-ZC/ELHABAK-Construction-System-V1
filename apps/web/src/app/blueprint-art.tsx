/**
 * ELHABAK architectural line art — the hero elevation (traced over the delivery
 * photo so drawing and building register exactly), the six-stage axonometric build
 * sequence and the floor plan. Everything is SVG animated with
 * CSS only (stroke draw-in via pathLength=1). Geometry is computed deterministically
 * at module load so server and client markup are identical. All art is decorative
 * (aria-hidden) and fully static under reduced motion.
 */
import type { CSSProperties } from "react";

type P3 = readonly [number, number, number];
type Pt = readonly [number, number];

const COS30 = Math.cos(Math.PI / 6);
const round = (value: number) => Math.round(value * 10) / 10;

function projector(scale: number, ox: number, oy: number) {
  return ([x, y, z]: P3): Pt => [round(ox + (x - y) * COS30 * scale), round(oy + (x + y) * 0.5 * scale - z * scale)];
}

const d = (points: Pt[], close = false) =>
  `M${points.map(([x, y]) => `${x} ${y}`).join(" L")}${close ? " Z" : ""}`;


const vars = (i: number) => ({ "--i": i }) as CSSProperties;

type ArtProps = { className?: string; live?: boolean };

/* ------------------------------------------------------------------ */
/* Elevation (hero)                                                    */
/* Coordinates are the pixels of /marketing/hero-delivery.webp scaled  */
/* to 2000×1128, so every stroke lands on a real edge of the building. */
/* ------------------------------------------------------------------ */

export const ELEVATION_VIEWBOX = { width: 2000, height: 1128 } as const;

const ELEV_STRONG = [
  "M0 880 H2000",
  "M0 838 H1150",
  "M942 165 H1358 V197 H942 Z",
  "M482 334 H945 V364 H496 Z",
  "M1285 340 H1760 V370 H1285",
  "M0 570 H548 L588 600 V626 L560 640 H0",
  "M750 593 H997 V637 H750 Z"
];

const ELEV_LINE = [
  // Tower: soffit, piers and glazing frame.
  "M1358 197 L1300 252 H1000 L960 197",
  "M945 197 V334",
  "M997 252 V838",
  "M1283 252 V838",
  "M1025 270 H1253 V790 H1025 Z",
  "M1025 445 H1253",
  "M1025 705 H1253",
  // Two-storey block.
  "M496 364 L545 396 H945",
  "M545 396 V838",
  "M800 396 V593",
  "M628 407 H708 V605 H628 Z",
  "M808 452 H990 V592 H808 Z",
  "M752 637 V838",
  "M572 657 H737 V792 H572 Z",
  "M812 688 H990 V838 H812 Z",
  // Single-storey wing.
  "M92 640 V838",
  "M540 640 V838",
  "M186 640 H320 V830 H186 Z",
  // Terrace wing.
  "M1760 370 L1700 402 H1285",
  "M1360 418 H1608 V522 H1360 Z",
  "M1283 528 H1800 V800",
  "M1755 525 V385 H1868 V525",
  // Podium planter and ramp wall.
  "M1000 812 H1333 V838",
  "M1150 848 L1900 795 V862"
];

const ELEV_FAINT = [
  "M1088 270 V790 M1194 270 V790",
  "M868 452 V592 M932 452 V592",
  "M613 657 V792 M697 657 V792",
  "M872 688 V838 M934 688 V838 M775 637 V838",
  "M252 640 V830 M186 680 H320",
  "M1430 418 V522 M1482 418 V522 M1545 418 V522 M1283 450 H1770 M1755 415 H1868",
  "M1290 590 H1795 M1290 650 H1795 M1290 710 H1795 M1290 770 H1795",
  Array.from({ length: 33 }, (_, index) => `M${40 + index * 60} 884 l-22 26`).join(" ")
];

const ELEV_AXES = [92, 545, 997, 1283, 1800];
const ELEV_LEVELS: { y: number; text: string }[] = [
  { y: 165, text: "ROOF" },
  { y: 337, text: "L02" },
  { y: 597, text: "L01" },
  { y: 838, text: "L00" }
];
/** Surveyed roof corners, as percentages of the elevation canvas (for HTML markers). */
export const ELEVATION_SURVEY_POINTS = (
  [
    [942, 165],
    [1358, 165],
    [482, 334],
    [1760, 340]
  ] as const
).map(([x, y]) => ({
  left: `${round((x / ELEVATION_VIEWBOX.width) * 100)}%`,
  top: `${round((y / ELEVATION_VIEWBOX.height) * 100)}%`
}));

/** The measured drawing that sits under the photo: every wall, slab and mullion. */
export function BlueprintElevationDraft({ className = "" }: ArtProps) {
  let i = 0;
  return (
    <svg
      className={`bp-art bp-art--elevation is-live ${className}`.trim()}
      viewBox={`0 0 ${ELEVATION_VIEWBOX.width} ${ELEVATION_VIEWBOX.height}`}
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {ELEV_STRONG.map((path) => <path key={path} className="bp-d bp-strong" d={path} pathLength={1} style={vars(i++)} />)}
      {ELEV_LINE.map((path) => <path key={path} className="bp-d bp-line" d={path} pathLength={1} style={vars(i++)} />)}
      {ELEV_FAINT.map((path) => <path key={path} className="bp-d bp-faint" d={path} style={vars(i++)} />)}
    </svg>
  );
}

/** Structural axes and level datums — stays above drawing and photo. */
export function BlueprintElevationAxes({ className = "" }: ArtProps) {
  return (
    <svg
      className={`bp-art bp-art--axes is-live ${className}`.trim()}
      viewBox={`0 0 ${ELEVATION_VIEWBOX.width} ${ELEVATION_VIEWBOX.height}`}
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="bp-level-fade" gradientUnits="userSpaceOnUse" x1="-150" y1="0" x2="2150" y2="0">
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset="0.14" stopColor="currentColor" stopOpacity="1" />
          <stop offset="0.9" stopColor="currentColor" stopOpacity="1" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ELEV_LEVELS.map((level, index) => (
        <g key={level.y}>
          {/* 0.01 rise keeps the gradient's bounding box non-degenerate. */}
          <path
            className="bp-d bp-level"
            d={`M-150 ${level.y} L2150 ${level.y + 0.01}`}
            stroke="url(#bp-level-fade)"
            pathLength={1}
            style={vars(index * 3)}
          />
          <path className="bp-level-mark" d={`M1948 ${level.y - 30} h34 l-17 24 Z`} style={vars(index * 3 + 10)} />
          <text className="bp-t bp-t--level" x={1936} y={level.y - 9} textAnchor="end" style={vars(index * 3 + 10)}>
            {level.text}
          </text>
        </g>
      ))}
      {ELEV_AXES.map((x, index) => (
        <g key={x}>
          <path className="bp-d bp-axis" d={`M${x} 96 V968`} pathLength={1} style={vars(index * 3 + 4)} />
          <circle className="bp-d bp-bubble" cx={x} cy={62} r={30} pathLength={1} style={vars(index * 3 + 6)} />
          <text className="bp-t bp-t--bubble" x={x} y={73} textAnchor="middle" style={vars(index * 3 + 8)}>
            {String.fromCharCode(65 + index)}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Build sequence (delivery process)                                   */
/* One axonometric project drawn in six layers; each layer belongs to  */
/* a delivery stage and is revealed by `data-stage` on a parent.       */
/* ------------------------------------------------------------------ */

type SeqItem = {
  d: string;
  stage: 1 | 2 | 3 | 4 | 5 | 6;
  kind: "grid" | "site" | "axis" | "design" | "dim" | "tick" | "hatch" | "frame" | "slab" | "crane" | "skin" | "seal";
  order: number;
};

const STOREY = 1.2;
const FLOORS = [0, 1, 2, 3, 4].map((n) => n * STOREY);
const ROOF = FLOORS[4] as number;
const COLUMNS: readonly (readonly [number, number])[] = [
  [0, 0], [2, 0], [4, 0], [6, 0], [6, 2], [6, 4], [4, 4], [2, 4], [0, 4], [0, 2]
];

function buildSequence() {
  const p = projector(46, 318, 372);
  const items: SeqItem[] = [];
  const bubbles: { x: number; y: number; text: string; back?: boolean }[] = [];
  const stations: Pt[] = [];
  const checks: Pt[] = [];
  const faces: { d: string; side: "front" | "flank" | "roof" }[] = [];
  const box = (x0: number, x1: number, y0: number, y1: number, z: number): Pt[] => [
    p([x0, y0, z]),
    p([x1, y0, z]),
    p([x1, y1, z]),
    p([x0, y1, z])
  ];
  const push = (stage: SeqItem["stage"], kind: SeqItem["kind"], path: string, order: number) =>
    items.push({ d: path, stage, kind, order });

  // 01 — Survey: ground grid, plot boundary, stations and structural axes.
  let order = 0;
  for (let x = -1; x <= 7; x += 1) push(1, "grid", d([p([x, -1.4, 0]), p([x, 5.4, 0])]), order++);
  for (let y = -1; y <= 5; y += 1) push(1, "grid", d([p([-1.4, y, 0]), p([7.4, y, 0])]), order++);
  push(1, "site", d(box(-0.7, 6.7, -0.7, 4.7, 0), true), order++);
  for (const [x, y] of [[-0.7, -0.7], [6.7, -0.7], [6.7, 4.7], [-0.7, 4.7]] as const) {
    const point = p([x, y, 0]);
    stations.push(point);
    push(1, "tick", `M${point[0] - 11} ${point[1]} h22 M${point[0]} ${point[1] - 11} v22`, order++);
  }
  ["A", "B", "C", "D"].forEach((name, index) => {
    const x = index * 2;
    const [bx, by] = p([x, -2.25, 0]);
    push(1, "axis", d([p([x, -1.85, 0]), p([x, 4.4, 0])]), order++);
    bubbles.push({ x: bx, y: by, text: name, back: true });
  });
  ["1", "2", "3"].forEach((name, index) => {
    const y = index * 2;
    const [bx, by] = p([8.15, y, 0]);
    push(1, "axis", d([p([-0.4, y, 0]), p([7.75, y, 0])]), order++);
    bubbles.push({ x: bx, y: by, text: name });
  });

  // 02 — Design: the intended volume as thin drafting linework.
  order = 0;
  FLOORS.forEach((z) => push(2, "design", d(box(0, 6, 0, 4, z), true), order++));
  COLUMNS.forEach(([x, y]) => push(2, "design", d([p([x, y, 0]), p([x, y, ROOF])]), order++));
  push(2, "design", d(box(2.4, 3.6, 1.3, 2.7, ROOF + 0.7), true), order++);
  for (const [x, y] of [[2.4, 1.3], [3.6, 1.3], [3.6, 2.7], [2.4, 2.7]] as const) {
    push(2, "design", d([p([x, y, ROOF]), p([x, y, ROOF + 0.7])]), order++);
  }

  // 03 — Bill of quantities: measured edges, level marks and the area take-off hatch.
  order = 0;
  const dimY = 5.35;
  push(3, "dim", d([p([0, 4.2, 0]), p([0, dimY + 0.3, 0])]), order++);
  push(3, "dim", d([p([6, 4.2, 0]), p([6, dimY + 0.3, 0])]), order++);
  push(3, "dim", d([p([0, dimY, 0]), p([6, dimY, 0])]), order++);
  for (const x of [0, 2, 4, 6]) push(3, "tick", d([p([x - 0.14, dimY - 0.14, 0]), p([x + 0.14, dimY + 0.14, 0])]), order++);
  const dimX = 7.25;
  push(3, "dim", d([p([6.2, 0, 0]), p([dimX + 0.3, 0, 0])]), order++);
  push(3, "dim", d([p([6.2, 4, 0]), p([dimX + 0.3, 4, 0])]), order++);
  push(3, "dim", d([p([dimX, 0, 0]), p([dimX, 4, 0])]), order++);
  for (const y of [0, 2, 4]) push(3, "tick", d([p([dimX - 0.14, y + 0.14, 0]), p([dimX + 0.14, y - 0.14, 0])]), order++);
  const hx = 7.25;
  const hy = -0.75;
  push(3, "dim", d([p([hx, hy, 0]), p([hx, hy, ROOF])]), order++);
  FLOORS.forEach((z) => push(3, "tick", d([p([hx - 0.2, hy, z]), p([hx + 0.2, hy, z])]), order++));
  for (let k = 1; k < 10; k += 1) {
    const t = k;
    const a: P3 = t <= 4 ? [0, t, 0] : [t - 4, 4, 0];
    const b: P3 = t <= 6 ? [t, 0, 0] : [6, t - 6, 0];
    push(3, "hatch", d([p(a), p(b)]), order++);
  }

  // 04 — Execution: frame and slabs rise storey by storey beside the tower crane.
  order = 0;
  push(4, "slab", d(box(0, 6, 0, 4, 0), true), order++);
  for (let level = 0; level < 4; level += 1) {
    const z0 = FLOORS[level] as number;
    const z1 = FLOORS[level + 1] as number;
    COLUMNS.forEach(([x, y]) => push(4, "frame", d([p([x, y, z0]), p([x, y, z1])]), order));
    order += 4;
    push(4, "slab", d(box(0, 6, 0, 4, z1), true), order);
    order += 4;
  }
  push(4, "frame", d(box(2.4, 3.6, 1.3, 2.7, ROOF + 0.7), true), order++);
  for (const [x, y] of [[3.6, 1.3], [3.6, 2.7], [2.4, 2.7]] as const) {
    push(4, "frame", d([p([x, y, ROOF]), p([x, y, ROOF + 0.7])]), order);
  }
  faces.push({ d: d([p([0, 4, 0]), p([6, 4, 0]), p([6, 4, ROOF]), p([0, 4, ROOF])], true), side: "front" });
  faces.push({ d: d([p([6, 0, 0]), p([6, 4, 0]), p([6, 4, ROOF]), p([6, 0, ROOF])], true), side: "flank" });
  faces.push({ d: d(box(0, 6, 0, 4, ROOF), true), side: "roof" });

  const mast: P3 = [-0.55, 5.35, 0];
  const jibZ = 7.05;
  const [mx, my] = p(mast);
  const [, topY] = p([mast[0], mast[1], jibZ]);
  push(4, "crane", `M${mx - 5} ${my} V${topY} M${mx + 5} ${my} V${topY}`, 0);
  let brace = "";
  for (let y = my, flip = 0; y - 22 > topY; y -= 22, flip += 1) {
    brace += `M${mx + (flip % 2 ? 5 : -5)} ${y} L${mx + (flip % 2 ? -5 : 5)} ${round(y - 22)} `;
  }
  push(4, "crane", brace.trim(), 2);
  const jibEnd = p([5.1, mast[1], jibZ]);
  const counter = p([-1.9, mast[1], jibZ]);
  const apex: Pt = [mx, round(topY - 30)];
  push(4, "crane", d([counter, jibEnd]), 4);
  push(4, "crane", d([counter, apex, jibEnd]), 6);
  const hookTop = p([3.2, mast[1], jibZ]);
  const hookEnd = p([3.2, mast[1], ROOF + 1.1]);
  push(4, "crane", d([hookTop, hookEnd]), 8);
  push(4, "crane", `M${hookEnd[0] - 7} ${hookEnd[1]} h14 v8 h-14 Z`, 9);

  // 05 — Preliminary handover: envelope closed, every level inspected.
  order = 0;
  for (let level = 0; level < 4; level += 1) {
    const z0 = FLOORS[level] as number;
    const z1 = FLOORS[level + 1] as number;
    for (const x of [1, 3, 5]) push(5, "skin", d([p([x, 4, z0]), p([x, 4, z1])]), order++);
    for (const y of [1, 3]) push(5, "skin", d([p([6, y, z0]), p([6, y, z1])]), order++);
    const mid = z0 + STOREY * 0.5;
    push(5, "skin", d([p([0, 4, mid]), p([6, 4, mid]), p([6, 0, mid])]), order++);
    checks.push(p([6, 4, z1]));
  }
  checks.push(p([0, 4, ROOF]), p([6, 0, ROOF]));

  // 06 — Final handover: sealed perimeter and the as-built document set.
  push(6, "seal", d(box(-0.35, 6.35, -0.35, 4.35, 0), true), 0);
  push(6, "seal", d(box(0, 6, 0, 4, ROOF), true), 3);
  const anchor = p([6, 0, ROOF]);
  const sheet: Pt = [round(anchor[0] + 92), round(anchor[1] - 140)];
  push(6, "seal", `M${anchor[0]} ${anchor[1]} L${sheet[0] - 7} ${sheet[1] + 36}`, 6);

  return { items, bubbles, stations, checks, faces, sheet };
}

const SEQ = buildSequence();

export function BlueprintBuildSequence({ className = "" }: ArtProps) {
  const [sx, sy] = SEQ.sheet;
  return (
    <svg
      className={`bp-seq ${className}`.trim()}
      viewBox="0 0 760 700"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {SEQ.faces.map((face) => (
        <path key={face.side} className={`bp-seq__face bp-seq__face--${face.side}`} d={face.d} />
      ))}
      {SEQ.items.map((item, index) => (
        <path
          key={index}
          className={`bp-seq__s bp-seq__s--${item.stage} bp-seq__${item.kind}`}
          d={item.d}
          pathLength={1}
          style={vars(item.order)}
        />
      ))}
      {SEQ.bubbles.map((bubble, index) => (
        <g
          key={bubble.text}
          className={`bp-seq__s bp-seq__s--1 bp-seq__bubble${bubble.back ? " bp-seq__bubble--back" : ""}`}
          style={vars(22 + index)}
        >
          <circle cx={bubble.x} cy={bubble.y} r={11} />
          <text x={bubble.x} y={bubble.y + 4} textAnchor="middle">{bubble.text}</text>
        </g>
      ))}
      {SEQ.stations.map(([x, y], index) => (
        <circle key={`st${index}`} className="bp-seq__s bp-seq__s--1 bp-seq__station" cx={x} cy={y} r={5} style={vars(18 + index)} />
      ))}
      {SEQ.checks.map(([x, y], index) => (
        <circle key={`ck${index}`} className="bp-seq__s bp-seq__s--5 bp-seq__check" cx={x} cy={y} r={5.5} style={vars(14 + index * 2)} />
      ))}
      <g className="bp-seq__s bp-seq__s--6 bp-seq__sheet" style={vars(8)} transform={`translate(${sx} ${sy})`}>
        <path className="bp-seq__sheet-body" d="M0 0 h34 l12 12 v46 h-46 Z" />
        <path className="bp-seq__sheet-fold" d="M34 0 v12 h12" />
        <path className="bp-seq__sheet-lines" d="M9 22 h20 M9 31 h28 M9 40 h14" />
        <path className="bp-seq__sheet-check" d="M24 44 l6 6 l11 -13" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Floor plan (drawing-to-site bridge, FAQ)                            */
/* ------------------------------------------------------------------ */

const PLAN_WALLS = [
  "M40 40 H480 V360 H40 Z",
  "M52 52 H468 V348 H52 Z",
  "M250 52 V190",
  "M262 52 V150",
  "M52 190 H180",
  "M214 190 H468",
  "M340 190 V348",
  "M352 232 V348",
  "M52 270 H150"
];
const PLAN_DOORS = ["M180 190 A34 34 0 0 1 214 224", "M262 150 A40 40 0 0 0 302 190", "M150 270 A36 36 0 0 1 186 306", "M352 232 A30 30 0 0 1 382 202"];
const PLAN_WINDOWS = ["M110 40 H190", "M320 40 H420", "M480 90 V160", "M480 250 V320", "M110 360 H220"];
const PLAN_DIMS = [
  "M40 18 H480",
  "M40 12 V24",
  "M250 12 V24",
  "M480 12 V24",
  "M502 40 V360",
  "M496 40 H508",
  "M496 190 H508",
  "M496 360 H508"
];

export function BlueprintPlan({ className = "", live = false }: ArtProps) {
  let i = 0;
  return (
    <svg
      className={`bp-art bp-art--plan${live ? " is-live" : ""} ${className}`.trim()}
      viewBox="0 0 560 400"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {PLAN_WALLS.map((wall) => <path key={wall} className="bp-d bp-strong" d={wall} pathLength={1} style={vars(i++)} />)}
      {PLAN_WINDOWS.map((win) => <path key={win} className="bp-d bp-window" d={win} pathLength={1} style={vars(i++)} />)}
      {PLAN_DOORS.map((door) => <path key={door} className="bp-d bp-accent" d={door} pathLength={1} style={vars(i++)} />)}
      {PLAN_DIMS.map((dim) => <path key={dim} className="bp-d bp-dim" d={dim} pathLength={1} style={vars(i++)} />)}
    </svg>
  );
}
