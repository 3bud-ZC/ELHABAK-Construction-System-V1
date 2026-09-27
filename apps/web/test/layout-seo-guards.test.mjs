import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
const systemDir = new URL("../src/app/styles/system/", import.meta.url);
const systemFiles = readdirSync(systemDir).map((file) => [file, readFileSync(new URL(file, systemDir), "utf8")]);
const legacyCss = source("app/styles/legacy.css");

test("legacy layer cannot out-rank the system layer with new !important rules", () => {
  // An !important declaration in an earlier cascade layer beats every normal declaration
  // in later layers — two production defects (chat composer, data-ops stepper) came from
  // exactly that. The remaining seven are deliberate a11y / reduced-motion rules.
  const count = (legacyCss.match(/!important/g) ?? []).length;
  assert.ok(count <= 7, `legacy.css has ${count} !important declarations (max 7)`);
});

test("chat height is owned by flex layout, not viewport-minus-constant formulas", () => {
  const chatRules = [legacyCss, ...systemFiles.map(([, css]) => css)]
    .join("\n")
    .split("}")
    .filter((rule) => /chat-(page|shell|communication-workspace)[^{]*\{/.test(rule));
  for (const rule of chatRules) {
    assert.doesNotMatch(rule, /height:\s*calc\(100d?vh\s*-/, `fixed viewport formula in: ${rule.trim().slice(0, 120)}`);
  }
  const chatCss = systemFiles.find(([file]) => file === "chat.css")?.[1] ?? "";
  assert.match(chatCss, /\.app-main:has\(> \.chat-page\)/);
  assert.match(chatCss, /\.chat-shell > \.chat-message-list[\s\S]*?min-height: 0/);
});

test("phone bottom offset is one shared token", () => {
  const shell = systemFiles.find(([file]) => file === "shell.css")?.[1] ?? "";
  const forms = systemFiles.find(([file]) => file === "forms.css")?.[1] ?? "";
  assert.match(shell, /--nav-offset:/);
  assert.match(forms, /bottom: var\(--nav-offset/);
});

test("public pages are indexable correctly in both languages", () => {
  const proxy = source("proxy.ts");
  const layout = source("app/layout.tsx");
  const sitemap = source("app/sitemap.ts");
  const seoPage = source("app/seo-page.tsx");
  const home = source("app/page.tsx");
  const login = source("app/login/page.tsx");
  const appLayout = source("app/app/layout.tsx");

  // English is server-rendered as English/LTR (not patched only on the client).
  assert.match(proxy, /x-elhabak-locale/);
  assert.match(layout, /lang=\{locale\}/);
  // hreflang pairs carry x-default; the sitemap does not fake daily freshness.
  assert.match(seoPage, /"x-default": path/);
  assert.match(home, /"x-default": "\/"/);
  assert.match(sitemap, /"x-default"/);
  assert.doesNotMatch(sitemap, /lastModified = new Date\(\)/);
  // Structured data: FAQ + local contractor entity.
  assert.match(home, /"@type": "FAQPage"/);
  assert.match(home, /GeneralContractor/);
  // Sign-in and the workspace stay out of the index.
  assert.match(login, /robots: \{ index: false/);
  assert.match(appLayout, /robots: \{ index: false/);
  // Footer links every service landing page.
  for (const path of ["/architectural-design", "/engineering-consultancy", "/construction-management", "/site-supervision", "/project-management"]) {
    assert.ok(seoPage.includes(`"${path}"`), `footer missing ${path}`);
  }
});

test("reveal motion never hides content from visitors without JavaScript", () => {
  const css = source("app/public-home.css");
  const revealIndex = css.indexOf("[data-reveal] {");
  const scriptingIndex = css.lastIndexOf("@media (scripting: enabled)", revealIndex);
  assert.ok(scriptingIndex !== -1 && scriptingIndex < revealIndex, "[data-reveal] hidden state must sit inside @media (scripting: enabled)");
});
