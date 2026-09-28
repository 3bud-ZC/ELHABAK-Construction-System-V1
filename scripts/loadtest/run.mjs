#!/usr/bin/env node
// ELHABAK load driver — dependency-free (Node 22 fetch), for isolated/staging targets only.
//
//   LOADTEST_API=http://127.0.0.1:4100 LOADTEST_ORIGIN=https://staging.elhabak.com \
//   LOADTEST_PASSWORD=... node scripts/loadtest/run.mjs <profile> [vus] [seconds]
//
// Profiles:
//   login  – login wave: every VU signs in once (measures bcrypt + session creation)
//   read   – A: read-heavy (auth/me, project list/detail/overview, timeline, designs,
//            documents, notifications)
//   mixed  – B: ~70% reads, 15% chat (history + post + Socket.IO), 10% search/report,
//            5% writes (notifications read, site updates without files)
//   files  – C: protected image/PDF downloads + bounded concurrent uploads
//   soak   – long read/mixed run; pair with scripts/loadtest/monitor.sh
//
// Users are the synthetic @loadtest.elhabak.local accounts from dataset.mjs. The target
// must never be production: the script refuses elhabak.com.
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const API = (process.env.LOADTEST_API ?? "http://127.0.0.1:4000").replace(/\/$/, "");
const ORIGIN = process.env.LOADTEST_ORIGIN ?? "http://localhost:3000";
const PASSWORD = process.env.LOADTEST_PASSWORD;
const [profile = "read", vusArg = "100", secondsArg = "60"] = process.argv.slice(2);
const VUS = Number(vusArg);
const SECONDS = Number(secondsArg);

if (/(^|\.)elhabak\.com(?!\.)/.test(new URL(API).hostname) && !new URL(API).hostname.startsWith("staging.")) {
  console.error("Refusing to load-test production.");
  process.exit(2);
}
if (!PASSWORD) {
  console.error("Set LOADTEST_PASSWORD (the synthetic dataset password).");
  process.exit(2);
}

const stats = new Map();
const statuses = new Map();
const groupFailures = new Map();
let errors = 0;
let requests = 0;
let bytes = 0;
function record(group, ms, status, size = 0) {
  requests += 1;
  bytes += size;
  statuses.set(status, (statuses.get(status) ?? 0) + 1);
  if (status === 0 || status >= 500 || status === 429) errors += 1;
  if (status < 200 || status >= 300) groupFailures.set(`${group} ${status}`, (groupFailures.get(`${group} ${status}`) ?? 0) + 1);
  if (!stats.has(group)) stats.set(group, []);
  stats.get(group).push(ms);
}

async function call(group, cookie, path, init = {}) {
  const started = performance.now();
  try {
    const response = await fetch(`${API}${path}`, {
      ...init,
      headers: { cookie, origin: ORIGIN, ...(init.body && !(init.body instanceof FormData) ? { "content-type": "application/json" } : {}), ...init.headers }
    });
    const buffer = await response.arrayBuffer();
    record(group, performance.now() - started, response.status, buffer.byteLength);
    return { status: response.status, body: buffer, headers: response.headers };
  } catch {
    record(group, performance.now() - started, 0);
    return { status: 0, body: new ArrayBuffer(0), headers: new Headers() };
  }
}
const json = (result) => {
  try {
    return JSON.parse(Buffer.from(result.body).toString("utf8"));
  } catch {
    return null;
  }
};

// Role mix of a working day: mostly clients and engineers, some workers/accountants/admins.
function identities(count) {
  const mix = [["client", 900, 0.5], ["engineer", 40, 0.25], ["worker", 50, 0.12], ["accountant", 8, 0.06], ["admin", 2, 0.07]];
  const out = [];
  for (const [role, pool, share] of mix) {
    const n = Math.max(1, Math.round(count * share));
    for (let i = 0; i < n && out.length < count; i += 1) out.push(`lt-${role}-${(i % pool) + 1}@loadtest.elhabak.local`);
  }
  while (out.length < count) out.push(`lt-client-${out.length + 1}@loadtest.elhabak.local`);
  return out.slice(0, count);
}

async function login(email) {
  const started = performance.now();
  const response = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify({ email, password: PASSWORD })
  });
  await response.arrayBuffer();
  record("login", performance.now() - started, response.status);
  const cookie = (response.headers.get("set-cookie") ?? "").split(";")[0];
  return response.status === 200 ? cookie : null;
}

