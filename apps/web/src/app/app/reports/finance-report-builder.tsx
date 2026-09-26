"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Badge, LoadingState, OperationsStagePath } from "@elhabak/ui";
import { Download, FileSpreadsheet, Play, Search } from "lucide-react";
import {
  apiRequest,
  expenseCategoryLabel,
  financeActionLabel,
  financeReportExportUrl,
  financeReportPdfUrl,
  financeReportUrl,
  financialStatusLabel,
  financialStatusTone,
  formatAppDate,
  formatMoney,
  statusLabel,
  statusTone,
  FINANCE_REPORT_SECTIONS,
  type FinancePortfolio,
  type FinanceReport,
  type FinanceReportSection
} from "../../../lib/api";

type ScopeMode = "all" | "selected" | "one";

const SECTION_META: Record<FinanceReportSection, { ar: string; en: string }> = {
  executive: { ar: "الملخص المالي التنفيذي", en: "Executive Financial Summary" },
  contract: { ar: "القيم التعاقدية", en: "Contract Values" },
  collections: { ar: "تحصيلات العملاء", en: "Collections / Client Payments" },
  outstanding: { ar: "الأرصدة المستحقة", en: "Outstanding Balances" },
  boq: { ar: "جدول الكميات", en: "BOQ" },
  estimates: { ar: "المقايسات التقريبية", en: "Preliminary Estimates" },
  expenses: { ar: "المصروفات الداخلية", en: "Expenses" },
  contractorPayments: { ar: "دفعات المقاولين", en: "Contractor Payments" },
  cost: { ar: "ملخص التكلفة", en: "Cost Summary" },
  activity: { ar: "سجل الحركة المالية", en: "Financial Activity / Audit" }
};

