import { Injectable, type OnApplicationShutdown, ServiceUnavailableException } from "@nestjs/common";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import puppeteer, { type Browser } from "puppeteer-core";
import type { ReportsService } from "./reports.service";
import type { FinancePortfolioService } from "../finance/finance-portfolio.service";

type ReportData = Awaited<ReturnType<ReportsService["getProjectReport"]>>;
type FinanceReportData = Awaited<ReturnType<FinancePortfolioService["buildReport"]>>;
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

  async renderFinanceReport(report: FinanceReportData, locale: Locale) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(this.financeHtml(report, locale), { waitUntil: "load" });
      await page.emulateMediaType("print");
      const bytes = await page.pdf({
        format: "A4",
        landscape: true,
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        headerTemplate: "<span></span>",
        footerTemplate: `<div style="width:100%;font:9px Arial;color:#667085;padding:0 14mm;display:flex;justify-content:space-between;direction:${locale === "ar" ? "rtl" : "ltr"}"><span>ELHABAK CONSTRUCTION</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
        margin: { top: "12mm", right: "10mm", bottom: "16mm", left: "10mm" }
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

  private financeHtml(report: FinanceReportData, locale: Locale) {
    const ar = locale === "ar";
    const L = ar
      ? {
          report: "التقرير المالي",
          generated: "تاريخ الإصدار",
          scope: "النطاق",
          allScope: "جميع المشاريع",
          oneScope: "مشروع واحد",
          selectedScope: "مشاريع محددة",
          period: "الفترة",
          allTime: "كل الفترات",
          detail: "نمط التقرير",
          detailed: "تفصيلي",
          summarized: "تلخيصي",
          projects: "المشاريع",
          executive: "الملخص المالي التنفيذي",
          contractValue: "القيمة التعاقدية",
          collections: "تحصيلات العملاء",
          outstanding: "الأرصدة المستحقة",
          boq: "جدول الكميات",
          estimates: "المقايسات التقريبية",
          expenses: "المصروفات الداخلية",
          contractorPayments: "دفعات المقاولين",
          cost: "ملخص التكلفة",
          activity: "سجل الحركة المالية",
          committed: "التكلفة المسجلة",
          cashIn: "النقد الوارد",
          cashOut: "النقد الصادر",
          netCash: "صافي النقدية",
          collectionPct: "نسبة التحصيل",
          costPct: "التكلفة/العقد",
          code: "الكود",
          name: "المشروع",
          client: "العميل",
          status: "الحالة",
          date: "التاريخ",
          party: "الجهة",
          description: "البيان",
          category: "الفئة",
          method: "الطريقة",
          amount: "المبلغ",
          reference: "المرجع",
          section: "القسم",
          total: "الإجمالي",
          version: "الإصدار",
          current: "حالية",
          finalized: "مرحّلة",
          title: "العنوان",
          count: "العدد",
          noData: "لا توجد بيانات مسجلة لهذا القسم.",
          portfolioBreakdown: "التوزيع حسب المشروع"
        }
      : {
          report: "Financial Report",
          generated: "Generated",
          scope: "Scope",
          allScope: "All projects",
          oneScope: "Single project",
          selectedScope: "Selected projects",
          period: "Period",
          allTime: "All time",
          detail: "Report mode",
          detailed: "Detailed",
          summarized: "Summary",
          projects: "Projects",
          executive: "Executive Financial Summary",
          contractValue: "Contract Value",
          collections: "Client Collections",
          outstanding: "Outstanding Balances",
          boq: "Bill of Quantities",
          estimates: "Preliminary Estimates",
          expenses: "Internal Expenses",
          contractorPayments: "Contractor Payments",
          cost: "Cost Summary",
          activity: "Financial Activity",
          committed: "Committed Cost",
          cashIn: "Cash In",
          cashOut: "Cash Out",
          netCash: "Net Cash Position",
          collectionPct: "Collection %",
          costPct: "Cost/Contract %",
          code: "Code",
          name: "Project",
          client: "Client",
          status: "Status",
          date: "Date",
          party: "Party",
          description: "Description",
          category: "Category",
          method: "Method",
          amount: "Amount",
          reference: "Reference",
          section: "Section",
          total: "Total",
          version: "Version",
          current: "current",
          finalized: "final",
          title: "Title",
          count: "Count",
          noData: "No persisted data is available for this section.",
          portfolioBreakdown: "Per-Project Breakdown"
        };

    const fontRegular = readBase64(require.resolve("@fontsource/almarai/files/almarai-arabic-400-normal.woff2"));
    const fontBold = readBase64(require.resolve("@fontsource/almarai/files/almarai-arabic-700-normal.woff2"));
    const logo = readBase64(findBrandAsset());
    const currency = report.currency;
    const money = (value: string | null | undefined) => (value === null || value === undefined ? "—" : `${e(value)} ${e(currency)}`);
    const pct = (value: number | null | undefined) => (value === null || value === undefined ? "—" : `${value}%`);
    const scopeLabel = report.scope === "ALL" ? L.allScope : report.scope === "ONE" ? L.oneScope : L.selectedScope;
    const period = report.filters.from || report.filters.to
      ? `${report.filters.from ?? "…"} ← ${report.filters.to ?? "…"}`
      : L.allTime;
    const kpi = (label: string, value: string) =>
      `<div class="finance-card"><b>${e(label)}</b><strong class="ltr">${e(value)}</strong></div>`;

    const sectionSet = new Set(report.sections);
    const wants = (key: string) => sectionSet.has(key as never);

    const executiveCards = [
      kpi(L.contractValue, money(report.totals.contractValue)),
      kpi(L.collections, money(report.totals.clientPaymentsTotal)),
      kpi(L.outstanding, money(report.totals.outstandingBalance)),
      kpi(L.boq, money(report.totals.boqTotal)),
      kpi(L.estimates, money(report.totals.estimateTotal)),
      kpi(L.expenses, money(report.totals.expensesTotal)),
      kpi(L.contractorPayments, money(report.totals.contractorPaymentsTotal)),
      kpi(L.committed, money(report.totals.committedCostTotal)),
      kpi(L.cashIn, money(report.totals.cashInTotal)),
      kpi(L.cashOut, money(report.totals.cashOutTotal)),
      kpi(L.netCash, money(report.totals.netCashPosition)),
      kpi(L.collectionPct, pct(report.totals.collectionPercent)),
      kpi(L.costPct, pct(report.totals.costVsContractPercent))
    ].join("");

    const breakdownTable = report.projects.length
      ? table(
          [L.name, L.code, L.status, L.contractValue, L.collections, L.outstanding, L.committed, L.netCash],
          report.projects.map((entry) => [
            entry.project.name,
            entry.project.code ?? "—",
            entry.project.status,
            money(entry.summary.contractValue),
            money(entry.summary.clientPaymentsTotal),
            money(entry.summary.outstandingBalance),
            money(entry.summary.committedCostTotal),
            money(entry.summary.netCashPosition)
          ]),
          L.noData
        )
      : "";

    const projectBlocks = report.projects
      .map((entry) => {
        const sections = entry.sections as Record<string, unknown>;
        const parts: string[] = [];
        parts.push(
          `<section class="allow-break project-band"><h2>${e(entry.project.name)} <span class="ltr" style="font-weight:400">${e(entry.project.code ?? "")}</span></h2>
<div class="identity"><div><b>${e(L.client)}</b><span>${e(entry.project.clientName ?? "—")}</span></div><div><b>${e(L.status)}</b><span>${e(enumLabel(entry.project.status, locale))}</span></div><div><b>${e(L.contractValue)}</b><span class="ltr">${money(entry.summary.contractValue)}</span></div><div><b>${e(L.netCash)}</b><span class="ltr">${money(entry.summary.netCashPosition)}</span></div></div>`
        );
        if (wants("contract") || wants("outstanding")) {
          parts.push(
            `<div class="finance-grid">${kpi(L.contractValue, money(entry.summary.contractValue))}${kpi(L.collections, money(entry.summary.clientPaymentsTotal))}${kpi(L.outstanding, money(entry.summary.outstandingBalance))}${kpi(L.collectionPct, pct(entry.summary.collectionPercent))}</div>`
          );
        }
        const boq = sections.boq as { sectionTotals: Array<{ section: string | null; total: string }>; items?: Array<Record<string, string | null>> } | undefined;
        if (boq) {
          const rows: Array<Array<string | number | null>> = boq.sectionTotals.map((row) => [row.section ?? "—", money(row.total)]);
          if (boq.items) {
            for (const item of boq.items) {
              rows.push([`${item.code} — ${item.description}`, `${money(item.lineTotal)}`]);
            }
          }
          parts.push(subheading(L.boq) + table([L.section, L.total], rows, L.noData));
        }
        const estimates = sections.estimates as Array<{ title: string; version: number; isCurrent: boolean; total: string; items?: Array<Record<string, string | null>> }> | undefined;
        if (estimates) {
          const rows = estimates.map((estimate) => [
            estimate.title,
            `V${estimate.version}`,
            estimate.isCurrent ? L.current : L.finalized,
            money(estimate.total)
          ] as Array<string | number | null>);
          let extra = "";
          for (const estimate of estimates) {
            if (estimate.items?.length) {
              extra += table(
                [L.description, L.amount],
                estimate.items.map((item) => [item.description ?? "—", money(item.lineTotal)]),
                L.noData
              );
            }
          }
          parts.push(subheading(L.estimates) + table([L.title, L.version, L.status, L.total], rows, L.noData) + extra);
        }
        const exp = sections.expenses as { byCategory: Array<{ category: string; total: string }>; rows?: Array<Record<string, string | null>> } | undefined;
        if (exp) {
          const catRows = exp.byCategory.map((row) => [enumLabel(row.category, locale), money(row.total)]);
          let html = exp.byCategory.length ? table([L.category, L.total], catRows, L.noData) : "";
          if (exp.rows?.length) {
            html += table(
              [L.date, L.description, L.party, L.category, L.amount, L.status],
              exp.rows.map((row) => [
                String(row.expenseDate ?? "").slice(0, 10),
                row.description,
                row.vendor,
                row.category ? enumLabel(row.category, locale) : "—",
                money(row.amount),
                row.status === "VOID" ? enumLabel("VOID", locale) : enumLabel("ACTIVE", locale)
              ]),
              L.noData
            );
          }
          parts.push(subheading(L.expenses) + (html || `<div class="empty">${e(L.noData)}</div>`));
        }
        const collections = sections.collections as { rows?: Array<Record<string, string | null>>; count?: number; total?: string } | undefined;
        if (collections) {
          if (collections.rows) {
            parts.push(
              subheading(L.collections) +
                table(
                  [L.date, L.party, L.method, L.amount, L.reference, L.status],
                  collections.rows.map((row) => [
                    String(row.paymentDate ?? "").slice(0, 10),
                    row.description,
                    row.method ? enumLabel(row.method, locale) : "—",
                    money(row.amount),
                    row.reference,
                    row.status === "VOID" ? enumLabel("VOID", locale) : enumLabel("ACTIVE", locale)
                  ]),
                  L.noData
                )
            );
          } else {
            parts.push(`<div class="finance-grid">${kpi(L.count, String(collections.count ?? 0))}${kpi(L.total, money(collections.total))}</div>`);
          }
        }
        const contractors = sections.contractorPayments as { rows?: Array<Record<string, string | null>>; count?: number; total?: string } | undefined;
        if (contractors) {
          if (contractors.rows) {
            parts.push(
              subheading(L.contractorPayments) +
                table(
                  [L.date, L.party, L.method, L.amount, L.reference, L.status],
                  contractors.rows.map((row) => [
                    String(row.paymentDate ?? "").slice(0, 10),
                    row.payee,
                    row.method ? enumLabel(row.method, locale) : "—",
                    money(row.amount),
                    row.reference,
                    row.status === "VOID" ? enumLabel("VOID", locale) : enumLabel("ACTIVE", locale)
                  ]),
                  L.noData
                )
            );
          } else {
            parts.push(`<div class="finance-grid">${kpi(L.count, String(contractors.count ?? 0))}${kpi(L.total, money(contractors.total))}</div>`);
          }
        }
        const acts = sections.activity as Array<{ id: string; action: string; actorName: string | null; createdAt: string }> | undefined;
        if (acts) {
          parts.push(
            subheading(L.activity) +
              table(
                [L.date, L.description, "Actor"],
                acts.map((log) => [formatDate(log.createdAt, locale), enumLabel(log.action, locale), log.actorName ?? "—"]),
                L.noData
              )
          );
        }
        parts.push("</section>");
        return parts.join("");
      })
      .join("");

    return `<!doctype html><html lang="${locale}" dir="${ar ? "rtl" : "ltr"}"><head><meta charset="utf-8"><style>
@font-face{font-family:Almarai;src:url(data:font/woff2;base64,${fontRegular}) format('woff2');font-weight:400}@font-face{font-family:Almarai;src:url(data:font/woff2;base64,${fontBold}) format('woff2');font-weight:700}
@page{size:A4 landscape;margin:12mm 10mm 16mm}*{box-sizing:border-box}body{margin:0;color:#17234b;font-family:Almarai,Arial,sans-serif;font-size:9.5px;line-height:1.6}header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #e87625;padding-bottom:9px;margin-bottom:14px}header img{width:145px;height:auto}h1{font-size:20px;margin:0;color:#17234b}h2{font-size:13px;margin:0 0 8px;padding:6px 9px;border-${ar ? "right" : "left"}:4px solid #e87625;background:#f3f5f9}h3{font-size:11px;margin:10px 0 6px;color:#17234b}section{margin:0 0 13px;break-inside:avoid}section.allow-break{break-inside:auto}.meta{color:#667085;margin-top:3px}.identity{display:grid;grid-template-columns:repeat(2,1fr);border:1px solid #d8dde8;margin-bottom:8px}.identity div{display:grid;grid-template-columns:42% 1fr;padding:5px 8px;border-bottom:1px solid #e7eaf0}.identity div:nth-child(odd){border-${ar ? "left" : "right"}:1px solid #e7eaf0}.identity div:nth-last-child(-n+2){border-bottom:0}.identity b{color:#667085}table{width:100%;border-collapse:collapse}th,td{border:1px solid #d8dde8;padding:4px 6px;text-align:${ar ? "right" : "left"};vertical-align:top;overflow-wrap:anywhere}th{background:#17234b;color:#fff;font-weight:700}tr{break-inside:avoid}.empty{padding:12px;border:1px dashed #bdc5d5;color:#667085;text-align:center}.ltr{direction:ltr;unicode-bidi:isolate;display:inline-block}.cover-code{font:700 11px monospace;color:#e87625}.finance-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:8px}.finance-card{border:1px solid #d8dde8;padding:7px}.finance-card b{display:block;color:#667085;font-size:8px}.finance-card strong{font-size:11px}.project-band{border-top:2px solid #17234b;padding-top:8px;margin-top:16px}footer{margin-top:12px;border-top:1px solid #d8dde8;padding-top:6px;color:#667085;font-size:8px}</style></head><body>
<header><div><h1>${e(L.report)}</h1><div class="cover-code ltr">ELHABAK-FINANCE</div><div class="meta">${L.generated}: <span class="ltr">${e(formatDate(report.generatedAt, locale))}</span> · ${L.scope}: ${e(scopeLabel)} (${report.projectCount}) · ${L.period}: <span class="ltr">${e(period)}</span> · ${L.detail}: ${e(report.detail === "DETAILED" ? L.detailed : L.summarized)}</div></div><img src="data:image/png;base64,${logo}" alt="ELHABAK"></header>
${wants("executive") || wants("contract") || wants("outstanding") || wants("cost") ? section(L.executive, `<div class="finance-grid">${executiveCards}</div>`) : ""}
${report.projects.length > 1 ? section(L.portfolioBreakdown, breakdownTable, true) : ""}
${projectBlocks}
<footer>ELHABAK CONSTRUCTION — ${ar ? "الحباك للاستشارات الهندسية" : "Engineering Consultancy"}</footer></body></html>`;
  }
}

function section(title: string, content: string, allowBreak = false) {
  return `<section${allowBreak ? ' class="allow-break"' : ""}><h2>${e(title)}</h2>${content}</section>`;
}
function subheading(title: string) {
  return `<h3>${e(title)}</h3>`;
}
function table(headers: string[], rows: Array<Array<string | number | null | undefined>>, empty: string) {
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
    CASH: { ar: "نقدي", en: "Cash" },
    BANK_TRANSFER: { ar: "تحويل بنكي", en: "Bank transfer" },
    CHECK: { ar: "شيك", en: "Check" },
    LABOR: { ar: "عمالة", en: "Labor" },
    TRANSPORT: { ar: "نقل", en: "Transport" },
    EQUIPMENT: { ar: "معدات", en: "Equipment" },
    SUBCONTRACTOR: { ar: "مقاول فرعي", en: "Subcontractor" },
    VOID: { ar: "ملغي", en: "Void" },
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
