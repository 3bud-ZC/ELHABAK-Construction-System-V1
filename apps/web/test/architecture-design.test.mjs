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
  assert.match(layout, /import "\.\/public-home\.css";\s*\nimport "\.\/public-architecture\.css";\s*\nimport "\.\/public-mobile\.css";/);
  const imports = [...globals.matchAll(/@import "([^"]+)";/g)].map((match) => match[1]);
  // The architectural layer, then the final phone-hardening layer, close the system cascade.
  assert.deepEqual(imports.slice(-2), ["./styles/system/architecture.css", "./styles/system/mobile.css"]);
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
  assert.match(art, /export function BlueprintElevationDraft/);
  assert.match(art, /export function BlueprintElevationAxes/);
  assert.match(art, /export function BlueprintBuildSequence/);
  assert.match(art, /export function BlueprintPlan/);
  assert.match(art, /aria-hidden="true"/);
  assert.doesNotMatch(art, /Math\.random|Date\.now/, "geometry must render identically on server and client");
  assert.match(hero, /<BlueprintElevationDraft /);
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

test("shell and layouts respond to the real content width, not the viewport", () => {
  const shell = source("app/styles/system/shell.css");
  const register = source("app/styles/system/register.css");
  const dashboard = source("app/styles/system/dashboard.css");
  const chat = source("app/styles/system/chat.css");
  // Permanent sidebar only from 1200px (it needs 232px + ~920px of content).
  assert.match(shell, /@media \(max-width: 1199\.98px\) \{\s*\.app-shell \{/);
  assert.match(chat, /@media \(max-width: 1199\.98px\) \{\s*\.app-main:has\(> \.chat-page\)/);
  assert.match(shell, /container: app \/ inline-size;/);
  // Registers and the dashboard body switch on container width.
  assert.match(register, /@container app \(min-width: 900px\) and \(max-width: 1199\.98px\)/);
  assert.match(register, /@container app \(max-width: 899\.98px\)/);
  assert.doesNotMatch(register, /@media \(min-width: 1024px\) and \(max-width: 1439\.98px\)/);
  assert.match(dashboard, /@container app \(max-width: 1179\.98px\) \{\s*\.dashboard-body \{/);
  assert.match(dashboard, /container: dash-finance \/ inline-size;/);
});

test("search results stack vertically (list is not a flex row)", () => {
  const legacy = source("app/styles/legacy.css");
  assert.match(legacy, /\.search-results \{\s*display: grid;/);
  assert.match(legacy, /\.search-result \{\s*display: flex;/);
});

test("public motion avoids layout-triggering and blanket transitions", () => {
  assert.doesNotMatch(publicHome, /transition: all/);
  assert.doesNotMatch(publicHome, /will-change/);
  assert.doesNotMatch(publicCss, /transition: width/);
  assert.match(publicCss, /\.bp-art \.bp-faint\.bp-d \{[^}]*animation-name: bp-fade;/);
});