export function FinanceReportBuilder({ locale }: { locale: "ar" | "en" }) {
  const ar = locale === "ar";
  const [scopeMode, setScopeMode] = useState<ScopeMode>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pickerQuery, setPickerQuery] = useState("");
  const [projects, setProjects] = useState<Array<{ id: string; code: string | null; name: string; clientName: string | null }>>([]);
  const [sections, setSections] = useState<Set<FinanceReportSection>>(new Set(FINANCE_REPORT_SECTIONS));
  const [detail, setDetail] = useState<"detailed" | "summary">("detailed");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const labels = useMemo(
    () =>
      ar
        ? {
            title: "منشئ التقارير المالية",
            lead: "تقرير مخصص لمشروع واحد أو مجموعة محددة أو كل المشاريع — شاشة أو PDF أو تصدير.",
            scope: "نطاق المشاريع",
            all: "كل المشاريع",
            selected: "مشاريع محددة",
            one: "مشروع واحد",
            pick: "ابحث واختر المشاريع",
            sections: "أقسام التقرير",
            mode: "نمط التقرير",
            detailed: "تفصيلي",
            summary: "تلخيصي",
            period: "الفترة الزمنية",
            from: "من",
            to: "إلى",
            run: "إنشاء التقرير",
            running: "جاري الإنشاء...",
            pdfAr: "PDF عربي",
            pdfEn: "PDF English",
            xlsx: "ملخص Excel",
            csv: "سجل CSV",
            emptyScope: "اختر مشروعاً واحداً على الأقل لإنشاء التقرير.",
            resultTitle: "نتيجة التقرير",
            generated: "أُنشئ",
            projectsInReport: "مشروع",
            contract: "القيمة التعاقدية",
            collections: "التحصيلات",
            outstanding: "المستحق",
            committed: "التكلفة المسجلة",
            netCash: "صافي النقدية",
            collectionPct: "نسبة التحصيل",
            noRows: "لا توجد بيانات مسجلة لهذا القسم.",
            version: "الإصدار",
            current: "حالية",
            finalized: "مرحّلة",
            total: "الإجمالي",
            count: "العدد",
            section: "القسم",
            project: "المشروع",
            status: "الحالة",
            client: "العميل",
            date: "التاريخ",
            description: "البيان",
            party: "الجهة",
            amount: "المبلغ",
            method: "الطريقة",
            category: "الفئة",
            reference: "المرجع",
            actor: "بواسطة",
            type: "النوع",
            stepScope: "نطاق المشاريع",
            stepDates: "الفترة",
            stepSections: "الأقسام",
            stepDetail: "التفصيل",
            stepOutput: "اللغة / الإخراج",
            stepGenerate: "إنشاء"
          }
        : {
            title: "Financial Report Builder",
            lead: "A custom report for one project, a selected set, or the full portfolio — screen, PDF, or export.",
            scope: "Project scope",
            all: "All projects",
            selected: "Selected projects",
            one: "Single project",
            pick: "Search and select projects",
            sections: "Report sections",
            mode: "Report mode",
            detailed: "Detailed",
            summary: "Summary",
            period: "Date range",
            from: "From",
            to: "To",
            run: "Generate report",
            running: "Generating...",
            pdfAr: "PDF Arabic",
            pdfEn: "PDF English",
            xlsx: "Summary Excel",
            csv: "Ledger CSV",
            emptyScope: "Select at least one project to generate the report.",
            resultTitle: "Report result",
            generated: "Generated",
            projectsInReport: "projects",
            contract: "Contract Value",
            collections: "Collections",
            outstanding: "Outstanding",
            committed: "Committed Cost",
            netCash: "Net Cash Position",
            collectionPct: "Collection %",
            noRows: "No persisted data is available for this section.",
            version: "Version",
            current: "current",
            finalized: "final",
            total: "Total",
            count: "Count",
            section: "Section",
            project: "Project",
            status: "Status",
            client: "Client",
            date: "Date",
            description: "Description",
            party: "Party",
            amount: "Amount",
            method: "Method",
            category: "Category",
            reference: "Reference",
            actor: "By",
            type: "Type",
            stepScope: "Project scope",
            stepDates: "Date range",
            stepSections: "Sections",
            stepDetail: "Detail level",
            stepOutput: "Language / output",
            stepGenerate: "Generate"
          },
    [ar]
  );

  useEffect(() => {
    let alive = true;
    apiRequest<FinancePortfolio>("/finance/portfolio")
      .then((result) => {
        if (!alive) return;
        setProjects(
          result.projects.map((project) => ({
            id: project.id,
            code: project.code,
            name: project.name,
            clientName: project.clientName
          }))
        );
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const filteredPicker = useMemo(() => {
    const query = pickerQuery.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        (project.code ?? "").toLowerCase().includes(query) ||
        (project.clientName ?? "").toLowerCase().includes(query)
    );
  }, [projects, pickerQuery]);

  const scopeIds = scopeMode === "all" ? [] : selectedIds;

  function toggleProject(id: string) {
    setSelectedIds((current) =>
      scopeMode === "one" ? [id] : current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleSection(section: FinanceReportSection) {
    setSections((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  async function run() {
    if (scopeMode !== "all" && scopeIds.length === 0) {
      setError(labels.emptyScope);
      setReport(null);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<FinanceReport>(
        financeReportUrl(scopeIds, { from, to, sections: [...sections], detail })
      );
      setReport(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
      setReport(null);
    } finally {
      setBusy(false);
    }
  }

  const money = (value: string | null | undefined) =>
    value === null || value === undefined ? "—" : formatMoney(value, report?.currency ?? "EGP", locale);

  const selectedSections = [...sections];
  const queryOptions = { from, to, sections: selectedSections, detail };

  return (
    <section className="finance-builder" aria-labelledby="finance-builder-h">
      <header className="dataops-section__head">
        <div>
          <h2 id="finance-builder-h">{labels.title}</h2>
          <p>{labels.lead}</p>
        </div>
      </header>

      <div className="finance-builder__controls">
        <OperationsStagePath
          className="finance-builder__steps"
          stages={[
            labels.stepScope,
            labels.stepDates,
            labels.stepSections,
            labels.stepDetail,
            labels.stepOutput,
            labels.stepGenerate
          ].map((label, index) => ({
            code: String(index + 1).padStart(2, "0"),
            label,
            state: index === 0 ? "current" : "upcoming"
          }))}
        />

        <div className="finance-builder__group">
          <span className="finance-builder__label">{labels.scope}</span>
          <div className="finance-scope-bar finance-scope-bar--inline" role="group">
            {(
              [
                ["all", labels.all],
                ["selected", labels.selected],
                ["one", labels.one]
              ] as Array<[ScopeMode, string]>
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                className={`finance-scope-bar__option${scopeMode === mode ? " active" : ""}`}
                onClick={() => {
                  setScopeMode(mode);
                  if (mode === "one") setSelectedIds((current) => current.slice(0, 1));
                  if (mode === "all") setSelectedIds([]);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {scopeMode !== "all" && (
          <div className="finance-scope-picker finance-scope-picker--inline">
            <label className="global-search-field finance-scope-picker__search">
              <Search size={16} aria-hidden="true" />
              <input
                value={pickerQuery}
                onChange={(event) => setPickerQuery(event.target.value)}
                placeholder={labels.pick}
                aria-label={labels.pick}
              />
            </label>
            <div className="finance-scope-picker__list">
              {filteredPicker.map((project) => {
                const on = selectedIds.includes(project.id);
                return (
                  <label className={`finance-scope-pick${on ? " finance-scope-pick--on" : ""}`} key={project.id}>
                    <input
                      type={scopeMode === "one" ? "radio" : "checkbox"}
                      name="report-scope"
                      checked={on}
                      onChange={() => toggleProject(project.id)}
                    />
                    <span className="finance-scope-pick__body">
                      <strong>{project.name}</strong>
                      <span>
                        <bdi className="mono">{project.code ?? "—"}</bdi>
                        {project.clientName ? ` · ${project.clientName}` : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="finance-builder__group">
          <span className="finance-builder__label">{labels.sections}</span>
          <div className="finance-builder__sections">
            {FINANCE_REPORT_SECTIONS.map((section) => (
              <label key={section} className={`dataops-chip finance-builder__chip${sections.has(section) ? " finance-builder__chip--on" : ""}`}>
                <input type="checkbox" checked={sections.has(section)} onChange={() => toggleSection(section)} />
                {SECTION_META[section][locale]}
              </label>
            ))}
          </div>
        </div>

        <div className="finance-builder__row">
          <div className="finance-builder__group">
            <span className="finance-builder__label">{labels.mode}</span>
            <div className="finance-scope-bar finance-scope-bar--inline" role="group">
              {(
                [
                  ["detailed", labels.detailed],
                  ["summary", labels.summary]
                ] as Array<["detailed" | "summary", string]>
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={`finance-scope-bar__option${detail === mode ? " active" : ""}`}
                  onClick={() => setDetail(mode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="finance-builder__group">
            <span className="finance-builder__label">{labels.period}</span>
            <div className="finance-builder__dates">
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label={labels.from} />
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label={labels.to} />
            </div>
          </div>
        </div>

        <div className="finance-builder__actions">
          <button type="button" className="ui-button ui-button--primary" onClick={() => void run()} disabled={busy}>
            <Play size={15} /> {busy ? labels.running : labels.run}
          </button>
          <a
            className="ui-button ui-button--secondary ui-button--sm"
            href={financeReportPdfUrl(scopeIds, { ...queryOptions, lang: locale })}
            target="_blank"
            rel="noreferrer"
          >
            <Download size={14} /> {ar ? labels.pdfAr : labels.pdfEn}
          </a>
          <a
            className="ui-button ui-button--secondary ui-button--sm"
            href={financeReportPdfUrl(scopeIds, { ...queryOptions, lang: ar ? "en" : "ar" })}
            target="_blank"
            rel="noreferrer"
          >
            <Download size={14} /> {ar ? labels.pdfEn : labels.pdfAr}
          </a>
          <a className="ui-button ui-button--secondary ui-button--sm" href={financeReportExportUrl(scopeIds, { from, to, format: "xlsx", dataset: "summary" })}>
            <FileSpreadsheet size={14} /> {labels.xlsx}
          </a>
          <a className="ui-button ui-button--secondary ui-button--sm" href={financeReportExportUrl(scopeIds, { from, to, format: "csv", dataset: "ledger" })}>
            <FileSpreadsheet size={14} /> {labels.csv}
          </a>
        </div>
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {busy && <LoadingState label={labels.running} />}

      {report && !busy && (
        <div className="finance-report-result">
          <div className="admin-command-strip">
            <div>
              <span className="section-kicker">{labels.resultTitle}</span>
              <strong>{report.projectCount} {labels.projectsInReport}</strong>
              <span className="admin-command-strip__subtitle">
                {labels.generated}: <bdi>{formatAppDate(report.generatedAt, locale, true)}</bdi>
                {report.filters.from || report.filters.to ? ` · ${report.filters.from ?? "…"} ← ${report.filters.to ?? "…"}` : ""}
              </span>
            </div>
          </div>

          <div className="report-summary-grid finance-report-kpis">
            <SummaryCard label={labels.contract} value={money(report.totals.contractValue)} />
            <SummaryCard label={labels.collections} value={money(report.totals.clientPaymentsTotal)} />
            <SummaryCard label={labels.outstanding} value={money(report.totals.outstandingBalance)} />
            <SummaryCard label={labels.committed} value={money(report.totals.committedCostTotal)} />
            <SummaryCard label={labels.netCash} value={money(report.totals.netCashPosition)} />
            <SummaryCard
              label={labels.collectionPct}
              value={report.totals.collectionPercent === null ? "—" : `${report.totals.collectionPercent}%`}
            />
          </div>

          {report.projects.map((entry) => (
            <section className="finance-report-project" key={entry.project.id}>
              <header className="finance-report-project__head">
                <div>
                  <strong>{entry.project.name}</strong>
                  <bdi className="mono">{entry.project.code ?? "—"}</bdi>
                  {entry.project.clientName ? <span> · {entry.project.clientName}</span> : null}
                </div>
                <Badge tone={statusTone(entry.project.status)}>{statusLabel(entry.project.status, locale)}</Badge>
              </header>

              <div className="report-summary-grid">
                <SummaryCard label={labels.contract} value={money(entry.summary.contractValue)} />
                <SummaryCard label={labels.collections} value={money(entry.summary.clientPaymentsTotal)} />
                <SummaryCard label={labels.outstanding} value={money(entry.summary.outstandingBalance)} />
                <SummaryCard label={labels.netCash} value={money(entry.summary.netCashPosition)} />
              </div>

              {entry.sections.boq && (
                <ReportBlock title={SECTION_META.boq[locale]}>
                  <div className="report-table-wrap">
                    <table className="report-table">
                      <thead><tr><th>{labels.section}</th><th className="num">{labels.total}</th></tr></thead>
                      <tbody>
                        {entry.sections.boq.sectionTotals.map((row, index) => (
                          <tr key={index}><td>{row.section ?? "—"}</td><td className="num"><bdi className="mono">{money(row.total)}</bdi></td></tr>
                        ))}
                        {(entry.sections.boq.items ?? []).map((item) => (
                          <tr key={item.id}>
                            <td><bdi className="mono">{item.code}</bdi> — {item.description}</td>
                            <td className="num"><bdi className="mono">{money(item.lineTotal)}</bdi></td>
                          </tr>
                        ))}
                        {!entry.sections.boq.sectionTotals.length && !(entry.sections.boq.items ?? []).length && (
                          <tr><td colSpan={2}>{labels.noRows}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </ReportBlock>
              )}

              {entry.sections.estimates && (
                <ReportBlock title={SECTION_META.estimates[locale]}>
                  <div className="report-table-wrap">
                    <table className="report-table">
                      <thead><tr><th>{labels.description}</th><th>{labels.version}</th><th>{labels.status}</th><th className="num">{labels.total}</th></tr></thead>
                      <tbody>
                        {entry.sections.estimates.map((estimate) => (
                          <tr key={estimate.id}>
                            <td>{estimate.title}</td>
                            <td><bdi>V{estimate.version}</bdi></td>
                            <td>{estimate.isCurrent ? labels.current : labels.finalized}</td>
                            <td className="num"><bdi className="mono">{money(estimate.total)}</bdi></td>
                          </tr>
                        ))}
                        {entry.sections.estimates.length === 0 && <tr><td colSpan={4}>{labels.noRows}</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </ReportBlock>
              )}

              {entry.sections.expenses && (
                <ReportBlock title={SECTION_META.expenses[locale]}>
                  {entry.sections.expenses.byCategory.length > 0 && (
                    <div className="report-summary-grid">
                      {entry.sections.expenses.byCategory.map((row) => (
                        <SummaryCard key={row.category} label={expenseCategoryLabel(row.category, locale)} value={money(row.total)} />
                      ))}
                    </div>
                  )}
                  {entry.sections.expenses.rows && (
                    <div className="report-table-wrap">
                      <table className="report-table">
                        <thead><tr><th>{labels.date}</th><th>{labels.description}</th><th>{labels.party}</th><th className="num">{labels.amount}</th><th>{labels.status}</th></tr></thead>
                        <tbody>
                          {entry.sections.expenses.rows.map((row) => (
                            <tr key={row.id}>
                              <td><bdi>{formatAppDate(row.expenseDate, locale)}</bdi></td>
                              <td>{row.description}</td>
                              <td>{row.vendor ?? "—"}</td>
                              <td className="num"><bdi className="mono">{money(row.amount)}</bdi></td>
                              <td><Badge tone={financialStatusTone(row.status)}>{financialStatusLabel(row.status, locale)}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </ReportBlock>
              )}

              {entry.sections.collections && (
                <ReportBlock title={SECTION_META.collections[locale]}>
                  {entry.sections.collections.rows ? (
                    <div className="report-table-wrap">
                      <table className="report-table">
                        <thead><tr><th>{labels.date}</th><th>{labels.description}</th><th>{labels.method}</th><th className="num">{labels.amount}</th><th>{labels.status}</th></tr></thead>
                        <tbody>
                          {entry.sections.collections.rows.map((row) => (
                            <tr key={row.id}>
                              <td><bdi>{formatAppDate(row.paymentDate, locale)}</bdi></td>
                              <td>{row.description ?? "—"}</td>
                              <td>{row.method}</td>
                              <td className="num"><bdi className="mono">{money(row.amount)}</bdi></td>
                              <td><Badge tone={financialStatusTone(row.status)}>{financialStatusLabel(row.status, locale)}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="report-summary-grid">
                      <SummaryCard label={labels.count} value={String(entry.sections.collections.count ?? 0)} />
                      <SummaryCard label={labels.total} value={money(entry.sections.collections.total)} />
                    </div>
                  )}
                </ReportBlock>
              )}

              {entry.sections.contractorPayments && (
                <ReportBlock title={SECTION_META.contractorPayments[locale]}>
                  {entry.sections.contractorPayments.rows ? (
                    <div className="report-table-wrap">
                      <table className="report-table">
                        <thead><tr><th>{labels.date}</th><th>{labels.party}</th><th>{labels.method}</th><th className="num">{labels.amount}</th><th>{labels.status}</th></tr></thead>
                        <tbody>
                          {entry.sections.contractorPayments.rows.map((row) => (
                            <tr key={row.id}>
                              <td><bdi>{formatAppDate(row.paymentDate, locale)}</bdi></td>
                              <td>{row.payee}</td>
                              <td>{row.method}</td>
                              <td className="num"><bdi className="mono">{money(row.amount)}</bdi></td>
                              <td><Badge tone={financialStatusTone(row.status)}>{financialStatusLabel(row.status, locale)}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="report-summary-grid">
                      <SummaryCard label={labels.count} value={String(entry.sections.contractorPayments.count ?? 0)} />
                      <SummaryCard label={labels.total} value={money(entry.sections.contractorPayments.total)} />
                    </div>
                  )}
                </ReportBlock>
              )}

              {entry.sections.activity && (
                <ReportBlock title={SECTION_META.activity[locale]}>
                  {entry.sections.activity.length ? (
                    <div className="report-list">
                      {entry.sections.activity.map((log) => (
                        <article key={log.id}>
                          <strong>{financeActionLabel(log.action, locale)}</strong>
                          <span>{log.actorName ?? "—"} · <bdi>{formatAppDate(log.createdAt, locale, true)}</bdi></span>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="report-empty-note">{labels.noRows}</p>
                  )}
                </ReportBlock>
              )}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="report-summary-card">
      <span>{label}</span>
      <strong className="mono"><bdi>{value}</bdi></strong>
    </div>
  );
}

function ReportBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="finance-report-block">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
