/**
 * ELHABAK architectural line art — axonometric structure, floor plan and building
 * section drawn as SVG and animated with CSS only (stroke draw-in via pathLength=1,
 * a slow level-scan plane, pulsing survey nodes). Geometry is computed
 * deterministically at module load so server and client markup are identical.
 * All art is decorative (aria-hidden) and fully static under reduced motion.
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

type Stroke = { d: string; kind: "faint" | "line" | "strong" | "accent" | "hidden" | "dim" };
type Label = { x: number; y: number; text: string; rotate?: number; kind?: "accent" | "muted"; anchor?: "start" | "middle" | "end" };
type Node = { x: number; y: number; r: number; kind?: "accent" | "bubble" };

const vars = (i: number) => ({ "--i": i }) as CSSProperties;

/* ------------------------------------------------------------------ */
/* Axonometric structure (hero)                                        */
/* ------------------------------------------------------------------ */

const SLAB_H = 1.2;
const LEVELS = [0, 1, 2, 3, 4].map((n) => n * SLAB_H);

function buildAxonometric() {
  const p = projector(42, 340, 318);
  const strokes: Stroke[] = [];
  const labels: Label[] = [];
  const nodes: Node[] = [];
  const box = (x0: number, x1: number, y0: number, y1: number, z: number): Pt[] => [
    p([x0, y0, z]),
    p([x1, y0, z]),
    p([x1, y1, z]),
    p([x0, y1, z])
  ];

  // Ground survey grid.
  for (let x = -1; x <= 7; x += 1) strokes.push({ d: d([p([x, -1.6, 0]), p([x, 5.6, 0])]), kind: "faint" });
  for (let y = -1; y <= 5; y += 1) strokes.push({ d: d([p([-1.6, y, 0]), p([7.6, y, 0])]), kind: "faint" });

  // Structural axes with bubbles (A–D along x, 1–3 along y).
  ["A", "B", "C", "D"].forEach((name, index) => {
    const x = index * 2;
    const [bx, by] = p([x, -2.3, 0]);
    strokes.push({ d: d([p([x, -1.95, 0]), p([x, 0, 0])]), kind: "dim" });
    nodes.push({ x: bx, y: by, r: 10, kind: "bubble" });
    labels.push({ x: bx, y: by + 3.5, text: name, anchor: "middle" });
  });
  ["1", "2", "3"].forEach((name, index) => {
    const y = index * 2;
    const [bx, by] = p([8.3, y, 0]);
    strokes.push({ d: d([p([6, y, 0]), p([7.95, y, 0])]), kind: "dim" });
    nodes.push({ x: bx, y: by, r: 10, kind: "bubble" });
    labels.push({ x: bx, y: by + 3.5, text: name, anchor: "middle" });
  });

  // Floor slabs, ground slab heavier.
  LEVELS.forEach((z, index) => strokes.push({ d: d(box(0, 6, 0, 4, z), true), kind: index === 0 ? "strong" : "line" }));

  // Perimeter columns.
  for (const [x, y] of [[0, 0], [2, 0], [4, 0], [6, 0], [6, 2], [6, 4], [4, 4], [2, 4], [0, 4], [0, 2]] as const) {
    strokes.push({ d: d([p([x, y, 0]), p([x, y, LEVELS[4] as number])]), kind: x === 0 && y === 0 ? "hidden" : "line" });
  }

  // Core (hidden lines).
  for (const z of [0, 6]) strokes.push({ d: d(box(2.4, 3.6, 1.3, 2.7, z), true), kind: "hidden" });
  for (const [x, y] of [[2.4, 1.3], [3.6, 1.3], [3.6, 2.7], [2.4, 2.7]] as const) {
    strokes.push({ d: d([p([x, y, 0]), p([x, y, 6])]), kind: "hidden" });
  }

  // Facade mullions on the two visible faces.
  for (let level = 0; level < 4; level += 1) {
    const z0 = level * SLAB_H;
    const z1 = z0 + SLAB_H;
    for (const x of [1, 3, 5]) strokes.push({ d: d([p([x, 4, z0]), p([x, 4, z1])]), kind: "faint" });
    for (const y of [1, 3]) strokes.push({ d: d([p([6, y, z0]), p([6, y, z1])]), kind: "faint" });
  }

  // Cantilevered crown volume (accent).
  const top = LEVELS[4] as number;
  strokes.push({ d: d(box(3, 7.4, -0.8, 2.6, top), true), kind: "accent" });
  strokes.push({ d: d(box(3, 7.4, -0.8, 2.6, top + SLAB_H), true), kind: "accent" });
  for (const [x, y] of [[3, -0.8], [7.4, -0.8], [7.4, 2.6], [3, 2.6]] as const) {
    strokes.push({ d: d([p([x, y, top]), p([x, y, top + SLAB_H])]), kind: "accent" });
  }

  // Plan dimension along x (front-left edge).
  const dimY = 5.3;
  strokes.push({ d: d([p([0, 4.15, 0]), p([0, dimY + 0.3, 0])]), kind: "dim" });
  strokes.push({ d: d([p([6, 4.15, 0]), p([6, dimY + 0.3, 0])]), kind: "dim" });
  strokes.push({ d: d([p([0, dimY, 0]), p([6, dimY, 0])]), kind: "dim" });
  for (const x of [0, 2, 4, 6]) strokes.push({ d: d([p([x - 0.12, dimY - 0.12, 0]), p([x + 0.12, dimY + 0.12, 0])]), kind: "accent" });
  const [lx, ly] = p([3, dimY + 0.55, 0]);
  labels.push({ x: lx, y: ly, text: "24.00", rotate: -30, anchor: "middle" });

  // Height dimension off the right-hand corner (axis D / 1), with level marks.
  const hx = 7.4;
  const hy = -0.7;
  strokes.push({ d: d([p([hx, hy, 0]), p([hx, hy, top])]), kind: "dim" });
  LEVELS.forEach((z) => {
    strokes.push({ d: d([p([6.15, -0.05, z]), p([hx + 0.25, hy - 0.05, z])]), kind: "dim" });
    const [tx, ty] = p([hx + 0.3, hy, z]);
    labels.push({ x: tx + 8, y: ty + 4, text: `+${(z * 3).toFixed(2)}`, kind: "muted" });
  });
  const [ex, ey] = p([hx + 0.3, hy, top + SLAB_H * 1.6]);
  labels.push({ x: ex + 8, y: ey, text: "EL +14.40", kind: "accent" });

  // Section cut A–A through axis x = 3.
  strokes.push({ d: d([p([3, -1.9, 0]), p([3, 5.9, 0])]), kind: "accent" });
  const [sa, sb] = [p([3, -2.35, 0]), p([3, 6.35, 0])];
  nodes.push({ x: sa[0], y: sa[1], r: 5, kind: "accent" }, { x: sb[0], y: sb[1], r: 5, kind: "accent" });

  // Survey nodes on slab corners.
  for (const pt of [p([0, 0, top]), p([6, 0, top]), p([6, 4, top]), p([0, 4, top]), p([6, 4, 0]), p([0, 4, 0])]) {
    nodes.push({ x: pt[0], y: pt[1], r: 3.2, kind: "accent" });
  }

  const scan = d(box(-0.25, 6.25, -0.25, 4.25, 0), true);
  return { strokes, labels, nodes, scan, scanTravel: round(top * 42) };
}

