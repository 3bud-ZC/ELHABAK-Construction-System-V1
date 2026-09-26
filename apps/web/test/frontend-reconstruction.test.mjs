import { readFileSync } from "node:fs";
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
const css = source("app/globals.css");

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

test("final reconstruction CSS covers dense mobile-safe professional layouts", () => {
  assert.match(css, /\.site-activity-record/);
  assert.match(css, /\.boq-register--qs/);
  assert.match(css, /\.document-preview-workbench/);
  assert.match(css, /\.document-version-ledger/);
  assert.match(css, /\.chat-communication-workspace/);
  assert.match(css, /\.notification-destination/);
  assert.match(css, /\.search-result__type/);
  assert.match(css, /\.credential-reveal/);
  assert.match(css, /\.project-form-system/);
});
