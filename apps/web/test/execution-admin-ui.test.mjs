import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { passwordPolicyIssue, passwordMinLength } from "../../../packages/validation/src/password-policy.ts";

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
const pkg = (path) => readFileSync(new URL(`../../../packages/${path}`, import.meta.url), "utf8");
const shell = source("app/styles/system/shell.css");
const filters = source("app/styles/system/filters.css");
const forms = source("app/styles/system/forms.css");
const legacy = source("app/styles/legacy.css");
const data = source("app/styles/system/data.css");
const executionCss = source("app/styles/system/execution.css");
const globals = source("app/globals.css");
const adaptive = pkg("ui/src/adaptive.tsx");
const workspace = source("components/project-workspace.tsx");
const execution = source("app/app/projects/execution.tsx");
const deleteDialog = source("components/permanent-delete-dialog.tsx");
const credentialPanel = source("app/app/admin/clients/client-credentials-panel.tsx");
const passwordForm = source("app/app/password-change-form.tsx");

test("desktop sidebar stays pinned to the viewport; only its navigation scrolls", () => {
  const rule = shell.slice(shell.indexOf("  .app-sidebar {"), shell.indexOf("}", shell.indexOf("  .app-sidebar {")));
  assert.match(rule, /position: sticky;/);
  assert.match(rule, /top: 0;/);
  assert.match(rule, /height: 100dvh;/);
  assert.match(rule, /overflow: hidden;/);
  const nav = shell.slice(shell.indexOf("  .app-nav {"), shell.indexOf("}", shell.indexOf("  .app-nav {")));
  assert.match(nav, /min-height: 0;/);
  assert.match(nav, /overflow-y: auto;/);
});

test("action menus are portaled and anchored instead of absolutely positioned in the page", () => {
  assert.match(adaptive, /createPortal\(menu, document\.body\)/);
  assert.match(adaptive, /export function useAnchoredPosition/);
  assert.match(adaptive, /addEventListener\("scroll", update, true\)/);
  assert.match(adaptive, /event\.key === "Escape"/);
  const list = filters.slice(filters.indexOf("  .action-menu__list {"), filters.indexOf("}", filters.indexOf("  .action-menu__list {")));
  assert.match(list, /position: fixed;/);
  assert.doesNotMatch(list, /position: absolute/);
  assert.match(filters, /prefers-reduced-motion: reduce[\s\S]*action-menu__list--floating/);
});

test("project summary rail has no dark slabs left from the old dark rail", () => {
  assert.doesNotMatch(legacy, /rgba\(10, 22, 46, 0\.55\)/);
  assert.doesNotMatch(legacy, /\.project-form-summary__facts>div \{/);
  assert.match(forms, /\.project-form-summary__facts > div \{[\s\S]*?background: none;/);
  assert.doesNotMatch(forms, /\.project-form-rail \{\s*position: static;\s*order: -1;/);
});

test("data operations use one width and pair export with history", () => {
  assert.match(data, /\.dataops-console \{\s*max-width: none;/);
  assert.match(data, /\.dataops-lower \{/);
});

test("execution control is a workspace module with its own stylesheet and reduced-motion guard", () => {
  assert.match(globals, /@import "\.\/styles\/system\/execution\.css";/);
  assert.match(workspace, /id: "execution" as const/);
  assert.match(execution, /\/execution\/stages\/order/);
  assert.match(execution, /\/team`/);
  assert.match(executionCss, /prefers-reduced-motion: reduce/);
});

test("permanent deletion reads a server preflight and requires typed confirmation", () => {
  assert.match(deleteDialog, /\/deletion-impact`/);
  assert.match(deleteDialog, /THIS ACTION CANNOT BE UNDONE/);
  assert.match(deleteDialog, /لا يمكن التراجع عن هذا الإجراء/);
  assert.match(deleteDialog, /disabled=\{!matches \|\| busy/);
  assert.match(deleteDialog, /acknowledgedProjectCount/);
});

test("client credential message is the owner's simple wording", () => {
  assert.match(credentialPanel, /"بيانات دخول العميل"/);
  assert.match(credentialPanel, /"كلمة المرور المؤقتة:"/);
  assert.match(credentialPanel, /"يمكنك تغيير كلمة المرور بعد تسجيل الدخول\."/);
  assert.doesNotMatch(credentialPanel, /0 و O/);
});

test("clients choose any 8+ character password; staff policy unchanged", () => {
  assert.equal(passwordMinLength("client"), 8);
  assert.equal(passwordPolicyIssue("12345678", "client"), null);
  assert.equal(passwordPolicyIssue("1234567", "client"), "too_short");
  assert.equal(passwordPolicyIssue("12345678"), "too_short");
  assert.match(passwordForm, /passwordPolicyIssue\(newPassword, audience\)/);
});

test("overlays lock scrolling on <html>, keeping the sticky sidebar anchored to the viewport", () => {
  const interactive = pkg("ui/src/interactive.tsx");
  for (const file of [adaptive, interactive]) {
    assert.match(file, /document\.documentElement\.style\.overflow = "hidden"/);
    assert.doesNotMatch(file, /document\.body\.style\.overflow/);
  }
});
