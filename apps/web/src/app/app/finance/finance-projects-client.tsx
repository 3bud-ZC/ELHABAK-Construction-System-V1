"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, MetricCard, PageHeader } from "@elhabak/ui";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  FileSpreadsheet,
  FileText,
  Landmark,
  RefreshCw,
  Search,
  Wallet
} from "lucide-react";
import {
  ApiError,
  apiRequest,
  expenseCategoryLabel,
  EXPENSE_CATEGORIES,
  financeActivityKindLabel,
  financeActivityKindTone,
  financeActivityUrl,
  financePortfolioUrl,
  financeReportExportUrl,
  financeReportPdfUrl,
  financialStatusLabel,
  financialStatusTone,
  formatAppDate,
  formatMoney,
  PAYMENT_METHODS,
  paymentMethodLabel,
  statusLabel,
  statusTone,
  type FinanceActivityResponse,
  type FinancePortfolio
} from "../../../lib/api";

type ScopeMode = "all" | "selected" | "one";
type Panel = "projects" | "ledger";

export function FinanceProjectsClient() {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const arrow = ar ? <ArrowLeft size={14} /> : <ArrowRight size={14} />;

  const labels = useMemo(
    () =>
      ar
        ? {
            title: "مركز التحكم المالي",
            lead: "إدارة مالية الشركة عبر مشروع واحد أو مجموعة محددة أو كل المشاريع — من نفس مساحة العمل.",
            scopeAll: "كل المشاريع",
            scopeSelected: "مشاريع محددة",
            scopeOne: "مشروع واحد",
            pickProjects: "اختر المشاريع",
            pickOne: "اختر المشروع",
            selected: "محدد",
            loading: "جاري تحميل المركز المالي...",
            failed: "تعذر تحميل البيانات المالية. حاول مرة أخرى.",
            denied: "المركز المالي متاح لحسابات الإدارة والمحاسبة فقط.",
            empty: "لا توجد مشاريع في النطاق المحدد",
            emptyHint: "عدّل نطاق المشاريع أو أنشئ مشروعاً جديداً من إدارة المشاريع.",
            contract: "القيمة التعاقدية",
            collections: "تحصيلات العملاء",
            outstanding: "الأرصدة المستحقة",
            boq: "جدول الكميات",
            estimate: "المقايسة الحالية",
            expenses: "المصروفات الداخلية",
            contractor: "دفعات المقاولين",
            committed: "التكلفة المسجلة",
            cashIn: "النقد الوارد",
            cashOut: "النقد الصادر",
            netCash: "صافي النقدية",
            collectionPct: "نسبة التحصيل",
            costPct: "التكلفة / العقد",
            notSet: "غير محدد",
            projectsTab: "توزيع المشاريع",
            ledgerTab: "سجل الحركات المالية",
            open: "فتح التحكم المالي",
            client: "العميل",
            project: "المشروع",
            type: "النوع",
            date: "التاريخ",
            party: "الجهة",
            category: "الفئة",
            method: "الطريقة",
            amount: "المبلغ",
            status: "الحالة",
            reference: "المرجع",
            allKinds: "كل الأنواع",
            allStatuses: "كل الحالات",
            allCategories: "كل الفئات",
            allMethods: "كل الطرق",
            vendorPlaceholder: "مورّد / مقاول...",
            from: "من",
            to: "إلى",
            apply: "تطبيق",
            reset: "إعادة ضبط",
            refresh: "تحديث",
            reportBuilder: "منشئ التقارير المالية",
            pdfAr: "PDF عربي",
            pdfEn: "PDF English",
            exportSummary: "ملخص Excel",
            exportLedger: "سجل CSV",
            rows: "حركة",
            filteredTotals: "إجماليات النطاق المحدد",
            periodAll: "كل الفترات",
            truncated: "تم اقتطاع النتائج — استخدم المرشحات لتضييق النطاق."
          }
        : {
            title: "Finance Control Center",
            lead: "Company finance management across one project, a selected set, or the full portfolio — from a single workspace.",
            scopeAll: "All projects",
            scopeSelected: "Selected projects",
            scopeOne: "Single project",
            pickProjects: "Select projects",
            pickOne: "Select project",
            selected: "selected",
            loading: "Loading finance center...",
            failed: "Financial data could not be loaded. Try again.",
            denied: "The finance control center is restricted to Admin and Accountant accounts.",
            empty: "No projects in the selected scope",
            emptyHint: "Adjust the project scope or create a project from project management.",
            contract: "Contract Value",
            collections: "Client Collections",
            outstanding: "Outstanding",
            boq: "BOQ Value",
            estimate: "Current Estimate",
            expenses: "Internal Expenses",
            contractor: "Contractor Payments",
            committed: "Committed Cost",
            cashIn: "Cash In",
            cashOut: "Cash Out",
            netCash: "Net Cash Position",
            collectionPct: "Collection %",
            costPct: "Cost / Contract",
            notSet: "Not set",
            projectsTab: "Project Breakdown",
            ledgerTab: "Financial Ledger",
            open: "Open cost control",
            client: "Client",
            project: "Project",
            type: "Type",
            date: "Date",
            party: "Party",
            category: "Category",
            method: "Method",
            amount: "Amount",
            status: "Status",
            reference: "Reference",
            allKinds: "All types",
            allStatuses: "All statuses",
            allCategories: "All categories",
            allMethods: "All methods",
            vendorPlaceholder: "Vendor / contractor...",
            from: "From",
            to: "To",
            apply: "Apply",
            reset: "Reset",
            refresh: "Refresh",
            reportBuilder: "Financial report builder",
            pdfAr: "PDF Arabic",
            pdfEn: "PDF English",
            exportSummary: "Summary Excel",
            exportLedger: "Ledger CSV",
            rows: "records",
            filteredTotals: "Scoped totals",
            periodAll: "All time",
            truncated: "Results were truncated — narrow the scope with filters."
          },
    [ar]
  );

  const [scopeMode, setScopeMode] = useState<ScopeMode>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pickerQuery, setPickerQuery] = useState("");
  const [portfolio, setPortfolio] = useState<FinancePortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<Panel>("projects");

  const [ledger, setLedger] = useState<FinanceActivityResponse | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [filters, setFilters] = useState({ kind: "", status: "", category: "", method: "", vendor: "", from: "", to: "" });
  const [allProjects, setAllProjects] = useState<Array<{ id: string; code: string | null; name: string; clientName: string | null }>>([]);

  const effectiveIds = useMemo(() => {
    if (scopeMode === "all") return [] as string[];
    return selectedIds;
  }, [scopeMode, selectedIds]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [result, picker] = await Promise.all([
        apiRequest<FinancePortfolio>(financePortfolioUrl(effectiveIds)),
        allProjects.length
          ? Promise.resolve(null)
          : apiRequest<FinancePortfolio>(financePortfolioUrl([]))
      ]);
      setPortfolio(result);
      if (picker) {
        setAllProjects(
          picker.projects.map((project) => ({
            id: project.id,
            code: project.code,
            name: project.name,
            clientName: project.clientName
          }))
        );
      }
      setError("");
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? labels.denied : labels.failed);
    } finally {
      setLoading(false);
    }
  }, [effectiveIds, labels.failed, allProjects.length]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadLedger = useCallback(async () => {
    setLedgerLoading(true);
    try {
      const result = await apiRequest<FinanceActivityResponse>(
        financeActivityUrl(effectiveIds, {
          kind: filters.kind,
          status: filters.status,
          category: filters.category,
          method: filters.method,
          vendor: filters.vendor,
          from: filters.from,
          to: filters.to
        })
      );
      setLedger(result);
    } catch {
      setLedger(null);
    } finally {
      setLedgerLoading(false);
    }
  }, [effectiveIds, filters]);

  useEffect(() => {
    if (panel === "ledger") void loadLedger();
  }, [panel, loadLedger]);

  const filteredPicker = useMemo(() => {
    const query = pickerQuery.trim().toLowerCase();
    if (!query) return allProjects;
    return allProjects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        (project.code ?? "").toLowerCase().includes(query) ||
        (project.clientName ?? "").toLowerCase().includes(query)
    );
  }, [allProjects, pickerQuery]);

  function toggleProject(id: string) {
    setSelectedIds((current) =>
      scopeMode === "one" ? [id] : current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function switchScope(mode: ScopeMode) {
    setScopeMode(mode);
    if (mode === "one") setSelectedIds((current) => current.slice(0, 1));
    if (mode === "all") setSelectedIds([]);
  }

  const href = (path: string) => (ar ? path : `${path}?lang=en`);
  const money = (value: string | null | undefined) =>
    value === null || value === undefined ? labels.notSet : formatMoney(value, portfolio?.currency ?? "EGP", locale);
  const pct = (value: number | null | undefined) => (value === null || value === undefined ? "—" : `${value}%`);

  const scopeProjectIds = effectiveIds;

  return (
    <section className="app-page finance-portfolio-page">
      <PageHeader
        eyebrow={<span className="page-header__eyebrow-code">{ar ? "التحكم المالي للشركة" : "Company Cost Control"}</span>}
        title={labels.title}
        description={labels.lead}
        actions={
          <Link className="ui-button ui-button--secondary" href={href("/app/reports?builder=finance")}>
            <FileText size={15} /> {labels.reportBuilder}
          </Link>
        }
      />

      <div className="finance-scope-bar" role="group" aria-label={ar ? "نطاق المشاريع" : "Project scope"}>
        {(
          [
            ["all", labels.scopeAll],
            ["selected", labels.scopeSelected],
            ["one", labels.scopeOne]
          ] as Array<[ScopeMode, string]>
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            className={`finance-scope-bar__option${scopeMode === mode ? " active" : ""}`}
            onClick={() => switchScope(mode)}
          >
            {label}
          </button>
        ))}
        {scopeMode !== "all" && portfolio && (
          <span className="finance-scope-bar__count">
            <bdi>{selectedIds.length}</bdi> {labels.selected}
          </span>
        )}
        <button type="button" className="ui-button ui-button--secondary ui-button--sm finance-scope-bar__refresh" onClick={() => void load()}>
          <RefreshCw size={14} /> {labels.refresh}
        </button>
      </div>

      {scopeMode !== "all" && (
        <div className="finance-scope-picker">
          <label className="global-search-field finance-scope-picker__search">
            <Search size={16} aria-hidden="true" />
            <input
              value={pickerQuery}
              onChange={(event) => setPickerQuery(event.target.value)}
              placeholder={scopeMode === "one" ? labels.pickOne : labels.pickProjects}
              aria-label={scopeMode === "one" ? labels.pickOne : labels.pickProjects}
            />
          </label>
          <div className="finance-scope-picker__list" role={scopeMode === "one" ? "radiogroup" : "group"}>
            {filteredPicker.map((project) => {
              const on = selectedIds.includes(project.id);
              return (
                <label className={`finance-scope-pick${on ? " finance-scope-pick--on" : ""}`} key={project.id}>
                  <input
                    type={scopeMode === "one" ? "radio" : "checkbox"}
                    name="finance-scope"
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
            {filteredPicker.length === 0 && (
              <p className="finance-scope-picker__empty">{labels.empty}</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {loading && <LoadingState label={labels.loading} />}

      {!loading && portfolio && portfolio.projectCount === 0 && (
        <EmptyState icon={<Wallet size={20} />} title={labels.empty} description={labels.emptyHint} />
      )}

      {!loading && portfolio && portfolio.projectCount > 0 && (
        <>
          <div className="finance-portfolio-kpis">
            <MetricCard icon={<Landmark size={18} />} tone="navy" label={labels.contract} value={<bdi className="mono">{money(portfolio.totals.contractValue)}</bdi>} />
            <MetricCard icon={<Wallet size={18} />} tone="success" label={labels.collections} value={<bdi className="mono">{money(portfolio.totals.clientPaymentsTotal)}</bdi>} />
            <MetricCard icon={<FileText size={18} />} tone="info" label={labels.outstanding} value={<bdi className="mono">{money(portfolio.totals.outstandingBalance)}</bdi>} />
            <MetricCard icon={<FileSpreadsheet size={18} />} tone="orange" label={labels.committed} value={<bdi className="mono">{money(portfolio.totals.committedCostTotal)}</bdi>} />
            <MetricCard icon={<Landmark size={18} />} tone="navy" label={labels.netCash} value={<bdi className="mono">{money(portfolio.totals.netCashPosition)}</bdi>} />
            <MetricCard icon={<FileText size={18} />} tone="info" label={labels.collectionPct} value={pct(portfolio.totals.collectionPercent)} />
          </div>

          <div className="finance-portfolio-actions">
            <a className="ui-button ui-button--secondary ui-button--sm" href={financeReportPdfUrl(scopeProjectIds, { lang: locale })} target="_blank" rel="noreferrer">
              <Download size={14} /> {ar ? "PDF عربي" : "PDF"}
            </a>
            <a className="ui-button ui-button--secondary ui-button--sm" href={financeReportPdfUrl(scopeProjectIds, { lang: ar ? "en" : "ar" })} target="_blank" rel="noreferrer">
              <Download size={14} /> {labels.pdfEn}
            </a>
            <a className="ui-button ui-button--secondary ui-button--sm" href={financeReportExportUrl(scopeProjectIds, { format: "xlsx", dataset: "summary" })}>
              <FileSpreadsheet size={14} /> {labels.exportSummary}
            </a>
            <a className="ui-button ui-button--secondary ui-button--sm" href={financeReportExportUrl(scopeProjectIds, { format: "csv", dataset: "ledger" })}>
              <FileSpreadsheet size={14} /> {labels.exportLedger}
            </a>
          </div>

          <nav className="finance-subtabs finance-module-tabs" aria-label={ar ? "أقسام المركز المالي" : "Finance center sections"}>
            <button type="button" className={panel === "projects" ? "active" : ""} onClick={() => setPanel("projects")}>
              {labels.projectsTab}
            </button>
            <button type="button" className={panel === "ledger" ? "active" : ""} onClick={() => setPanel("ledger")}>
              {labels.ledgerTab}
            </button>
          </nav>

          {panel === "projects" && (
            <div className="report-table-wrap finance-portfolio-table">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{labels.project}</th>
                    <th>{labels.client}</th>
                    <th>{labels.status}</th>
                    <th className="num">{labels.contract}</th>
                    <th className="num">{labels.collections}</th>
                    <th className="num">{labels.outstanding}</th>
                    <th className="num">{labels.committed}</th>
                    <th className="num">{labels.netCash}</th>
                    <th className="num">{labels.collectionPct}</th>
                    <th aria-label={labels.open} />
                  </tr>
                </thead>
                <tbody>
                  {portfolio.projects.map((project) => (
                    <tr key={project.id}>
                      <td>
                        <div className="finance-table-project">
                          <strong>{project.name}</strong>
                          <bdi className="mono">{project.code ?? "—"}</bdi>
                        </div>
                      </td>
                      <td>{project.clientName ?? "—"}</td>
                      <td>
                        <Badge tone={statusTone(project.status)}>{statusLabel(project.status, locale)}</Badge>
                      </td>
                      <td className="num"><bdi className="mono">{money(project.summary.contractValue)}</bdi></td>
                      <td className="num"><bdi className="mono">{money(project.summary.clientPaymentsTotal)}</bdi></td>
                      <td className="num"><bdi className="mono">{money(project.summary.outstandingBalance)}</bdi></td>
                      <td className="num"><bdi className="mono">{money(project.summary.committedCostTotal)}</bdi></td>
                      <td className="num"><bdi className="mono">{money(project.summary.netCashPosition)}</bdi></td>
                      <td className="num"><bdi>{pct(project.summary.collectionPercent)}</bdi></td>
                      <td>
                        <Link className="ui-button ui-button--secondary ui-button--sm" href={href(`/app/projects/${project.id}/finance`)}>
                          {arrow}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {panel === "ledger" && (
            <div className="finance-ledger">
              <div className="finance-ledger-filters">
                <select value={filters.kind} onChange={(event) => setFilters({ ...filters, kind: event.target.value })} aria-label={labels.type}>
                  <option value="">{labels.allKinds}</option>
                  <option value="CLIENT_PAYMENT">{ar ? "تحصيلات العملاء" : "Client payments"}</option>
                  <option value="EXPENSE">{ar ? "المصروفات" : "Expenses"}</option>
                  <option value="CONTRACTOR_PAYMENT">{ar ? "دفعات المقاولين" : "Contractor payments"}</option>
                </select>
                <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} aria-label={labels.status}>
                  <option value="">{labels.allStatuses}</option>
                  <option value="ACTIVE">{ar ? "فعّال" : "Active"}</option>
                  <option value="VOID">{ar ? "ملغي" : "Void"}</option>
                </select>
                <select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })} aria-label={labels.category}>
                  <option value="">{labels.allCategories}</option>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{expenseCategoryLabel(category, locale)}</option>
                  ))}
                </select>
                <select value={filters.method} onChange={(event) => setFilters({ ...filters, method: event.target.value })} aria-label={labels.method}>
                  <option value="">{labels.allMethods}</option>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>{paymentMethodLabel(method, locale)}</option>
                  ))}
                </select>
                <input
                  value={filters.vendor}
                  onChange={(event) => setFilters({ ...filters, vendor: event.target.value })}
                  placeholder={labels.vendorPlaceholder}
                  aria-label={labels.party}
                />
                <input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} aria-label={labels.from} />
                <input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} aria-label={labels.to} />
                <button type="button" className="ui-button ui-button--primary ui-button--sm" onClick={() => void loadLedger()}>
                  {labels.apply}
                </button>
                <button
                  type="button"
                  className="ui-button ui-button--secondary ui-button--sm"
                  onClick={() => setFilters({ kind: "", status: "", category: "", method: "", vendor: "", from: "", to: "" })}
                >
                  {labels.reset}
                </button>
              </div>
              {ledger?.truncated && <p className="finance-ledger__notice">{labels.truncated}</p>}
              {ledgerLoading ? (
                <LoadingState label={labels.loading} />
              ) : !ledger || ledger.count === 0 ? (
                <EmptyState icon={<Wallet size={18} />} title={labels.empty} />
              ) : (
                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>{labels.type}</th>
                        <th>{labels.project}</th>
                        <th>{labels.date}</th>
                        <th>{labels.party}</th>
                        <th>{labels.category}</th>
                        <th>{labels.method}</th>
                        <th className="num">{labels.amount}</th>
                        <th>{labels.status}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.rows.map((row) => (
                        <tr key={`${row.kind}-${row.id}`}>
                          <td><Badge tone={financeActivityKindTone(row.kind)}>{financeActivityKindLabel(row.kind, locale)}</Badge></td>
                          <td>
                            <div className="finance-table-project">
                              <strong>{row.project?.name ?? "—"}</strong>
                              <bdi className="mono">{row.project?.code ?? ""}</bdi>
                            </div>
                          </td>
                          <td><bdi>{formatAppDate(row.date, locale)}</bdi></td>
                          <td>{row.party ?? "—"}</td>
                          <td>{row.category ? expenseCategoryLabel(row.category, locale) : "—"}</td>
                          <td>{row.method ? paymentMethodLabel(row.method, locale) : "—"}</td>
                          <td className="num"><bdi className="mono">{formatMoney(row.amount, row.currency, locale)}</bdi></td>
                          <td><Badge tone={financialStatusTone(row.status)}>{financialStatusLabel(row.status, locale)}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="finance-ledger__count"><bdi>{ledger.count}</bdi> {labels.rows}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