const AXO = buildAxonometric();

type ArtProps = { className?: string; live?: boolean };

export function BlueprintAxonometric({ className = "", live = false }: ArtProps) {
  return (
    <svg
      className={`bp-art bp-art--axo${live ? " is-live" : ""} ${className}`.trim()}
      viewBox="0 0 720 620"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{ "--scan-travel": `${-AXO.scanTravel}px` } as CSSProperties}
    >
      <path className="bp-scan" d={AXO.scan} />
      {AXO.strokes.map((stroke, index) => (
        <path key={index} className={`bp-d bp-${stroke.kind}`} d={stroke.d} pathLength={1} style={vars(index)} />
      ))}
      {AXO.nodes.map((node, index) => (
        <circle
          key={`n${index}`}
          className={node.kind === "bubble" ? "bp-d bp-bubble" : "bp-node"}
          cx={node.x}
          cy={node.y}
          r={node.r}
          pathLength={1}
          style={vars(index + 20)}
        />
      ))}
      {AXO.labels.map((label, index) => (
        <text
          key={`t${index}`}
          className={`bp-t${label.kind ? ` bp-t--${label.kind}` : ""}`}
          x={label.x}
          y={label.y}
          textAnchor={label.anchor ?? "start"}
          transform={label.rotate ? `rotate(${label.rotate} ${label.x} ${label.y})` : undefined}
          style={vars(index + 30)}
        >
          {label.text}
        </text>
      ))}
      <ScaleBar x={40} y={586} />
      <NorthArrow x={668} y={60} />
    </svg>
  );
}

