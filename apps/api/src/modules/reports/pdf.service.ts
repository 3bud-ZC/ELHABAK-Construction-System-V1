import { Injectable, type OnApplicationShutdown, ServiceUnavailableException } from "@nestjs/common";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import puppeteer, { type Browser } from "puppeteer-core";
import type { ReportsService } from "./reports.service";

type ReportData = Awaited<ReturnType<ReportsService["getProjectReport"]>>;
type Locale = "ar" | "en";

@Injectable()
export class PdfService implements OnApplicationShutdown {
  private browser: Browser | undefined;

  async render(report: ReportData, locale: Locale) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(this.html(report, locale), { waitUntil: "load" });
      await page.emulateMediaType("print");
      const bytes = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        headerTemplate: "<span></span>",
        footerTemplate: `<div style="width:100%;font:9px Arial;color:#667085;padding:0 14mm;display:flex;justify-content:space-between;direction:${locale === "ar" ? "rtl" : "ltr"}"><span>ELHABAK CONSTRUCTION</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
        margin: { top: "12mm", right: "12mm", bottom: "16mm", left: "12mm" }
      });
      return Buffer.from(bytes);
    } finally {
      await page.close();
    }
  }

  async close() {
    await this.browser?.close();
    this.browser = undefined;
  }

  async onApplicationShutdown() {
    await this.close();
  }

  private async getBrowser() {
    if (this.browser?.connected) return this.browser;
    const executablePath = findChromium();
    if (!executablePath) throw new ServiceUnavailableException("PDF renderer is unavailable.");
    this.browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });
    return this.browser;
  }

  private html(report: ReportData, locale: Locale) {
    const ar = locale === "ar";
    const labels = ar
      ? {
        report: "تقرير المشروع",
        issued: "تاريخ الإصدار",
        identity: "بيانات المشروع",
        client: "العميل",
        engineer: "المهندس",
        location: "الموقع",
        category: "التصنيف",
        phase: "المرحلة الحالية",
        status: "الحالة",
        progress: "نسبة التقدم",
        start: "تاريخ البدء",
        target: "التاريخ المستهدف",
        operations: "عمليات الموقع",
        updates: "آخر تحديثات الموقع",
        design: "سجل التصميمات",
        title: "العنوان",
        discipline: "التخصص",
        revision: "المراجعة",
        finance: "الملخص المالي",
        documents: "سجل المستندات",
        reference: "المرجع",
        version: "الإصدار",
        visibility: "الإتاحة",
        activity: "سجل النشاط",
        communication: "بيانات التواصل",
        messages: "عدد الرسائل",
        lastMessage: "آخر رسالة",
        empty: "لا توجد بيانات مسجلة لهذا القسم.",
        code: "كود المشروع",
        date: "التاريخ",
        actor: "بواسطة",
        internal: "داخلي",
        shared: "متاح للعميل"
      }
      : {
        report: "Project Report",
        issued: "Issue date",
        identity: "Project Identity",
        client: "Client",
        engineer: "Engineer",
        location: "Location",
        category: "Category",
        phase: "Current phase",
        status: "Status",
        progress: "Progress",
        start: "Start date",
        target: "Target date",
        operations: "Site Operations",
        updates: "Recent Site Updates",
        design: "Design Register",
        title: "Title",
        discipline: "Discipline",
        revision: "Revision",
        finance: "Financial Summary",
        documents: "Document Register",
        reference: "Reference",
        version: "Version",
        visibility: "Visibility",
        activity: "Activity History",
        communication: "Communication Metadata",
        messages: "Message count",
        lastMessage: "Last message",
        empty: "No persisted data is available for this section.",
        code: "Project code",
        date: "Date",
        actor: "By",
        internal: "Internal",
        shared: "Client shared"
      };
    const p = report.project;
    const fontRegular = readBase64(
      require.resolve("@fontsource/almarai/files/almarai-arabic-400-normal.woff2")
    );
    const fontBold = readBase64(
      require.resolve("@fontsource/almarai/files/almarai-arabic-700-normal.woff2")
    );
    const logo = readBase64(findBrandAsset());
    const issued = formatDate(new Date().toISOString(), locale);
    const identity: Array<[string, string | number | null | undefined]> = [
      [labels.code, p.code],
      [labels.client, p.client?.user.displayName],
      [labels.engineer, p.engineer?.displayName],
      [labels.location, p.location],
      [labels.category, enumLabel(p.category, locale)],
      [labels.phase, enumLabel(p.phase, locale)],
      [labels.status, enumLabel(p.status, locale)],
      [labels.progress, `${p.progress}%`],
      [labels.start, formatDate(p.startDate, locale)],
      [labels.target, formatDate(p.targetDate, locale)]
    ];
    const finance = report.finance as Record<string, unknown> | null;
    const currency = typeof finance?.currency === "string" ? finance.currency : "EGP";
    const financeRows = finance
      ? Object.entries(finance)
        .filter(
          ([key, value]) =>
            !["scope", "items", "currency"].includes(key) &&
            (typeof value === "string" || typeof value === "number" || value == null)
        )
        .map(([key, value]) => {
          const display =
            typeof value === "string"
              ? value
              : typeof value === "number"
                ? value.toString()
                : null;
          return [
            financeLabel(key, locale),
            display === null ? null : `${display}${isMoneyKey(key) ? ` ${currency}` : ""}`
          ];
        })
      : [];

    return `<!doctype html><html lang="${locale}" dir="${ar ? "rtl" : "ltr"}"><head><meta charset="utf-8"><style>
@font-face{font-family:Almarai;src:url(data:font/woff2;base64,${fontRegular}) format('woff2');font-weight:400}@font-face{font-family:Almarai;src:url(data:font/woff2;base64,${fontBold}) format('woff2');font-weight:700}
@page{size:A4;margin:12mm 12mm 16mm}*{box-sizing:border-box}body{margin:0;color:#17234b;font-family:Almarai,Arial,sans-serif;font-size:10px;line-height:1.6}header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #e87625;padding-bottom:9px;margin-bottom:14px}header img{width:145px;height:auto}h1{font-size:21px;margin:0;color:#17234b}h2{font-size:13px;margin:0 0 8px;padding:6px 9px;border-${ar ? "right" : "left"}:4px solid #e87625;background:#f3f5f9}section{margin:0 0 13px;break-inside:avoid}section.allow-break{break-inside:auto}.meta{color:#667085;margin-top:3px}.identity{display:grid;grid-template-columns:repeat(2,1fr);border:1px solid #d8dde8}.identity div{display:grid;grid-template-columns:42% 1fr;padding:6px 8px;border-bottom:1px solid #e7eaf0}.identity div:nth-child(odd){border-${ar ? "left" : "right"}:1px solid #e7eaf0}.identity div:nth-last-child(-n+2){border-bottom:0}.identity b{color:#667085}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #d8dde8;padding:5px 6px;text-align:${ar ? "right" : "left"};vertical-align:top;overflow-wrap:anywhere}th{background:#17234b;color:#fff;font-weight:700}tr{break-inside:avoid}.empty{padding:12px;border:1px dashed #bdc5d5;color:#667085;text-align:center}.pill{display:inline-block;background:#eef1f7;border-radius:20px;padding:1px 7px}.ltr{direction:ltr;unicode-bidi:isolate;display:inline-block}.cover-code{font:700 11px monospace;color:#e87625}.finance-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.finance-card{border:1px solid #d8dde8;padding:8px}.finance-card b{display:block;color:#667085;font-size:8px}.finance-card strong{font-size:11px}.note{white-space:pre-wrap}footer{margin-top:12px;border-top:1px solid #d8dde8;padding-top:6px;color:#667085;font-size:8px}</style></head><body>
<header><div><h1>${e(p.name)}</h1><div class="cover-code ltr">${e(p.code ?? "—")}</div><div class="meta">${labels.report} · ${labels.issued}: <span class="ltr">${e(issued)}</span></div></div><img src="data:image/png;base64,${logo}" alt="ELHABAK"></header>
${section(labels.identity, `<div class="identity">${identity.map(([key, value]) => `<div><b>${e(key)}</b><span>${value ? e(String(value)) : "—"}</span></div>`).join("")}</div>`)}
${report.siteOperations
        ? section(
          labels.operations,
          `<div class="finance-grid"><div class="finance-card"><b>${labels.progress}</b><strong class="ltr">${report.siteOperations.progress}%</strong></div><div class="finance-card"><b>${labels.phase}</b><strong>${e(enumLabel(report.siteOperations.currentPhase, locale))}</strong></div></div>${subheading(labels.updates)}${table(
            [labels.date, labels.title, labels.progress, labels.actor],
            report.siteOperations.updates.map((item) => [
              formatDate(item.createdAt, locale),
              `${enumLabel(item.type, locale)}${item.note ? ` — ${item.note}` : ""}`,
              item.progress == null ? "—" : `${item.progress}%`,
              item.author.displayName
            ]),
            labels.empty
          )}`
        )
        : ""
      }
${report.designs
        ? section(
          labels.design,
          table(
            [labels.title, labels.discipline, labels.status, labels.revision],
            report.designs.map((item) => [
              item.title,
              enumLabel(item.discipline, locale),
              enumLabel(item.status, locale),
              `REV ${String(item.currentRevisionNumber).padStart(2, "0")}`
            ]),
            labels.empty
          ),
          true
        )
        : ""
      }
${finance ? section(labels.finance, financeRows.length ? `<div class="finance-grid">${financeRows.map(([key, value]) => `<div class="finance-card"><b>${e(String(key))}</b><strong class="ltr">${value == null ? "—" : e(String(value))}</strong></div>`).join("")}</div>` : `<div class="empty">${labels.empty}</div>`) : ""}
${report.documents
        ? section(
          labels.documents,
          table(
            [labels.reference, labels.title, labels.category, labels.version, labels.visibility],
            report.documents.map((item) => [
              item.reference,
              item.title,
              enumLabel(item.category, locale),
              `V${String(item.currentVersionNumber).padStart(2, "0")}`,
              item.isClientVisible ? labels.shared : labels.internal
            ]),
            labels.empty
          ),
          true
        )
        : ""
      }
${report.communication ? section(labels.communication, `<div class="finance-grid"><div class="finance-card"><b>${labels.messages}</b><strong class="ltr">${report.communication.messageCount}</strong></div><div class="finance-card"><b>${labels.lastMessage}</b><strong class="ltr">${e(formatDate(report.communication.lastMessageAt, locale))}</strong></div></div>`) : ""}
${report.activity
        ? section(
          labels.activity,
          table(
            [labels.date, labels.title, labels.actor],
            report.activity.map((item) => [
              formatDate(item.createdAt, locale),
              enumLabel(item.action, locale),
              item.actorName ?? "—"
            ]),
            labels.empty
          ),
          true
        )
        : ""
      }
<footer>ELHABAK CONSTRUCTION — ${ar ? "الحباك للاستشارات الهندسية" : "Engineering Consultancy"}</footer></body></html>`;
  }
}

function section(title: string, content: string, allowBreak = false) {
  return `<section${allowBreak ? ' class="allow-break"' : ""}><h2>${e(title)}</h2>${content}</section>`;
}
function subheading(title: string) {
  return `<h3>${e(title)}</h3>`;
}
function table(headers: string[], rows: Array<Array<string | number | null>>, empty: string) {
  if (!rows.length) return `<div class="empty">${e(empty)}</div>`;
  return `<table><thead><tr>${headers.map((header) => `<th>${e(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell == null ? "—" : e(String(cell))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function enumLabel(value: string, locale: Locale) {
  const labels: Record<string, { ar: string; en: string }> = {
    DESIGN: { ar: "تصميم", en: "Design" },
    CONSTRUCTION: { ar: "إنشاء", en: "Construction" },
    FINISHING: { ar: "تشطيب", en: "Finishing" },
    GENERAL_CONTRACTING: { ar: "مقاولات عامة", en: "General Contracting" },
    FURNITURE: { ar: "أثاث", en: "Furniture" },
    MIXED: { ar: "مختلط", en: "Mixed" },
    SITE_INSPECTION: { ar: "المعاينة", en: "Site Inspection" },
    PRELIMINARY_ESTIMATION: { ar: "المقايسة التقريبية", en: "Preliminary Estimation" },
    EXECUTION: { ar: "التنفيذ", en: "Execution" },
    INITIAL_HANDOVER: { ar: "التسليم الابتدائي", en: "Initial Handover" },
    FINAL_HANDOVER: { ar: "التسليم النهائي", en: "Final Handover" },
    PLANNED: { ar: "مخطط", en: "Planned" },
    ACTIVE: { ar: "نشط", en: "Active" },
    ON_HOLD: { ar: "متوقف", en: "On Hold" },
    COMPLETED: { ar: "مكتمل", en: "Completed" },
    CANCELLED: { ar: "ملغي", en: "Cancelled" },
    PROGRESS: { ar: "تقدم أعمال", en: "Progress" },
    INSPECTION: { ar: "معاينة / فحص", en: "Inspection" },
    ISSUE: { ar: "ملاحظة / مشكلة", en: "Issue" },
    MATERIAL: { ar: "توريدات ومواد", en: "Materials" },
    GENERAL: { ar: "تحديث عام", en: "General" },
    ARCHITECTURAL: { ar: "معماري", en: "Architectural" },
    STRUCTURAL: { ar: "إنشائي", en: "Structural" },
    INTERIOR: { ar: "تصميم داخلي", en: "Interior" },
    ELECTRICAL: { ar: "كهرباء", en: "Electrical" },
    PLUMBING: { ar: "صحي", en: "Plumbing" },
    RENDERS: { ar: "مناظير", en: "Renders" },
    OTHER: { ar: "أخرى", en: "Other" },
    DRAFT: { ar: "مسودة", en: "Draft" },
    IN_REVIEW: { ar: "قيد المراجعة", en: "In Review" },
    APPROVED: { ar: "معتمد", en: "Approved" },
    REJECTED: { ar: "مرفوض", en: "Rejected" },
    CONTRACT: { ar: "عقد / اتفاقية", en: "Contract" },
    PERMIT: { ar: "تصريح", en: "Permit" },
    REPORT: { ar: "تقرير", en: "Report" },
    CORRESPONDENCE: { ar: "مراسلات", en: "Correspondence" },
    HANDOVER: { ar: "مستندات التسليم", en: "Handover" },
    ARCHIVED: { ar: "مؤرشف", en: "Archived" },
    "project.created": { ar: "تم إنشاء المشروع", en: "Project Created" },
    "project.phase_changed": { ar: "تم تحديث مرحلة المشروع", en: "Project Phase Updated" },
    "project.progress_changed": { ar: "تم تحديث نسبة الإنجاز", en: "Project Progress Updated" },
    "project.engineer_assigned": { ar: "تم تعيين المهندس", en: "Engineer Assigned" },
    "project.worker_assigned": { ar: "تم تعيين عامل / مقاول", en: "Worker Assigned" },
    "site_update.submitted": { ar: "تم تسجيل تحديث موقع", en: "Site Update Submitted" }
  };
  return labels[value]?.[locale] ?? humanize(value);
}
function financeLabel(key: string, locale: Locale) {
  const labels: Record<string, { ar: string; en: string }> = {
    contractValue: { ar: "قيمة المشروع", en: "Contract Value" },
    paidAmount: { ar: "المدفوع", en: "Paid Amount" },
    outstandingBalance: { ar: "المتبقي", en: "Outstanding Balance" },
    boqTotal: { ar: "إجمالي جدول الكميات", en: "BOQ Total" },
    estimateTotal: { ar: "إجمالي المقايسة", en: "Estimate Total" },
    expensesTotal: { ar: "المصروفات الداخلية", en: "Internal Expenses" },
    contractorPaymentsTotal: { ar: "دفعات المقاولين", en: "Contractor Payments" },
    committedCostTotal: { ar: "إجمالي التكلفة الملتزمة", en: "Committed Cost" }
  };
  return labels[key]?.[locale] ?? humanize(key);
}
function humanize(value: string) {
  return value
    .replaceAll(".", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}
function isMoneyKey(key: string) {
  return /(value|amount|balance|total)$/i.test(key);
}
function formatDate(value: string | null | undefined, locale: Locale) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
    dateStyle: "medium",
    timeZone: "UTC"
  }).format(new Date(value));
}
function e(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ??
      character
  );
}
function readBase64(path: string) {
  return readFileSync(path).toString("base64");
}
function findBrandAsset() {
  const candidates = [
    resolve(process.cwd(), "assets/brand/logo-primary-horizontal.png"),
    resolve(__dirname, "../../../../../assets/brand/logo-primary-horizontal.png")
  ];
  const found = candidates.find(existsSync);
  if (!found) throw new ServiceUnavailableException("Report branding asset is unavailable.");
  return found;
}
function findChromium() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    process.env.PROGRAMFILES
      ? resolve(process.env.PROGRAMFILES, "Microsoft/Edge/Application/msedge.exe")
      : undefined,
    process.env["PROGRAMFILES(X86)"]
      ? resolve(process.env["PROGRAMFILES(X86)"], "Microsoft/Edge/Application/msedge.exe")
      : undefined,
    process.env.LOCALAPPDATA
      ? resolve(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe")
      : undefined
  ].filter((value): value is string => Boolean(value));
  return candidates.find(existsSync);
}
