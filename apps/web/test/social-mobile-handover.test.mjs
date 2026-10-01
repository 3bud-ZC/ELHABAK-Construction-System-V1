import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { companySocialProfiles } from "../../../packages/contracts/src/index.ts";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const socialSource = read("../src/app/social-links.tsx");
const seoPageSource = read("../src/app/seo-page.tsx");
const homeSource = read("../src/app/page.tsx");
const headerSource = read("../src/app/public-header.tsx");
const processSource = read("../src/app/process-route.tsx");
const layoutSource = read("../src/app/layout.tsx");
const workspaceSource = read("../src/components/project-workspace.tsx");
const shellSource = read("../src/app/app/app-shell.tsx");
const shellCss = read("../src/app/styles/system/shell.css");

test("official social profiles are exactly the company-supplied URLs", () => {
  assert.deepEqual(
    companySocialProfiles.map((profile) => [profile.id, profile.url]),
    [
      ["instagram", "https://www.instagram.com/elhabak.construction?stkn=N2lhYTFmbHBkNmVy"],
      ["tiktok", "https://www.tiktok.com/@elhabak.construct"],
      ["facebook", "https://www.facebook.com/share/19rKHm9jSV/"]
    ]
  );
});

test("social links are labelled external anchors with safe rel attributes", () => {
  assert.match(socialSource, /<a\b/);
  assert.match(socialSource, /href=\{profile\.url\}/);
  assert.match(socialSource, /target="_blank"/);
  assert.match(socialSource, /rel="noopener noreferrer"/);
  assert.match(socialSource, /aria-label=\{/);
  assert.doesNotMatch(socialSource, /follower/i, "no follower counts");
});

test("social links appear in the footer and the contact areas only", () => {
  assert.match(seoPageSource, /<SocialLinks locale=\{locale\} variant="footer"/);
  assert.match(seoPageSource, /<SocialLinks locale=\{locale\} variant="contact"/);
  assert.match(homeSource, /<SocialLinks locale=\{locale\} variant="contact"/);
  assert.doesNotMatch(headerSource, /SocialLinks/, "the header/drawer does not repeat the social row");
});

test("public mobile drawer is a real modal: inert when closed, Escape closes, focus returns", () => {
  assert.match(headerSource, /inert=\{!menuOpen\}/);
  assert.match(headerSource, /e\.key === "Escape"/);
  assert.match(headerSource, /menuButtonRef\.current\?\.focus\(\)/);
  assert.match(headerSource, /aria-expanded=\{menuOpen\}/);
});

test("workflow keeps one drawing and six stations inside the compact track", () => {
  assert.match(processSource, /className="process-track"/);
  assert.equal((processSource.match(/className="process-board"/g) ?? []).length, 1);
  assert.match(layoutSource, /import "\.\/public-mobile\.css";/);
});

test("project module navigation stays role-gated", () => {
  // Finance only for ADMIN/ACCOUNTANT, Design and Documents never for WORKER/ACCOUNTANT,
  // Chat never for ACCOUNTANT.
  assert.match(workspaceSource, /role === "ADMIN" \|\| role === "ACCOUNTANT"\s*\?\s*\[\{ id: "finance"/);
  assert.match(workspaceSource, /role === "ADMIN" \|\| role === "ENGINEER" \|\| role === "CLIENT"\s*\?\s*\[\{ id: "design"/);
  assert.match(workspaceSource, /role === "ADMIN" \|\| role === "ENGINEER" \|\| role === "CLIENT"\s*\?\s*\[\{ id: "documents"/);
  assert.match(workspaceSource, /role === "ADMIN" \|\| role === "ENGINEER" \|\| role === "WORKER" \|\| role === "CLIENT"\s*\?\s*\[\{ id: "chat"/);
});

test("phone bottom navigation reserves its height for the page content", () => {
  assert.match(shellSource, /app-bottom-nav/);
  assert.match(shellCss, /--nav-offset: calc\(var\(--bottom-nav-height\) \+ var\(--safe-bottom\)\)/);
  assert.match(shellCss, /\.app-main \{\s*padding-bottom: var\(--nav-offset\);/);
});
