// ELHABAK visual QA matrix — authenticated screenshots + DOM metrics across the viewport
// matrix (page overflow, off-screen content, sub-12px text, small phone touch targets,
// console/page errors).
//
// ISOLATED QA ONLY: a local web (:3000) + API (:4000) on the `elhabak_test` database, or
// staging.elhabak.com (QA_WEB=https://staging.elhabak.com QA_API=https://staging.elhabak.com/api
// QA_BASIC_AUTH=user:pass). It signs in with the demo admin and opens Chat (which marks
// messages read), so it refuses the production domain.
//
// Usage: node scripts/qa/visual-matrix.mjs <outDir> [viewports|all] [routes|all] [ar|en]
//   env: QA_WEB, QA_API (default localhost), QA_EMAIL, QA_PASSWORD (default: DEMO_ADMIN_PASSWORD
//   from the repo .env), QA_FULL=1 for full-page captures, CHROME_PATH to override Chrome.
import { createRequire } from "node:module";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1").replace(/\/$/, "");
// puppeteer-core is an API dependency (PDF reports); resolve it from there.
const puppeteer = createRequire(`${ROOT}/apps/api/package.json`)("puppeteer-core");
const readEnv = () => {
  try {
    return readFileSync(`${ROOT}/.env`, "utf8");
  } catch {
    return "";
  }
};
const env = Object.fromEntries(
  readEnv()
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);
const WEB = process.env.QA_WEB ?? "http://localhost:3000";
const API = process.env.QA_API ?? "http://localhost:4000";
// Allowed: the local isolated stack, or staging.elhabak.com. Never the production domain —
// the harness signs in with demo accounts and opens Chat (which marks messages read).
for (const target of [WEB, API]) {
  if (!/^(https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?|https:\/\/staging\.elhabak\.com(\/api)?)$/.test(target)) {
    console.error(`Refusing QA target ${target}: only the local elhabak_test stack or staging.elhabak.com.`);
    process.exit(2);
  }
}
// staging.elhabak.com sits behind HTTP basic auth: QA_BASIC_AUTH="user:password".
const basicAuth = process.env.QA_BASIC_AUTH
  ? { username: process.env.QA_BASIC_AUTH.split(":")[0], password: process.env.QA_BASIC_AUTH.split(":").slice(1).join(":") }
  : null;
const EMAIL = process.env.QA_EMAIL ?? "mohamed.elhabak@elhabak.local";
const PASSWORD = process.env.QA_PASSWORD ?? env.DEMO_ADMIN_PASSWORD;
if (!PASSWORD) {
  console.error("Set QA_PASSWORD or DEMO_ADMIN_PASSWORD in the repo .env (local demo admin).");
  process.exit(2);
}

const outDir = process.argv[2] ?? "shots";
const vpFilter = process.argv[3] && process.argv[3] !== "all" ? process.argv[3].split(",") : null;
const routeFilter = process.argv[4] && process.argv[4] !== "all" ? process.argv[4].split(",") : null;
const lang = process.argv[5] ?? "ar";
const fullPage = process.env.QA_FULL === "1";
mkdirSync(outDir, { recursive: true });

const VIEWPORTS = {
  d1920: { width: 1920, height: 1080 },
  d1440: { width: 1440, height: 900 },
  d1280: { width: 1280, height: 800 },
  t1024: { width: 1024, height: 768 },
  t768: { width: 768, height: 1024, mobile: true },
  i430: { width: 430, height: 932, mobile: true, ios: true },
  i390: { width: 390, height: 844, mobile: true, ios: true },
  i375: { width: 375, height: 812, mobile: true, ios: true },
  a412: { width: 412, height: 915, mobile: true },
  a393: { width: 393, height: 873, mobile: true },
  a360: { width: 360, height: 800, mobile: true },
  s700: { width: 390, height: 700, mobile: true, ios: true }
};
const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36";

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--lang=ar", "--hide-scrollbars"]
});
const page = await browser.newPage();
if (basicAuth) await page.authenticate(basicAuth);
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`${WEB}/login`, { waitUntil: "networkidle2" });
await page.evaluate((l) => {
  document.cookie = `elhabak_lang=${l}; path=/`;
  try {
    localStorage.setItem("elhabak-lang", l);
  } catch {
    // storage unavailable: the ?lang= query still selects the locale
  }
}, lang);
await page.type("#email", EMAIL);
await page.type("#password", PASSWORD);
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}), page.click("button[type=submit]")]);
await new Promise((r) => setTimeout(r, 1500));

