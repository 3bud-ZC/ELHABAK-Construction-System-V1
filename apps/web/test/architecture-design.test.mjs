import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
const publicCss = source("app/public-architecture.css");
const publicHome = source("app/public-home.css");
const systemCss = source("app/styles/system/architecture.css");
const tokens = source("app/styles/tokens.css");
const globals = source("app/globals.css");
const layout = source("app/layout.tsx");
const art = source("app/blueprint-art.tsx");
const hero = source("app/public-hero.tsx");
const motion = source("app/public-motion.tsx");

test("architectural layers are wired in cascade order", () => {
  assert.match(layout, /import "\.\/public-home\.css";\s*\nimport "\.\/public-architecture\.css";/);
  const imports = [...globals.matchAll(/@import "([^"]+)";/g)].map((match) => match[1]);
  assert.equal(imports.at(-1), "./styles/system/architecture.css");
  assert.match(publicCss, /^@layer public \{/m);
  assert.match(systemCss, /^@layer system \{/m);
});

test("design tokens define the blueprint grounds and AA orange ink", () => {
  for (const token of ["--blueprint-grid:", "--blueprint-grid-light:", "--ruler-ticks:", "--orange-ink: #b9520d", "--ease-draw:"]) {
    assert.ok(tokens.includes(token), token);
  }
  assert.doesNotMatch(tokens, /--blueprint-grid: none/);
});

test("line art is decorative, deterministic and motion-safe", () => {
  assert.match(art, /export function BlueprintAxonometric/);
  assert.match(art, /export function BlueprintPlan/);
  assert.match(art, /export function BlueprintSection/);
  assert.match(art, /aria-hidden="true"/);
  assert.doesNotMatch(art, /Math\.random|Date\.now/, "geometry must render identically on server and client");
  assert.match(hero, /<BlueprintAxonometric live/);
  assert.match(motion, /\.bp-art:not\(\.is-live\)/);
  assert.match(publicCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.bp-art \.bp-d/);
  assert.match(publicCss, /@media \(scripting: none\)[\s\S]*?stroke-dashoffset: 0/);
  assert.match(systemCss, /@media \(prefers-reduced-motion: no-preference\)/);
  assert.match(publicCss, /\.bp-art \{[^}]*direction: ltr;/, "annotations stay LTR on Arabic pages");
});

test("internal entrance motion never transforms page children (fixed bars stay anchored)", () => {
  const enter = systemCss.match(/@keyframes arch-enter \{[\s\S]*?\n {2}\}/)?.[0] ?? "";
  assert.ok(enter, "arch-enter keyframes present");
  assert.doesNotMatch(enter, /transform|translate/);
});

test("brand CTAs are orange, not the old green", () => {
  assert.doesNotMatch(publicHome, /#16A34A|#15803D/i);
  assert.doesNotMatch(publicCss, /#16A34A|#15803D|#25D366/i);
});

test("canonical company phone stays the single source of truth", () => {
  const contracts = readFileSync(new URL("../../../packages/contracts/src/index.ts", import.meta.url), "utf8");
  assert.match(contracts, /phone: "01130666726"/);
  assert.match(contracts, /phoneE164: "\+201130666726"/);
  assert.match(contracts, /whatsappNumber: "201130666726"/);
});