async function prepare(email) {
  const cookie = await login(email);
  if (!cookie) return null;
  const projects = json(await call("projects.list", cookie, "/projects")) ?? [];
  const ids = (Array.isArray(projects) ? projects : []).map((project) => project.id).slice(0, 20);
  const role = email.split("-")[1];
  return { email, role, cookie, projects: ids, media: [], documents: [] };
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const weighted = (entries) => {
  const total = entries.reduce((sum, [weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [weight, fn] of entries) {
    roll -= weight;
    if (roll <= 0) return fn;
  }
  return entries[entries.length - 1][1];
};

async function readStep(vu) {
  const project = pick(vu.projects);
  const steps = [
    [3, () => call("auth.me", vu.cookie, "/auth/me")],
    [2, () => call("notifications", vu.cookie, "/notifications/unread-count")],
    [2, () => call("projects.list", vu.cookie, "/projects")]
  ];
  if (project) {
    steps.push(
      [3, () => call("project.detail", vu.cookie, `/projects/${project}`)],
      [2, () => call("project.overview", vu.cookie, `/projects/${project}/overview`)],
      [2, () => call("timeline", vu.cookie, `/projects/${project}/timeline?limit=100`)],
      [1, () => call("timeline.summary", vu.cookie, `/projects/${project}/timeline/summary`)]
    );
    if (vu.role !== "worker" && vu.role !== "accountant") steps.push([2, () => call("designs", vu.cookie, `/projects/${project}/designs`)]);
    if (vu.role !== "worker") steps.push([2, () => call("documents", vu.cookie, `/projects/${project}/documents`)]);
  }
  if (vu.role === "admin") steps.push([2, () => call("dashboard.summary", vu.cookie, "/admin/projects/dashboard/summary")], [1, () => call("admin.clients.page", vu.cookie, "/admin/clients?page=1&pageSize=25")]);
  steps.push([1, () => call("notifications.list", vu.cookie, "/notifications")]);
  await weighted(steps)();
}

async function chatStep(vu) {
  const project = pick(vu.projects);
  if (!project || vu.role === "accountant") return readStep(vu);
  if (Math.random() < 0.7) return call("chat.history", vu.cookie, `/projects/${project}/messages?limit=30`);
  return call("chat.post", vu.cookie, `/projects/${project}/messages`, { method: "POST", body: JSON.stringify({ type: "TEXT", text: `LT load message ${Date.now()}` }) });
}

async function searchStep(vu) {
  const project = pick(vu.projects);
  if (Math.random() < 0.6 || !project || vu.role === "worker") return call("search", vu.cookie, `/search?q=${encodeURIComponent(pick(["LT", "Project 1", "doc", "Site 3", "client"]))}`);
  return call("report.json", vu.cookie, `/reports/projects/${project}`);
}

async function writeStep(vu) {
  const project = pick(vu.projects);
  if (project && (vu.role === "engineer" || vu.role === "worker")) {
    const form = new FormData();
    form.set("note", "LT load site note");
    form.set("type", "GENERAL");
    form.append("media", new Blob([SMALL_JPEG], { type: "image/jpeg" }), "lt-note.jpg");
    return call("siteupdate.post", vu.cookie, `/projects/${project}/site-updates`, { method: "POST", body: form });
  }
  return call("notifications.readall", vu.cookie, "/notifications/read-all", { method: "PATCH", body: "{}" });
}

const SMALL_JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]), randomBytes(8 * 1024), Buffer.from([0xff, 0xd9])]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]), randomBytes(400 * 1024), Buffer.from([0xff, 0xd9])]);

async function fileStep(vu) {
  const project = pick(vu.projects);
  if (!project) return readStep(vu);
  if (!vu.media.length && !vu.documents.length) {
    const timeline = json(await call("timeline", vu.cookie, `/projects/${project}/timeline?limit=50`)) ?? [];
    for (const event of Array.isArray(timeline) ? timeline : []) for (const media of event.media ?? []) vu.media.push([project, media.id]);
    const docs = vu.role === "worker" ? [] : json(await call("documents", vu.cookie, `/projects/${project}/documents`));
    for (const doc of Array.isArray(docs) ? docs : []) if (doc?.currentVersion?.id) vu.documents.push([project, doc.id, doc.currentVersion.id]);
  }
  const roll = Math.random();
  if (roll < 0.1 && (vu.role === "engineer" || vu.role === "worker")) {
    const form = new FormData();
    form.set("note", "LT upload");
    form.append("media", new Blob([JPEG], { type: "image/jpeg" }), "lt-upload.jpg");
    return call("upload.image", vu.cookie, `/projects/${project}/site-updates`, { method: "POST", body: form });
  }
  if (roll < 0.6 && vu.media.length) {
    const [p, mediaId] = pick(vu.media);
    return call("download.image", vu.cookie, `/projects/${p}/media/${mediaId}`);
  }
  if (vu.documents.length) {
    const [p, docId, versionId] = pick(vu.documents);
    return call("download.pdf", vu.cookie, `/projects/${p}/documents/${docId}/versions/${versionId}/file`);
  }
  return readStep(vu);
}