const api = (path) =>
  page.evaluate(async (u) => {
    const r = await fetch(u, { credentials: "include" });
    return r.ok ? r.json() : { __status: r.status };
  }, `${API}${path}`);

const projects = await api("/projects");
const list = Array.isArray(projects) ? projects : projects.items ?? projects.projects ?? [];
const project = list[0];
const pid = project?.id;
let designId, documentId, clientId, userId;
if (pid) {
  const designs = await api(`/projects/${pid}/designs`);
  const dl = Array.isArray(designs) ? designs : designs.items ?? designs.designs ?? [];
  designId = dl[0]?.id;
  const docs = await api(`/projects/${pid}/documents`);
  const dol = Array.isArray(docs) ? docs : docs.items ?? docs.documents ?? [];
  documentId = dol[0]?.id;
}
const clients = await api("/admin/clients");
clientId = (Array.isArray(clients) ? clients : clients.items ?? clients.clients ?? [])[0]?.id;
const users = await api("/admin/users");
userId = (Array.isArray(users) ? users : users.items ?? users.users ?? [])[0]?.id;

const ROUTES = {
  dashboard: "/app",
  projects: "/app/admin/projects",
  projectNew: "/app/admin/projects/new",
  projectEdit: pid && `/app/admin/projects/${pid}`,
  overview: pid && `/app/projects/${pid}`,
  design: pid && `/app/projects/${pid}/design`,
  designDetail: pid && designId && `/app/projects/${pid}/design/${designId}`,
  site: pid && `/app/projects/${pid}/site-activity`,
  finance: pid && `/app/projects/${pid}/finance`,
  documents: pid && `/app/projects/${pid}/documents`,
  documentDetail: pid && documentId && `/app/projects/${pid}/documents/${documentId}`,
  chat: pid && `/app/projects/${pid}/chat`,
  clients: "/app/admin/clients",
  clientNew: "/app/admin/clients/new",
  clientEdit: clientId && `/app/admin/clients/${clientId}`,
  team: "/app/admin/users",
  teamNew: "/app/admin/users/new",
  financeCenter: "/app/finance",
  reports: "/app/reports",
  reportBuilder: "/app/reports?builder=finance",
  reportDetail: pid && `/app/reports/${pid}`,
  data: "/app/data",
  settings: "/app/settings",
  search: "/app/search?q=%D9%81",
  notifications: "/app/notifications",
  financeBoq: pid && { path: `/app/projects/${pid}/finance`, steps: [".finance-subtabs button:nth-child(3)"] },
  financeExpenses: pid && { path: `/app/projects/${pid}/finance`, steps: [".finance-subtabs button:nth-child(4)"] },
  financePayments: pid && { path: `/app/projects/${pid}/finance`, steps: [".finance-subtabs button:nth-child(5)"] },
  financeExpenseModal: pid && { path: `/app/projects/${pid}/finance`, steps: [".finance-subtabs button:nth-child(4)", ".finance-panel-heading .ui-button--primary"] },
  projectsFilterSheet: { path: "/app/admin/projects", steps: [".adaptive-filters__toggle"], mobileOnly: true },
  siteReportModal: pid && { path: `/app/projects/${pid}/site-activity`, steps: ["[data-qa=site-add-report]"] },
  designUploadModal: pid && { path: `/app/projects/${pid}/design`, steps: [".ops-header__actions .ui-button, .design-hub-actions .ui-button--primary, [data-qa=design-upload]"] },
  documentPreview: pid && documentId && { path: `/app/projects/${pid}/documents/${documentId}`, steps: ["[data-qa=open-preview]"], mobileOnly: true },
  financeCenterExport: { path: "/app/finance", steps: [".action-menu__trigger"] }
};

const results = [];
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
page.on("requestfailed", (r) => {
  const u = r.url();
  if (!u.includes("_next/webpack-hmr") && !u.includes("socket.io") && !(u.includes("_rsc=") && r.failure()?.errorText === "net::ERR_ABORTED")) consoleErrors.push(`requestfailed: ${u} ${r.failure()?.errorText}`);
});

