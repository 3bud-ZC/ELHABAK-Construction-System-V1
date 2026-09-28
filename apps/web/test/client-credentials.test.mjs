import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeEgyptianMobile } from "../../../packages/contracts/src/index.ts";
import { passwordPolicyIssue } from "../../../packages/validation/src/password-policy.ts";

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
const clients = source("app/app/admin/clients/clients-client.tsx");
const panel = source("app/app/admin/clients/client-credentials-panel.tsx");
const passwordForm = source("app/app/password-change-form.tsx");
const users = source("app/app/admin/users/users-client.tsx");
const login = source("app/login/login-form.tsx");

test("client form and generator share one mobile normalizer (web side)", () => {
  for (const input of ["01130666726", "+201130666726", "201130666726", "00201130666726", "011 3066 6726", "+20 11 3066 6726", "٠١١٣٠٦٦٦٧٢٦"]) {
    assert.equal(normalizeEgyptianMobile(input), "+201130666726", input);
  }
  for (const input of ["", "0223456789", "+971501234567", "0113O666726", "01330666726"]) {
    assert.equal(normalizeEgyptianMobile(input), null, input);
  }
  assert.match(clients, /normalizeEgyptianMobile\(formValue\(data, "phone"\)\)/);
});

test("client edit form can no longer send an Admin-typed password", () => {
  // Root cause of the 2026-09-27 failure: a blind password field on the edit form
  // replaced the credential already handed to the client.
  assert.doesNotMatch(clients, /name="temporaryPassword"/);
  assert.doesNotMatch(clients, /temporaryPassword:\s*mode/);
  assert.match(clients, /\/reset-password`/);
  assert.match(clients, /ConfirmDialog/);
});

test("one-time credential panel offers the three copy actions and drops the secret on dismiss", () => {
  assert.match(panel, /copyLogin/);
  assert.match(panel, /copyPassword/);
  assert.match(panel, /copyAll/);
  assert.match(clients, /setCredentials\(null\)/);
  assert.doesNotMatch(panel, /localStorage|sessionStorage/);
  assert.doesNotMatch(clients, /localStorage|sessionStorage/);
});

test("password change form uses password-manager autocomplete and the shared policy", () => {
  assert.match(passwordForm, /autoComplete="current-password"/);
  assert.match(passwordForm, /autoComplete="new-password"/);
  assert.match(passwordForm, /CURRENT_PASSWORD_INVALID/);
  assert.doesNotMatch(passwordForm, /target\.value\.trim/, "password values must never be trimmed");
  assert.match(passwordForm, /onChange=\{\(event\) => onChange\(event\.target\.value\)\}/);
  assert.equal(passwordPolicyIssue("short1"), "too_short");
  assert.equal(passwordPolicyIssue("Solid-Pass-2026"), null);
});

test("staff reset dialog shows a generated, visible password instead of a blind field", () => {
  assert.match(users, /setTemporaryPassword\(kind === "reset" \? generateTemporaryPassword\(\) : ""\)/);
  assert.doesNotMatch(users, /type="password" minLength=\{10\} value=\{props\.temporaryPassword\}/);
});

test("login distinguishes throttling and outages from wrong credentials", () => {
  assert.match(login, /status === 429 \? labels\.rateLimited/);
});
