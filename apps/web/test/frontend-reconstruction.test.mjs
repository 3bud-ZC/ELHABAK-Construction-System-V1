import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

const site = source("app/app/projects/site-operations.tsx");
const finance = source("app/app/projects/finance.tsx");
const documents = source("app/app/projects/documents-hub.tsx");
const documentDetail = source("app/app/projects/document-detail.tsx");
const chat = source("app/app/projects/chat.tsx");
const bell = source("components/notification-bell.tsx");
const notifications = source("app/app/notifications/notifications-client.tsx");
const search = source("app/app/search/search-client.tsx");
const clients = source("app/app/admin/clients/clients-client.tsx");
const projectForm = source("app/app/admin/projects/project-form.tsx");
const entry = source("app/globals.css");
const systemDir = new URL("../src/app/styles/system/", import.meta.url);
const systemCss = readdirSync(systemDir).map((file) => readFileSync(new URL(file, systemDir), "utf8")).join("\n");
const legacyCss = source("app/styles/legacy.css");
const tokensCss = source("app/styles/tokens.css");

test("remaining reconstruction surfaces expose final composition markers", () => {
  assert.match(site, /site-activity-record/);
  assert.match(site, /site-media-gallery--single/);
  assert.match(finance, /boq-register--qs/);
  assert.match(finance, /boq-section-ledger/);
  assert.match(documents, /document-control-register/);
  assert.match(documentDetail, /document-preview-workbench/);
  assert.match(documentDetail, /document-version-ledger/);
  assert.match(chat, /chat-communication-workspace/);
  assert.match(bell, /notification-destination/);
  assert.match(notifications, /notification-destination/);
  assert.match(search, /search-result__type/);
  assert.match(clients, /credential-reveal/);
  assert.match(projectForm, /project-form-system/);
});

test("stylesheet architecture: layered cascade with the adaptive system last", () => {
  assert.match(source("app/styles/layers.css"), /@layer legacy, public, system;/);
  const imports = [...entry.matchAll(/@import "([^"]+)";/g)].map((match) => match[1]);
  assert.deepEqual(imports.slice(0, 3), ["./styles/layers.css", "./styles/tokens.css", "./styles/legacy.css"]);
  assert.ok(imports.slice(3).every((path) => path.startsWith("./styles/system/")));
  assert.match(legacyCss, /@layer legacy \{/);
  assert.match(source("app/public-home.css"), /@layer public \{/);
  for (const token of ["--fs-caption", "--radius-xl", "--control-height-touch", "--bottom-nav-height", "--z-dialog", "safe-area-inset-bottom"]) {
    assert.ok(tokensCss.includes(token), token);
  }
});

test("adaptive system covers filters, dialogs, previews, registers and sticky actions", () => {
  for (const selector of [
    ".adaptive-filters__panel",
    ".adaptive-chip",
    ".action-menu__list",
    ".fullscreen-viewer",
    ".preview-launcher",
    ".ops-register__row",
    ".finance-register__row",
    ".report-table-wrap--cards",
    ".project-form-actions",
    ".project-context__nav",
    ".credential-reveal",
    ".project-form-system",
    ".review-slot--state",
    "100dvh"
  ]) {
    assert.ok(systemCss.includes(selector), selector);
  }
});

test("no rendered text is sized below 12px in the product stylesheets", () => {
  const literals = [...(legacyCss + systemCss).matchAll(/font(?:-size)?:\s*(?:\d{3}\s+)?([\d.]+)(rem|px)\b/g)];
  const tooSmall = literals.filter(([, value, unit]) => (unit === "rem" ? Number(value) * 16 : Number(value)) < 12);
  assert.deepEqual(tooSmall.map((match) => match[0]), []);
});