function ScaleBar({ x, y }: { x: number; y: number }) {
  return (
    <g className="bp-scale" transform={`translate(${x} ${y})`}>
      {[0, 1, 2, 3].map((index) => (
        <rect key={index} x={index * 26} y={0} width={26} height={5} className={index % 2 === 0 ? "bp-scale__fill" : "bp-scale__void"} />
      ))}
      {["0", "2", "4", "6", "8m"].map((value, index) => (
        <text key={value} className="bp-t bp-t--muted" x={index * 26} y={18} textAnchor="middle" style={vars(60)}>
          {value}
        </text>
      ))}
    </g>
  );
}

function NorthArrow({ x, y }: { x: number; y: number }) {
  return (
    <g className="bp-north" transform={`translate(${x} ${y})`}>
      <circle className="bp-d bp-dim" r={18} pathLength={1} style={vars(40)} />
      <path className="bp-north__arrow" d="M0 -14 L6 8 L0 3 L-6 8 Z" />
      <text className="bp-t bp-t--accent" x={0} y={-24} textAnchor="middle" style={vars(62)}>N</text>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Floor plan (FAQ / contact)                                          */
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
const PLAN_LABELS: Label[] = [
  { x: 145, y: 12, text: "10.50", anchor: "middle" },
  { x: 365, y: 12, text: "11.50", anchor: "middle" },
  { x: 516, y: 118, text: "7.50", anchor: "start" },
  { x: 516, y: 278, text: "8.50", anchor: "start" },
  { x: 150, y: 124, text: "R-01  32.4 m²", anchor: "middle", kind: "muted" },
  { x: 360, y: 120, text: "R-02  28.8 m²", anchor: "middle", kind: "muted" },
  { x: 260, y: 290, text: "R-03  21.6 m²", anchor: "middle", kind: "muted" },
  { x: 410, y: 300, text: "R-04", anchor: "middle", kind: "muted" }
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
      <path className="bp-d bp-accent bp-cut" d="M20 210 H540" pathLength={1} style={vars(i++)} />
      <circle className="bp-node" cx={20} cy={210} r={5} />
      <circle className="bp-node" cx={540} cy={210} r={5} />
      {PLAN_LABELS.map((label, index) => (
        <text
          key={label.text}
          className={`bp-t${label.kind ? ` bp-t--${label.kind}` : ""}`}
          x={label.x}
          y={label.y}
          textAnchor={label.anchor ?? "start"}
          style={vars(index + 24)}
        >
          {label.text}
        </text>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Building section (process band background)                          */
/* ------------------------------------------------------------------ */

function buildSection() {
  const strokes: Stroke[] = [];
  const ground = 330;
  strokes.push({ d: `M0 ${ground} H1200`, kind: "strong" });
  for (let x = 0; x < 1200; x += 18) strokes.push({ d: `M${x} ${ground + 4} L${x - 12} ${ground + 16}`, kind: "faint" });
  const bays = [140, 300, 460, 620, 780, 940, 1060];
  const floors = [ground, 270, 210, 150, 90];
  floors.forEach((y, index) => strokes.push({ d: `M${bays[0]} ${y} H${bays[bays.length - 1]}`, kind: index === 0 ? "strong" : "line" }));
  bays.forEach((x) => strokes.push({ d: `M${x} ${ground} V${floors[floors.length - 1]}`, kind: "line" }));
  bays.forEach((x) => strokes.push({ d: `M${x} ${ground} V${ground + 44} M${x - 22} ${ground + 44} H${x + 22}`, kind: "hidden" }));
  strokes.push({ d: "M460 90 L620 40 L780 90", kind: "accent" });
  bays.forEach((x) => strokes.push({ d: `M${x} 70 V20`, kind: "dim" }));
  strokes.push({ d: "M1110 90 V330 M1102 90 H1118 M1102 150 H1118 M1102 210 H1118 M1102 270 H1118 M1102 330 H1118", kind: "dim" });
  return strokes;
}

const SECTION = buildSection();

export function BlueprintSection({ className = "", live = false }: ArtProps) {
  return (
    <svg
      className={`bp-art bp-art--section${live ? " is-live" : ""} ${className}`.trim()}
      viewBox="0 0 1200 400"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {SECTION.map((stroke, index) => (
        <path key={index} className={`bp-d bp-${stroke.kind}`} d={stroke.d} pathLength={1} style={vars(Math.min(index, 60))} />
      ))}
    </svg>
  );
}