for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  if (vpFilter && !vpFilter.includes(vpName)) continue;
  await page.setUserAgent(vp.ios ? IOS_UA : vp.mobile ? ANDROID_UA : (await browser.userAgent()));
  await page.setViewport({ width: vp.width, height: vp.height, isMobile: !!vp.mobile, hasTouch: !!vp.mobile, deviceScaleFactor: 1 });
  for (const [name, routeDef] of Object.entries(ROUTES)) {
    if (!routeDef) continue;
    const route = typeof routeDef === "string" ? routeDef : routeDef.path;
    const steps = typeof routeDef === "string" ? [] : routeDef.steps;
    if (typeof routeDef !== "string" && routeDef.mobileOnly && vp.width >= 768) continue;
    if (routeFilter && !routeFilter.includes(name)) continue;
    consoleErrors.length = 0;
    try {
      const url = `${WEB}${route}${lang === "en" ? (route.includes("?") ? "&" : "?") + "lang=en" : ""}`;
      await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    } catch (e) {
      consoleErrors.push(`nav: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 900));
    for (const step of steps) {
      try {
        await page.waitForSelector(step, { timeout: 4000 });
        await page.$eval(step, (el) => el.click());
        await new Promise((r) => setTimeout(r, 700));
      } catch {
        consoleErrors.push(`step failed: ${step}`);
      }
    }
    const metrics = await page.evaluate((vw) => {
      const doc = document.documentElement;
      const overflowX = Math.max(doc.scrollWidth, document.body.scrollWidth) - window.innerWidth;
      const tiny = [];
      const smallTargets = [];
      const offscreen = [];
      const walker = document.querySelectorAll("body *");
      for (const el of walker) {
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
        if (hasText && parseFloat(cs.fontSize) < 12 && tiny.length < 12) tiny.push(`${el.tagName.toLowerCase()}.${(el.className?.toString?.() ?? "").split(" ")[0]} ${cs.fontSize} "${el.textContent.trim().slice(0, 24)}"`);
        if (vw < 768 && (el.tagName === "BUTTON" || (el.tagName === "A" && el.getAttribute("href")) || el.tagName === "SELECT" || (el.tagName === "INPUT" && el.type !== "hidden" && el.type !== "file" && el.type !== "checkbox" && el.type !== "radio"))) {
          if ((r.height < 40 || r.width < 40) && smallTargets.length < 12 && !el.closest(".ops-sr-only")) smallTargets.push(`${el.tagName.toLowerCase()}.${(el.className?.toString?.() ?? "").split(" ")[0]} ${Math.round(r.width)}x${Math.round(r.height)} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 20)}"`);
        }
        if ((r.right > vw + 1 || r.left < -1) && cs.position !== "fixed" && offscreen.length < 8) {
          let p = el.parentElement, clipped = false;
          while (p) { const pcs = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(pcs.overflowX)) { clipped = true; break; } p = p.parentElement; }
          if (!clipped) offscreen.push(`${el.tagName.toLowerCase()}.${(el.className?.toString?.() ?? "").split(" ")[0]} ${Math.round(r.left)}-${Math.round(r.right)}`);
        }
      }
      return { overflowX, tiny, smallTargets, offscreen, h1: document.querySelector("h1")?.textContent?.trim().slice(0, 40), docH: doc.scrollHeight };
    }, vp.width);
    const file = join(outDir, `${vpName}-${lang}-${name}.png`);
    await page.screenshot({ path: file, fullPage });
    results.push({ lang, vp: vpName, route: name, ...metrics, errors: [...consoleErrors] });
    const flag = metrics.overflowX > 0 || consoleErrors.length || metrics.offscreen.length ? "FAIL" : "ok";
    console.log(`${flag} ${vpName} ${name} ovf=${metrics.overflowX} tiny=${metrics.tiny.length} small=${metrics.smallTargets.length} off=${metrics.offscreen.length} err=${consoleErrors.length}`);
  }
}
writeFileSync(join(outDir, `results-${lang}-${vpFilter?.join("_") ?? "all"}.json`), JSON.stringify({ pid, designId, documentId, clientId, userId, results }, null, 2));
await browser.close();