async function realtime(vus, deadline) {
  const require = createRequire(resolve(ROOT, "apps/web/package.json"));
  const { io } = require("socket.io-client");
  let received = 0;
  let connected = 0;
  let joinDenied = 0;
  const sockets = vus.filter((vu) => vu.projects.length && vu.role !== "accountant").map((vu) => {
    const socket = io(API, { transports: ["websocket"], extraHeaders: { cookie: vu.cookie, origin: ORIGIN }, reconnection: true });
    socket.on("connect", () => {
      connected += 1;
      socket.emit("chat:join", { projectId: vu.projects[0] }, (ack) => {
        if (!ack?.ok) joinDenied += 1;
      });
    });
    socket.onAny(() => {
      received += 1;
    });
    return socket;
  });
  await new Promise((resolveWait) => setTimeout(resolveWait, Math.max(0, deadline - Date.now())));
  for (const socket of sockets) socket.close();
  return { sockets: sockets.length, connected, received, joinDenied };
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

function report(elapsedSeconds, extra = {}) {
  const groups = {};
  const all = [];
  for (const [group, values] of stats) {
    values.sort((a, b) => a - b);
    all.push(...values);
    groups[group] = { n: values.length, p50: +percentile(values, 50).toFixed(1), p95: +percentile(values, 95).toFixed(1), p99: +percentile(values, 99).toFixed(1) };
  }
  all.sort((a, b) => a - b);
  return {
    profile,
    vus: VUS,
    seconds: +elapsedSeconds.toFixed(1),
    requests,
    rps: +(requests / elapsedSeconds).toFixed(1),
    errors,
    errorRate: +((errors / Math.max(1, requests)) * 100).toFixed(2),
    p50: +percentile(all, 50).toFixed(1),
    p95: +percentile(all, 95).toFixed(1),
    p99: +percentile(all, 99).toFixed(1),
    mbTransferred: +(bytes / 1048576).toFixed(1),
    statuses: Object.fromEntries(statuses),
    nonSuccessByGroup: Object.fromEntries(groupFailures),
    groups,
    ...extra
  };
}

// ---------------------------------------------------------------- run
const emails = identities(VUS);
const prepStart = performance.now();
const vus = [];
// Sign in in small parallel batches (a real morning wave, not one instant burst).
for (let i = 0; i < emails.length; i += 10) {
  vus.push(...(await Promise.all(emails.slice(i, i + 10).map(prepare))).filter(Boolean));
}
const loginSummary = report((performance.now() - prepStart) / 1000);
if (profile === "login") {
  console.log(JSON.stringify({ ...loginSummary, signedIn: vus.length }, null, 2));
  process.exit(0);
}
stats.clear();
statuses.clear();
groupFailures.clear();
errors = 0;
requests = 0;
bytes = 0;

const started = performance.now();
const deadline = Date.now() + SECONDS * 1000;
const stepFor = {
  read: () => readStep,
  soak: () => (Math.random() < 0.85 ? readStep : chatStep),
  mixed: () => weighted([[70, readStep], [15, chatStep], [10, searchStep], [5, writeStep]]),
  files: () => fileStep
}[profile];
if (!stepFor) {
  console.error(`Unknown profile ${profile}`);
  process.exit(2);
}
const realtimeRun = profile === "mixed" || profile === "soak" ? realtime(vus, deadline) : Promise.resolve(null);
await Promise.all(
  vus.map(async (vu) => {
    while (Date.now() < deadline) {
      await stepFor()(vu);
      // Think time: a person clicks every ~0.5–1.5 s, not in a tight loop.
      const think = process.env.LOADTEST_THINK_MS !== undefined ? Number(process.env.LOADTEST_THINK_MS) : 500 + Math.random() * 1000;
      if (think > 0) await new Promise((r) => setTimeout(r, think));
    }
  })
);
const realtimeStats = await realtimeRun;
console.log(JSON.stringify(report((performance.now() - started) / 1000, { signedIn: vus.length, login: loginSummary.groups.login, ...(realtimeStats ? { realtime: realtimeStats } : {}) }), null, 2));
