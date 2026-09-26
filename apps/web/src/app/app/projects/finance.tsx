"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, EmptyState, LoadingState, MetricCard, OperationsGrid, OperationsMetric, OperationsPanel } from "@elhabak/ui";
import {
  Banknote,
  ClipboardList,
  Copy,
  Download,
  Search,
  FileText,
  History as HistoryIcon,
  Landmark,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  Wallet,
  X
} from "lucide-react";
import {
  computeLineTotalMinor,
  decimalToMinorUnits,
  formatMoneyMajor,
  MONEY_DECIMALS,
  MONEY_PATTERN,
  QUANTITY_DECIMALS,
  QUANTITY_PATTERN
} from "@elhabak/validation/money-core";
import { ProjectWorkspace } from "../../../components/project-workspace";
import {
  apiRequest,
  dataOpsExportUrl,
  uploadRequest,
  BOQ_UNITS,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  boqUnitLabel,
  expenseCategoryLabel,
  paymentMethodLabel,
  financialStatusLabel,
  financialStatusTone,
  financeActionLabel,
  financeAttachmentUrl,
  formatAppDate,
  formatMoney,
  type BoqItemRecord,
  type BoqListResponse,
  type BoqUnit,
  type ClientPaymentRecord,
  type ContractorPaymentRecord,
  type CostEstimateRecord,
  type ExpenseCategory,
  type ExpenseRecord,
  type FinanceHistoryEvent,
  type FinanceProjectContext,
  type FinanceSummary,
  type PaymentMethod,
  roleLabel,
  type UserRole
} from "../../../lib/api";
import { useCurrentUser } from "../../../lib/user-context";

type FinanceSubTab = "summary" | "estimate" | "boq" | "expenses" | "client-payments" | "contractor-payments" | "history";

export function Finance({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const user = useCurrentUser();
  const [context, setContext] = useState<FinanceProjectContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiRequest<FinanceProjectContext>(`/projects/${projectId}/finance/context`)
      .then((ctx) => {
        if (!alive) return;
        setContext(ctx);
        setError("");
      })
      .catch((requestError: Error) => {
        if (alive) setError(requestError.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const labels = ar
    ? { loading: "جاري تحميل الشؤون المالية...", denied: "لا يمكنك الوصول إلى هذا القسم", deniedHint: "هذا القسم غير متاح لدورك الحالي." }
    : { loading: "Loading finance workspace...", denied: "You don't have access to this section", deniedHint: "This section is not available for your current role." };

  if (loading) return <section className="app-page"><LoadingState label={labels.loading} /></section>;
  if (!context) {
    return (
      <section className="app-page">
        <EmptyState icon={<Wallet size={20} />} title={labels.denied} description={error || labels.deniedHint} />
      </section>
    );
  }

  return (
    <section className="app-page project-workspace-page finance-workspace-page">
      <ProjectWorkspace project={context} locale={locale} role={user.role} active="finance" />
      <div className="finance-command-strip">
        <div>
          <span className="section-kicker">{locale === "ar" ? "المتابعة المالية للمشروع" : "Project Cost Control"}</span>
          <strong>{context.name} <bdi className="mono finance-command-strip__code">{context.code ?? "—"}</bdi></strong>
        </div>
        <div className="finance-command-strip__meta">
          {context.client && <span>{locale === "ar" ? "العميل" : "Client"}: <bdi>{context.client.user.displayName}</bdi></span>}
          <span>{locale === "ar" ? "العملة" : "Currency"}: <bdi>{context.currency}</bdi></span>
          {user.role !== "ENGINEER" && (
            <span>
              {locale === "ar" ? "العقد" : "Contract"}:{" "}
              <bdi>{context.contractValue !== null ? money(context.contractValue, context.currency, locale) : (locale === "ar" ? "غير محدد" : "Not set")}</bdi>
            </span>
          )}
        </div>
      </div>
      {user.role === "ADMIN" || user.role === "ACCOUNTANT" ? (
        <AdminFinancePanels projectId={projectId} locale={locale} />
      ) : user.role === "ENGINEER" ? (
        <EngineerBoqPanel projectId={projectId} locale={locale} />
      ) : user.role === "CLIENT" ? (
        <ClientFinancePanel projectId={projectId} locale={locale} />
      ) : (
        <EmptyState icon={<Wallet size={20} />} title={labels.denied} description={labels.deniedHint} />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ helpers */

function money(amount: string | null | undefined, currency: string, locale: "ar" | "en") {
  if (amount === null || amount === undefined) return "—";
  return formatMoney(amount, currency, locale);
}

/* Plain decimal figures inside BOQ/estimate line cells - the totals strip carries the
   currency, so cells stay numeric but must still be grouped and Western-digit like the
   rest of the register. */
function num(value: string | null | undefined, minFractionDigits = 0) {
  if (value === null || value === undefined || value.trim() === "") return "—";
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: 2
  }).format(parsed);
}

function dateOnly(iso: string, locale: "ar" | "en") {
  return formatAppDate(iso, locale);
}

function isOverpaid(outstanding: string | null) {
  return Boolean(outstanding && outstanding.trim().startsWith("-"));
}

/* Exact minor-unit sum of displayed money strings — the same integer arithmetic the
   server uses (decimalToMinorUnits + safe-integer addition), never floating point. */
function sumAmountMinor(amounts: Array<string | null | undefined>): number {
  let total = 0;
  for (const amount of amounts) {
    if (amount === null || amount === undefined || amount.trim() === "") continue;
    total += decimalToMinorUnits(amount.trim(), MONEY_DECIMALS);
  }
  return total;
}

/* Line-total preview inside the item dialog — identical inputs/outputs to the backend
   schema (decimal strings -> minor units -> BigInt product -> minor units). */
function previewLineTotal(quantity: string, unitRate: string): string | null {
  const q = quantity.trim();
  const r = unitRate.trim();
  if (!QUANTITY_PATTERN.test(q) || !MONEY_PATTERN.test(r)) return null;
  return formatMoneyMajor(computeLineTotalMinor(decimalToMinorUnits(q, QUANTITY_DECIMALS), decimalToMinorUnits(r, MONEY_DECIMALS)));
}

/* Compact audit context for a history row - surfaces the amount, revision/version,
   BOQ code or void reason the audit service writes into the event metadata. */
function historyContext(event: FinanceHistoryEvent, locale: "ar" | "en") {
  const meta = event.metadata ?? {};
  const parts: string[] = [];
  const amount = meta.amount;
  if (typeof amount === "string" && amount.trim() !== "") parts.push(formatMoney(amount, "EGP", locale));
  else if (typeof amount === "number") parts.push(formatMoney(String(amount), "EGP", locale));
  if (typeof meta.version === "number") parts.push(`V${String(meta.version).padStart(2, "0")}`);
  if (typeof meta.code === "string" && meta.code) parts.push(meta.code);
  if (typeof meta.reason === "string" && meta.reason) parts.push(meta.reason);
  return parts.length ? parts.join(" · ") : null;
}

/* ------------------------------------------------------------------ Admin/Accountant */

function AdminFinancePanels({ projectId, locale }: { projectId: string; locale: "ar" | "en" }) {
  const ar = locale === "ar";
  const [tab, setTab] = useState<FinanceSubTab>("summary");
  const [summary, setSummary] = useState<FinanceSummary | null>(null);

  const tabs: Array<{ id: FinanceSubTab; label: string; icon: typeof Wallet }> = [
    { id: "summary", label: ar ? "الملخص المالي" : "Summary", icon: Wallet },
    { id: "estimate", label: ar ? "المقايسة التقريبية" : "Estimate", icon: FileText },
    { id: "boq", label: ar ? "جدول الكميات" : "BOQ", icon: ClipboardList },
    { id: "expenses", label: ar ? "المصروفات" : "Expenses", icon: Receipt },
    { id: "client-payments", label: ar ? "دفعات العميل" : "Client Payments", icon: Banknote },
    { id: "contractor-payments", label: ar ? "دفعات المقاولين" : "Contractor Payments", icon: Landmark },
    { id: "history", label: ar ? "السجل المالي" : "History", icon: HistoryIcon }
  ];

  const loadSummary = useCallback(() => {
    apiRequest<FinanceSummary>(`/projects/${projectId}/finance/summary`)
      .then(setSummary)
      .catch(() => undefined);
  }, [projectId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  return (
    <>
      <nav className="finance-subtabs finance-module-tabs" aria-label={ar ? "أقسام الشؤون المالية" : "Finance sections"}>
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
              <Icon size={14} /> {item.label}
            </button>
          );
        })}
      </nav>

      {tab === "summary" && <SummaryPanel projectId={projectId} locale={locale} summary={summary} onChanged={loadSummary} />}
      {tab === "estimate" && <EstimatePanel projectId={projectId} locale={locale} />}
      {tab === "boq" && <BoqPanel projectId={projectId} locale={locale} readOnly={false} onChanged={loadSummary} />}
      {tab === "expenses" && <ExpensesPanel projectId={projectId} locale={locale} currency={summary?.currency ?? "EGP"} onChanged={loadSummary} />}
      {tab === "client-payments" && <ClientPaymentsPanel projectId={projectId} locale={locale} currency={summary?.currency ?? "EGP"} readOnly={false} summary={summary} onChanged={loadSummary} />}
      {tab === "contractor-payments" && <ContractorPaymentsPanel projectId={projectId} locale={locale} currency={summary?.currency ?? "EGP"} onChanged={loadSummary} />}
      {tab === "history" && <HistoryPanel projectId={projectId} locale={locale} />}
    </>
  );
}

function SummaryPanel({
  projectId,
  locale,
  summary,
  onChanged
}: {
  projectId: string;
  locale: "ar" | "en";
  summary: FinanceSummary | null;
  onChanged: () => void;
}) {
  const ar = locale === "ar";
  const [showContractDialog, setShowContractDialog] = useState(false);
  const currency = summary?.currency ?? "EGP";
  const overpaid = isOverpaid(summary?.outstandingBalance ?? null);

  const labels = ar
    ? {
      title: "الملخص المالي للمشروع", lead: "أرقام حقيقية محسوبة من السجلات المالية المسجلة فعلياً.",
      setContract: "تحديد القيمة التعاقدية", contractValue: "القيمة التعاقدية", boqTotal: "إجمالي جدول الكميات",
      estimateTotal: "إجمالي المقايسة الحالية", clientPayments: "دفعات العميل المستلمة", outstanding: "الرصيد المتبقي على العميل",
      overpaidNote: "تنبيه: العميل دفع أكثر من القيمة التعاقدية.", expenses: "إجمالي المصروفات الداخلية",
      contractorPayments: "دفعات المقاولين", committed: "إجمالي التكلفة الفعلية (مصروفات + مقاولين)", notSet: "غير محدد بعد",
      noEstimate: "لا توجد مقايسة حالية", collected: "تم تحصيل", ofContract: "من قيمة العقد"
    }
    : {
      title: "Project Financial Summary", lead: "Real figures calculated from actually persisted financial records.",
      setContract: "Set Contract Value", contractValue: "Contract Value", boqTotal: "BOQ Total",
      estimateTotal: "Current Estimate Total", clientPayments: "Client Payments Received", outstanding: "Client Outstanding Balance",
      overpaidNote: "Warning: the client has paid more than the agreed contract value.", expenses: "Internal Expenses Total",
      contractorPayments: "Contractor Payments", committed: "Committed Actual Cost (expenses + contractors)", notSet: "Not set yet",
      noEstimate: "No current estimate", collected: "Collected", ofContract: "of contract value"
    };

  return (
    <section className="finance-summary-panel finance-summary-command">
      <div className="finance-panel-heading">
        <div>
          <span className="section-kicker">{ar ? "مراقبة التكلفة" : "COST CONTROL"}</span>
          <h2>{labels.title}</h2>
          <p>{labels.lead}</p>
        </div>
        <button className="ui-button ui-button--accent" type="button" onClick={() => setShowContractDialog(true)}>
          <Pencil size={16} /> {labels.setContract}
        </button>
      </div>

      <OperationsPanel className="finance-position-panel" eyebrow={ar ? "العقد والتحصيل" : "CONTRACT & COLLECTIONS"}>
        <OperationsGrid className="finance-position-panel__grid" columns="1.25fr 1fr 1fr">
          <OperationsMetric tone="navy" label={labels.contractValue} value={summary?.contractValue ? money(summary.contractValue, currency, locale) : labels.notSet} />
          <OperationsMetric tone="success" label={labels.clientPayments} value={money(summary?.clientPaymentsTotal, currency, locale)} />
          <OperationsMetric
            tone={overpaid ? "danger" : "navy"}
            label={labels.outstanding}
            value={summary?.outstandingBalance !== null && summary?.outstandingBalance !== undefined ? money(summary.outstandingBalance, currency, locale) : labels.notSet}
            hint={overpaid ? labels.overpaidNote : undefined}
          />
        </OperationsGrid>
      </OperationsPanel>

      {summary?.contractValue !== null && summary?.contractValue !== undefined && summary.clientPaymentsTotal !== undefined && (() => {
        /* Exact collection ratio: minor units only, capped at 100% for the bar. */
        const contractMinor = decimalToMinorUnits(summary.contractValue, MONEY_DECIMALS);
        const paidMinor = decimalToMinorUnits(summary.clientPaymentsTotal, MONEY_DECIMALS);
        const pct = contractMinor > 0 ? Math.min(100, Math.round((paidMinor / contractMinor) * 100)) : paidMinor > 0 ? 100 : 0;
        return (
          <div className="finance-collection-bar" role="img" aria-label={`${labels.collected} ${pct}% ${labels.ofContract}`}>
            <div className="finance-collection-bar__track">
              <div className={`finance-collection-bar__fill${overpaid ? " finance-collection-bar__fill--overpaid" : ""}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="finance-collection-bar__label">
              <strong>{labels.collected} <bdi>{money(summary.clientPaymentsTotal, currency, locale)}</bdi></strong>
              <small><bdi>{pct}%</bdi> {labels.ofContract}</small>
            </span>
          </div>
        );
      })()}

      <OperationsPanel className="finance-cost-panel" eyebrow={ar ? "التكلفة والالتزام" : "COST & COMMITMENTS"}>
        <OperationsGrid columns="repeat(5, minmax(150px, 1fr))">
          <OperationsMetric tone="warning" label={labels.boqTotal} value={money(summary?.boqTotal, currency, locale)} />
          <OperationsMetric tone="warning" label={labels.estimateTotal} value={summary?.estimateTotal === null ? labels.noEstimate : money(summary?.estimateTotal, currency, locale)} />
          <OperationsMetric tone="danger" label={labels.expenses} value={money(summary?.expensesTotal, currency, locale)} />
          <OperationsMetric tone="danger" label={labels.contractorPayments} value={money(summary?.contractorPaymentsTotal, currency, locale)} />
          <OperationsMetric tone="navy" label={labels.committed} value={money(summary?.committedCostTotal, currency, locale)} />
        </OperationsGrid>
      </OperationsPanel>

      {showContractDialog && (
        <ContractValueDialog
          projectId={projectId}
          locale={locale}
          currentValue={summary?.contractValue ?? null}
          onClose={() => setShowContractDialog(false)}
          onSaved={() => {
            setShowContractDialog(false);
            onChanged();
          }}
        />
      )}
    </section>
  );
}

function ContractValueDialog({
  projectId,
  locale,
  currentValue,
  onClose,
  onSaved
}: {
  projectId: string;
  locale: "ar" | "en";
  currentValue: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ar = locale === "ar";
  const [amount, setAmount] = useState(currentValue ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const labels = ar
    ? { title: "تحديد القيمة التعاقدية", amount: "القيمة التعاقدية (ج.م)", note: "ملاحظة (اختياري)", save: "حفظ", close: "إغلاق" }
    : { title: "Set Contract Value", amount: "Contract value (EGP)", note: "Note (optional)", save: "Save", close: "Close" };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/projects/${projectId}/finance/contract`, {
        method: "PATCH",
        body: JSON.stringify({ amount, note })
      });
      onSaved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !saving) onClose(); }}>
      <section className="design-dialog design-dialog--compact" role="dialog" aria-modal="true">
        <header>
          <div><span>{ar ? "الملف المالي" : "FINANCIAL PROFILE"}</span><h2>{labels.title}</h2></div>
          <button type="button" className="icon-button" onClick={onClose} disabled={saving} aria-label={labels.close}><X size={20} /></button>
        </header>
        <form onSubmit={(event) => void submit(event)}>
          <fieldset disabled={saving}>
            <label className="ui-field full-span">
              {labels.amount}
              <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required autoFocus />
            </label>
            <label className="ui-field full-span">
              {labels.note}
              <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} />
            </label>
          </fieldset>
          {error && <div className="form-error">{error}</div>}
          <footer>
            <button className="ui-button ui-button--accent" type="submit" disabled={saving}>{labels.save}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Estimate */

function EstimatePanel({ projectId, locale }: { projectId: string; locale: "ar" | "en" }) {
  const ar = locale === "ar";
  const [estimates, setEstimates] = useState<CostEstimateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState<{ item?: LineItemLike } | null>(null);
  const [confirmVersion, setConfirmVersion] = useState(false);
  const [versionSaving, setVersionSaving] = useState(false);

  const labels = ar
    ? {
      title: "المقايسة التقريبية", lead: "مستند العمل الحالي لتقدير التكلفة الأولية للمشروع.",
      create: "إنشاء مقايسة", newVersion: "إصدار نسخة جديدة", addItem: "إضافة بند", empty: "لا توجد مقايسة مسجلة",
      emptyHint: "ابدأ بإنشاء أول مقايسة تقريبية لهذا المشروع.", description: "الوصف", unit: "الوحدة", quantity: "الكمية",
      unitRate: "سعر الوحدة", total: "الإجمالي", actions: "الإجراء", version: "نسخة", finalized: "نسخة سابقة (نهائية)",
      current: "النسخة الحالية", loading: "جاري تحميل المقايسة...", removeConfirm: "هل تريد حذف هذا البند؟", noItems: "لا توجد بنود في هذه المقايسة بعد.",
      versionTitle: "إصدار نسخة جديدة من المقايسة",
      versionBody: (v: number, next: number) => `سيتم إقفال النسخة الحالية V${String(v).padStart(2, "0")} كنهائية للقراءة فقط، وإنشاء نسخة عمل جديدة قابلة للتعديل V${String(next).padStart(2, "0")} بنفس البنود. لا يمكن التراجع عن الإقفال.`,
      versionConfirm: "إقفال وإصدار النسخة الجديدة", cancel: "إلغاء"
    }
    : {
      title: "Preliminary Estimation", lead: "The current working document for the project's preliminary cost estimate.",
      create: "Create Estimate", newVersion: "New Version", addItem: "Add Item", empty: "No estimate recorded",
      emptyHint: "Start by creating the first preliminary estimate for this project.", description: "Description", unit: "Unit", quantity: "Quantity",
      unitRate: "Unit Rate", total: "Total", actions: "Action", version: "version", finalized: "Previous version (finalized)",
      current: "Current version", loading: "Loading estimate...", removeConfirm: "Remove this item?", noItems: "No items in this estimate yet.",
      versionTitle: "Create a new estimate version",
      versionBody: (v: number, next: number) => `The current version V${String(v).padStart(2, "0")} will be finalized as read-only, and a new editable working version V${String(next).padStart(2, "0")} will be created with the same items. Finalization cannot be undone.`,
      versionConfirm: "Finalize & create new version", cancel: "Cancel"
    };

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    apiRequest<CostEstimateRecord[]>(`/projects/${projectId}/finance/estimates`)
      .then((result) => {
        setEstimates(result);
        setError("");
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const current = useMemo(() => estimates.find((estimate) => estimate.isCurrent) ?? null, [estimates]);
  const history = useMemo(
    () => estimates.filter((estimate) => !estimate.isCurrent).sort((a, b) => b.version - a.version),
    [estimates]
  );

  async function removeItem(itemId: string) {
    if (!current || !window.confirm(labels.removeConfirm)) return;
    await apiRequest(`/projects/${projectId}/finance/estimates/${current.id}/items/${itemId}`, { method: "DELETE" });
    load();
  }

  async function newVersion() {
    if (!current) return;
    setVersionSaving(true);
    try {
      await apiRequest(`/projects/${projectId}/finance/estimates/${current.id}/new-version`, { method: "POST", body: "{}" });
      setConfirmVersion(false);
      load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
    } finally {
      setVersionSaving(false);
    }
  }

  if (loading) return <LoadingState label={labels.loading} />;

  return (
    <section>
      <div className="finance-panel-heading">
        <div>
          <span className="section-kicker">{ar ? "المقايسة التقريبية" : "PRELIMINARY ESTIMATE"}</span>
          <h2>{labels.title}</h2>
          <p>{labels.lead}</p>
        </div>
        {current ? (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="ui-button ui-button--secondary" type="button" onClick={() => setConfirmVersion(true)}>{labels.newVersion}</button>
            <button className="ui-button ui-button--accent" type="button" onClick={() => setShowItemDialog({})}>
              <Plus size={16} /> {labels.addItem}
            </button>
          </div>
        ) : (
          <button className="ui-button ui-button--accent" type="button" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> {labels.create}
          </button>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      {!current && <EmptyState icon={<FileText size={20} />} title={labels.empty} description={labels.emptyHint} />}

      {current && (
        <>
          <div className="finance-version-banner">
            <div className="finance-version-banner__id">
              <span className="finance-version-chip mono"><bdi>V{String(current.version).padStart(2, "0")}</bdi></span>
              <div>
                <strong>{current.title}</strong>
                <small>{labels.current} · {current.createdBy?.displayName ?? "—"} · <bdi>{dateOnly(current.updatedAt, locale)}</bdi></small>
              </div>
            </div>
            <Badge tone="success">{labels.current}</Badge>
            <div className="finance-version-banner__total">
              <small>{labels.total}</small>
              <strong className="mono"><bdi>{money(current.total, "EGP", locale)}</bdi></strong>
            </div>
          </div>

          {current.items.length === 0 ? (
            <EmptyState icon={<FileText size={18} />} title={labels.noItems} />
          ) : (
            <LineItemRegister
              items={current.items}
              locale={locale}
              labels={labels}
              onEdit={(item) => setShowItemDialog({ item })}
              onRemove={(item) => void removeItem(item.id)}
            />
          )}

          {history.length > 0 && (
            <div className="finance-version-ledger">
              <span className="section-kicker">{ar ? "نسخ سابقة" : "PREVIOUS VERSIONS"}</span>
              {history.map((estimate) => (
                <div className="finance-version-ledger__row" key={estimate.id}>
                  <span className="finance-version-chip finance-version-chip--locked mono"><bdi>V{String(estimate.version).padStart(2, "0")}</bdi></span>
                  <strong>{estimate.title}</strong>
                  <span className="mono"><bdi>{money(estimate.total, "EGP", locale)}</bdi></span>
                  <time><bdi>{dateOnly(estimate.updatedAt, locale)}</bdi></time>
                  <Badge tone="neutral">{labels.finalized}</Badge>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showCreate && (
        <CreateEstimateDialog
          projectId={projectId}
          locale={locale}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      {showItemDialog && current && (
        <LineItemDialog
          mode="estimate"
          projectId={projectId}
          parentId={current.id}
          locale={locale}
          item={showItemDialog.item}
          onClose={() => setShowItemDialog(null)}
          onSaved={() => {
            setShowItemDialog(null);
            load();
          }}
          onItemSaved={() => load(true)}
        />
      )}

      {confirmVersion && current && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !versionSaving) setConfirmVersion(false); }}>
          <section className="design-dialog design-dialog--compact" role="dialog" aria-modal="true" aria-labelledby="new-version-title">
            <header>
              <div><span>{ar ? "المقايسة" : "ESTIMATE"}</span><h2 id="new-version-title">{labels.versionTitle}</h2></div>
              <button type="button" className="icon-button" onClick={() => setConfirmVersion(false)} disabled={versionSaving} aria-label={labels.cancel}><X size={20} /></button>
            </header>
            <p className="finance-version-confirm">{labels.versionBody(current.version, current.version + 1)}</p>
            <footer className="finance-dialog-actions">
              <button className="ui-button" type="button" onClick={() => setConfirmVersion(false)} disabled={versionSaving}>{labels.cancel}</button>
              <button className="ui-button ui-button--accent" type="button" onClick={() => void newVersion()} disabled={versionSaving}>{labels.versionConfirm}</button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}

function CreateEstimateDialog({
  projectId,
  locale,
  onClose,
  onCreated
}: {
  projectId: string;
  locale: "ar" | "en";
  onClose: () => void;
  onCreated: () => void;
}) {
  const ar = locale === "ar";
  const [title, setTitle] = useState(ar ? "المقايسة التقريبية الأولى" : "Preliminary Estimate v1");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const labels = ar
    ? { title: "إنشاء مقايسة تقريبية", name: "عنوان المقايسة", description: "الوصف (اختياري)", save: "إنشاء", close: "إغلاق" }
    : { title: "Create Preliminary Estimate", name: "Estimate title", description: "Description (optional)", save: "Create", close: "Close" };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiRequest(`/projects/${projectId}/finance/estimates`, { method: "POST", body: JSON.stringify({ title, description }) });
      onCreated();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !saving) onClose(); }}>
      <section className="design-dialog design-dialog--compact" role="dialog" aria-modal="true">
        <header>
          <div><span>{ar ? "المقايسة" : "ESTIMATE"}</span><h2>{labels.title}</h2></div>
          <button type="button" className="icon-button" onClick={onClose} disabled={saving} aria-label={labels.close}><X size={20} /></button>
        </header>
        <form onSubmit={(event) => void submit(event)}>
          <fieldset disabled={saving}>
            <label className="ui-field full-span">{labels.name}<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} required autoFocus /></label>
            <label className="ui-field full-span">{labels.description}<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={3000} /></label>
          </fieldset>
          {error && <div className="form-error">{error}</div>}
          <footer><button className="ui-button ui-button--accent" type="submit" disabled={saving}>{labels.save}</button></footer>
        </form>
      </section>
    </div>
  );
}

type LineItemLike = { id: string; description: string; unit: BoqUnit; quantity: string; unitRate: string; lineTotal: string; note: string | null };

function LineItemRegister({
  items,
  locale,
  labels,
  onEdit,
  onRemove
}: {
  items: LineItemLike[];
  locale: "ar" | "en";
  labels: { description: string; unit: string; quantity: string; unitRate: string; total: string; actions: string };
  onEdit: (item: LineItemLike) => void;
  onRemove: (item: LineItemLike) => void;
}) {
  const cols = "minmax(180px,2fr) 90px 90px 110px 120px 80px";
  return (
    <div className="finance-register" style={{ "--finance-cols": cols } as React.CSSProperties}>
      <div className="finance-register__head">
        <span>{labels.description}</span>
        <span>{labels.unit}</span>
        <span>{labels.quantity}</span>
        <span>{labels.unitRate}</span>
        <span>{labels.total}</span>
        <span>{labels.actions}</span>
      </div>
      {items.map((item) => (
        <div className="finance-register__row" key={item.id}>
          <div className="finance-register__identity" data-label={labels.description}>
            <strong>{item.description}</strong>
            {item.note && <span className="finance-register__cell--muted">{item.note}</span>}
          </div>
          <span className="finance-register__cell" data-label={labels.unit}>{boqUnitLabel(item.unit, locale)}</span>
          <span className="finance-register__cell finance-register__cell--amount" data-label={labels.quantity}><bdi>{num(item.quantity)}</bdi></span>
          <span className="finance-register__cell finance-register__cell--amount" data-label={labels.unitRate}><bdi>{num(item.unitRate, 2)}</bdi></span>
          <span className="finance-register__cell finance-register__cell--amount finance-register__cell--total" data-label={labels.total}><bdi>{num(item.lineTotal, 2)}</bdi></span>
          <div className="finance-register__actions">
            <button className="icon-button" type="button" onClick={() => onEdit(item)} aria-label={`${locale === "ar" ? "تعديل" : "Edit"}: ${item.description}`}><Pencil size={15} /></button>
            <button className="icon-button" type="button" onClick={() => onRemove(item)} aria-label={`${locale === "ar" ? "حذف" : "Delete"}: ${item.description}`}><Trash2 size={15} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function LineItemDialog({
  mode,
  projectId,
  parentId,
  locale,
  item,
  duplicate,
  onClose,
  onSaved,
  onItemSaved
}: {
  mode: "estimate" | "boq";
  projectId: string;
  parentId: string;
  locale: "ar" | "en";
  item: (LineItemLike & { code?: string; section?: string | null }) | undefined;
  duplicate?: boolean;
  onClose: () => void;
  onSaved: () => void;
  onItemSaved?: () => void;
}) {
  const ar = locale === "ar";
  const editing = Boolean(item && !duplicate);
  const [code, setCode] = useState(editing ? (item?.code ?? "") : "");
  const [section, setSection] = useState(item?.section ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [unit, setUnit] = useState<BoqUnit>(item?.unit ?? "M2");
  const [quantity, setQuantity] = useState(item?.quantity ?? "");
  const [unitRate, setUnitRate] = useState(item?.unitRate ?? "");
  const [note, setNote] = useState(item?.note ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const descriptionRef = useRef<HTMLInputElement>(null);

  const labels = ar
    ? {
      title: editing ? "تعديل بند" : duplicate ? "نسخ بند إلى جديد" : "إضافة بند", code: "الكود", codeAuto: "يتم إنشاؤه تلقائياً عند الإضافة", section: "القسم / التصنيف", description: "الوصف",
      unit: "الوحدة", quantity: "الكمية", unitRate: "سعر الوحدة", note: "ملاحظة (اختياري)", save: "حفظ", saveAdd: "حفظ وإضافة آخر", close: "إغلاق",
      lineTotal: "إجمالي البند", lineTotalHint: "نفس المعادلة الحسابية المستخدمة في الخادم"
    }
    : {
      title: editing ? "Edit item" : duplicate ? "Copy to new item" : "Add item", code: "Code", codeAuto: "Generated automatically when added", section: "Section / category", description: "Description",
      unit: "Unit", quantity: "Quantity", unitRate: "Unit rate", note: "Note (optional)", save: "Save", saveAdd: "Save & add another", close: "Close",
      lineTotal: "Line total", lineTotalHint: "Same exact calculation as the server"
    };

  useEffect(() => {
    if (!editing) descriptionRef.current?.focus();
  }, [editing]);

  const linePreview = previewLineTotal(quantity, unitRate);

  async function submit(event: { preventDefault(): void }, addAnother: boolean) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const body: Record<string, unknown> = { description, unit, quantity, unitRate, note };
    if (mode === "boq") {
      body.code = code;
      body.section = section;
    }
    const basePath = mode === "boq" ? `/projects/${projectId}/finance/boq` : `/projects/${projectId}/finance/estimates/${parentId}/items`;
    const path = editing ? `${basePath}/${item!.id}` : basePath;
    const method = editing ? "PATCH" : "POST";
    try {
      await apiRequest(path, { method, body: JSON.stringify(body) });
      if (addAnother && !editing) {
        /* Repetitive-entry mode: keep section/unit, clear the per-line fields, refocus. */
        setCode("");
        setDescription("");
        setQuantity("");
        setUnitRate("");
        setNote("");
        setSaving(false);
        onItemSaved?.();
        setTimeout(() => descriptionRef.current?.focus(), 0);
      } else {
        onSaved();
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !saving) onClose(); }}>
      <section className="design-dialog" role="dialog" aria-modal="true">
        <header>
          <div><span>{mode === "boq" ? (ar ? "جدول الكميات" : "BOQ") : (ar ? "المقايسة" : "ESTIMATE")}</span><h2>{labels.title}</h2></div>
          <button type="button" className="icon-button" onClick={onClose} disabled={saving} aria-label={labels.close}><X size={20} /></button>
        </header>
        <form onSubmit={(event) => void submit(event, false)}>
          <fieldset disabled={saving}>
            {mode === "boq" && (
              <>
                {editing ? (
                  <label className="ui-field">{labels.code}<input value={code} onChange={(event) => setCode(event.target.value)} maxLength={40} required /></label>
                ) : (
                  <div className="ui-field generated-code-field">
                    <span>{labels.code}</span>
                    <div className="generated-code-field__value mono">BOQ-001-XXX</div>
                    <small>{labels.codeAuto}</small>
                  </div>
                )}
                <label className="ui-field">{labels.section}<input value={section ?? ""} onChange={(event) => setSection(event.target.value)} maxLength={120} /></label>
              </>
            )}
            <label className="ui-field full-span">{labels.description}<input ref={descriptionRef} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} required /></label>
            <label className="ui-field">
              {labels.unit}
              <select value={unit} onChange={(event) => setUnit(event.target.value as BoqUnit)}>
                {BOQ_UNITS.map((option) => (
                  <option key={option} value={option}>{boqUnitLabel(option, locale)}</option>
                ))}
              </select>
            </label>
            <label className="ui-field">{labels.quantity}<input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} required aria-describedby="line-total-preview" /></label>
            <label className="ui-field">{labels.unitRate}<input inputMode="decimal" value={unitRate} onChange={(event) => setUnitRate(event.target.value)} required aria-describedby="line-total-preview" /></label>
            <div className="finance-line-preview" id="line-total-preview" role="status" aria-live="polite">
              <span>{labels.lineTotal}: <strong className="finance-line-preview__value"><bdi>{linePreview !== null ? money(linePreview, "EGP", locale) : "—"}</bdi></strong></span>
              <small>{labels.lineTotalHint}</small>
            </div>
            <label className="ui-field full-span">{labels.note}<textarea value={note ?? ""} onChange={(event) => setNote(event.target.value)} maxLength={1000} /></label>
          </fieldset>
          {error && <div className="form-error" role="alert">{error}</div>}
          <footer className="finance-dialog-actions">
            <button className="ui-button ui-button--secondary" type="button" onClick={onClose} disabled={saving}>{labels.close}</button>
            {!editing && (
              <button className="ui-button" type="button" disabled={saving} onClick={(event) => void submit(event, true)}>{labels.saveAdd}</button>
            )}
            <button className="ui-button ui-button--accent" type="submit" disabled={saving}>{labels.save}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ BOQ */

function BoqPanel({
  projectId,
  locale,
  readOnly,
  onChanged
}: {
  projectId: string;
  locale: "ar" | "en";
  readOnly: boolean;
  onChanged?: () => void;
}) {
  const ar = locale === "ar";
  const [data, setData] = useState<BoqListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDialog, setShowDialog] = useState<{ item?: BoqItemRecord; duplicate?: boolean } | null>(null);
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");

  const labels = ar
    ? {
      title: "جدول الكميات (BOQ)", lead: "سجل هندسي كثيف لبنود الكميات والأسعار والإجماليات المعتمدة.",
      addItem: "إضافة بند", code: "الكود", description: "الوصف", unit: "الوحدة", quantity: "الكمية", unitRate: "سعر الوحدة",
      total: "الإجمالي", notes: "ملاحظات", actions: "الإجراء", empty: "لا توجد بنود في جدول الكميات", emptyHint: "ابدأ بإضافة أول بند.",
      overall: "الإجمالي الكلي", loading: "جاري تحميل جدول الكميات...", removeConfirm: "هل تريد حذف هذا البند؟", section: "القسم",
      searchPlaceholder: "بحث بالكود أو الوصف أو القسم...", allSections: "كل الأقسام", unsectioned: "بدون قسم",
      itemsCount: (n: number) => `${n} بند`, shownOf: (shown: number, total: number) => `${shown} من ${total} بند`,
      noMatch: "لا توجد بنود مطابقة", subtotal: "إجمالي القسم", copy: "نسخ البند"
    }
    : {
      title: "Bill of Quantities (BOQ)", lead: "Dense engineering register of quantities, rates, and approved totals.",
      addItem: "Add Item", code: "Code", description: "Description", unit: "Unit", quantity: "Quantity", unitRate: "Unit Rate",
      total: "Line Total", notes: "Notes", actions: "Action", empty: "No BOQ items registered", emptyHint: "Start by adding the first item.",
      overall: "Overall Total", loading: "Loading BOQ...", removeConfirm: "Remove this item?", section: "Section",
      searchPlaceholder: "Search code, description, or section...", allSections: "All sections", unsectioned: "Unsectioned",
      itemsCount: (n: number) => `${n} item${n === 1 ? "" : "s"}`, shownOf: (shown: number, total: number) => `${shown} of ${total} items`,
      noMatch: "No items match the current filter", subtotal: "Section subtotal", copy: "Copy item"
    };

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    apiRequest<BoqListResponse>(`/projects/${projectId}/finance/boq`)
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function removeItem(itemId: string) {
    if (!window.confirm(labels.removeConfirm)) return;
    await apiRequest(`/projects/${projectId}/finance/boq/${itemId}`, { method: "DELETE" });
    load();
    onChanged?.();
  }

  const sectionNames = useMemo(() => {
    if (!data) return [] as string[];
    const names = new Set<string>();
    for (const item of data.items) names.add(item.section ?? "");
    return [...names];
  }, [data]);

  const visibleItems = useMemo(() => {
    if (!data) return [] as BoqItemRecord[];
    const query = search.trim().toLowerCase();
    return data.items.filter((item) => {
      if (sectionFilter !== "" && (item.section ?? "") !== sectionFilter) return false;
      if (query === "") return true;
      return (
        item.code.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        (item.section ?? "").toLowerCase().includes(query)
      );
    });
  }, [data, search, sectionFilter]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, BoqItemRecord[]>();
    for (const item of visibleItems) {
      const key = item.section ?? "";
      const group = groups.get(key);
      if (group) group.push(item);
      else groups.set(key, [item]);
    }
    return [...groups.entries()];
  }, [visibleItems]);

  if (loading) return <LoadingState label={labels.loading} />;

  const filtering = search.trim() !== "" || sectionFilter !== "";
  const cols = "80px 96px minmax(200px,2fr) 68px 84px 104px 116px minmax(110px,1fr)" + (readOnly ? "" : " 108px");

  return (
    <section>
      <div className="finance-panel-heading">
        <div>
          <span className="section-kicker">{ar ? "قياسات ومقاولات" : "QUANTITY SURVEYING"}</span>
          <h2>{labels.title}</h2>
          <p>{labels.lead}</p>
        </div>
        {!readOnly && (
          <button className="ui-button ui-button--accent" type="button" onClick={() => setShowDialog({})}>
            <Plus size={16} /> {labels.addItem}
          </button>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      {data && data.items.length === 0 && <EmptyState icon={<ClipboardList size={20} />} title={labels.empty} description={!readOnly ? labels.emptyHint : undefined} />}

      {data && data.items.length > 0 && (
        <>
          {data.items.length > 8 && (
          <div className="finance-boq-toolbar">
            <label className="ui-search-field finance-boq-search">
              <Search className="ui-search-field__icon" size={15} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={labels.searchPlaceholder}
                aria-label={labels.searchPlaceholder}
              />
            </label>
            <label className="finance-boq-section-filter">
              <span>{labels.section}</span>
              <select value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)}>
                <option value="">{labels.allSections}</option>
                {sectionNames.map((name) => (
                  <option key={name || "none"} value={name}>{name === "" ? labels.unsectioned : name}</option>
                ))}
              </select>
            </label>
            <span className="finance-boq-count" role="status">
              {filtering ? labels.shownOf(visibleItems.length, data.items.length) : labels.itemsCount(data.items.length)}
            </span>
          </div>
          )}

          <div className="finance-totals-strip">
            <span><small>{labels.overall}</small><strong>{money(data.overallTotal, "EGP", locale)}</strong></span>
            {data.sectionTotals.map((entry) => (
              <span key={entry.section ?? "none"}><small>{entry.section ?? labels.unsectioned}</small><strong>{money(entry.total, "EGP", locale)}</strong></span>
            ))}
          </div>

          {visibleItems.length === 0 ? (
            <p className="finance-register__empty-filter">{labels.noMatch}</p>
          ) : (
            <div className="finance-register boq-register--qs" style={{ "--finance-cols": cols } as React.CSSProperties}>
              <div className="finance-register__head">
                <span>{labels.code}</span>
                <span>{labels.section}</span>
                <span>{labels.description}</span>
                <span>{labels.unit}</span>
                <span className="num">{labels.quantity}</span>
                <span className="num">{labels.unitRate}</span>
                <span className="num">{labels.total}</span>
                <span>{labels.notes}</span>
                {!readOnly && <span>{labels.actions}</span>}
              </div>
              {groupedItems.map(([section, items]) => {
                const subtotal = formatMoneyMajor(sumAmountMinor(items.map((item) => item.lineTotal)));
                return (
                  <Fragment key={section || "__none__"}>
                    <div className="finance-section-header boq-section-ledger" role="row">
                      <strong className="finance-section-header__name">{section === "" ? labels.unsectioned : section}</strong>
                      <span className="finance-section-header__count">{labels.itemsCount(items.length)}</span>
                      <span className="finance-section-header__total">
                        <small>{labels.subtotal}</small>
                        <bdi>{money(subtotal, "EGP", locale)}</bdi>
                      </span>
                    </div>
                    {items.map((item) => (
                      <div className="finance-register__row" key={item.id}>
                        <span className="finance-register__cell mono" data-label={labels.code}><bdi dir="ltr">{item.code}</bdi></span>
                        <span className="finance-register__cell" data-label={labels.section}>{item.section || labels.unsectioned}</span>
                        <div className="finance-register__identity" data-label={labels.description}>
                          <strong>{item.description}</strong>
                        </div>
                        <span className="finance-register__cell" data-label={labels.unit}>{boqUnitLabel(item.unit, locale)}</span>
                        <span className="finance-register__cell finance-register__cell--amount num" data-label={labels.quantity}><bdi>{num(item.quantity)}</bdi></span>
                        <span className="finance-register__cell finance-register__cell--amount num" data-label={labels.unitRate}><bdi>{num(item.unitRate, 2)}</bdi></span>
                        <span className="finance-register__cell finance-register__cell--amount finance-register__cell--total num" data-label={labels.total}><bdi>{num(item.lineTotal, 2)}</bdi></span>
                        <span className="finance-register__cell finance-register__cell--muted" data-label={labels.notes}>{item.note || "—"}</span>
                        {!readOnly && (
                          <div className="finance-register__actions">
                            <button className="icon-button" type="button" onClick={() => setShowDialog({ item })} aria-label={`${ar ? "تعديل" : "Edit"} ${item.code}`}><Pencil size={15} /></button>
                            <button className="icon-button" type="button" onClick={() => setShowDialog({ item, duplicate: true })} aria-label={`${labels.copy} ${item.code}`} title={labels.copy}><Copy size={15} /></button>
                            <button className="icon-button" type="button" onClick={() => void removeItem(item.id)} aria-label={`${ar ? "حذف" : "Delete"} ${item.code}`}><Trash2 size={15} /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </Fragment>
                );
              })}
            </div>
          )}
        </>
      )}

      {showDialog && (
        <LineItemDialog
          mode="boq"
          projectId={projectId}
          parentId=""
          locale={locale}
          item={showDialog.item}
          duplicate={showDialog.duplicate === true}
          onClose={() => setShowDialog(null)}
          onSaved={() => {
            setShowDialog(null);
            load();
            onChanged?.();
          }}
          onItemSaved={() => {
            load(true);
            onChanged?.();
          }}
        />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ Expenses */

function ExpensesPanel({
  projectId,
  locale,
  currency,
  onChanged
}: {
  projectId: string;
  locale: "ar" | "en";
  currency: string;
  onChanged: () => void;
}) {
  const ar = locale === "ar";
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [category, setCategory] = useState<ExpenseCategory | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [voidTarget, setVoidTarget] = useState<ExpenseRecord | null>(null);

  const labels = ar
    ? {
      title: "المصروفات الداخلية", lead: "سجل داخلي للمصروفات - لا يظهر للعميل مطلقاً.", add: "تسجيل مصروف",
      allCategories: "كل الفئات", date: "التاريخ", category: "الفئة", description: "الوصف", vendor: "المورد", amount: "القيمة",
      status: "الحالة", actions: "الإجراء", empty: "لا توجد مصروفات مسجلة", emptyHint: "سجل أول مصروف لهذا المشروع.",
      loading: "جاري تحميل المصروفات...", void: "إلغاء", receipt: "إيصال",
      activeTotal: "إجمالي المصروفات الفعالة", voided: (n: number) => `${n} ملغي`
    }
    : {
      title: "Internal Expenses", lead: "Internal expense ledger - never shown to the Client.", add: "Record Expense",
      allCategories: "All Categories", date: "Date", category: "Category", description: "Description", vendor: "Vendor", amount: "Amount",
      status: "Status", actions: "Action", empty: "No expenses recorded", emptyHint: "Record the first expense for this project.",
      loading: "Loading expenses...", void: "Void", receipt: "Receipt",
      activeTotal: "Active expenses total", voided: (n: number) => `${n} void`
    };

  const load = useCallback(() => {
    setLoading(true);
    const query = category ? `?category=${category}` : "";
    apiRequest<ExpenseRecord[]>(`/projects/${projectId}/finance/expenses${query}`)
      .then((result) => {
        setExpenses(result);
        setError("");
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [projectId, category]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState label={labels.loading} />;

  const cols = "100px minmax(110px,0.8fr) minmax(160px,1.6fr) minmax(100px,0.8fr) 120px 90px 90px";

  return (
    <section>
      <div className="finance-panel-heading">
        <div>
          <span className="section-kicker">{ar ? "مصروفات داخلية" : "INTERNAL LEDGER"}</span>
          <h2>{labels.title}</h2>
          <p>{labels.lead}</p>
        </div>
        <button className="ui-button ui-button--accent" type="button" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> {labels.add}
        </button>
      </div>

      <div className="design-toolbar" style={{ gridTemplateColumns: "220px" }}>
        <label className="design-filter">
          <select value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory | "")}>
            <option value="">{labels.allCategories}</option>
            {EXPENSE_CATEGORIES.map((option) => (
              <option key={option} value={option}>{expenseCategoryLabel(option, locale)}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="form-error">{error}</div>}

      {expenses.length === 0 && <EmptyState icon={<Receipt size={20} />} title={labels.empty} description={labels.emptyHint} />}

      {expenses.length > 0 && (() => {
        const voidedCount = expenses.filter((expense) => expense.status === "VOID").length;
        const activeTotal = formatMoneyMajor(sumAmountMinor(expenses.filter((expense) => expense.status === "ACTIVE").map((expense) => expense.amount)));
        return (
          <div className="finance-register-meta">
            <span>{labels.activeTotal}: <bdi className="mono">{money(activeTotal, currency, locale)}</bdi></span>
            {voidedCount > 0 && <span className="finance-register-meta__voided">{labels.voided(voidedCount)}</span>}
          </div>
        );
      })()}

      {expenses.length > 0 && (
        <div className="finance-register" style={{ "--finance-cols": cols } as React.CSSProperties}>
          <div className="finance-register__head">
            <span>{labels.date}</span>
            <span>{labels.category}</span>
            <span>{labels.description}</span>
            <span>{labels.vendor}</span>
            <span>{labels.amount}</span>
            <span>{labels.status}</span>
            <span>{labels.actions}</span>
          </div>
          {expenses.map((expense) => (
            <div className={`finance-register__row ${expense.status === "VOID" ? "finance-void-row" : ""}`} key={expense.id}>
              <span className="finance-register__cell" data-label={labels.date}>{dateOnly(expense.expenseDate, locale)}</span>
              <span className="finance-register__cell" data-label={labels.category}>{expenseCategoryLabel(expense.category, locale)}</span>
              <div className="finance-register__identity" data-label={labels.description}>
                <strong>{expense.description}</strong>
                {expense.reference && <span className="finance-register__cell--muted">{expense.reference}</span>}
                {expense.status === "VOID" && expense.voidReason && <span className="finance-void-reason">{ar ? "سبب الإلغاء" : "Void reason"}: {expense.voidReason}</span>}
              </div>
              <span className="finance-register__cell finance-register__cell--muted" data-label={labels.vendor}>{expense.vendor ?? "—"}</span>
              <span className="finance-register__cell finance-register__cell--amount" data-label={labels.amount}>{money(expense.amount, currency, locale)}</span>
              <span className="finance-register__cell" data-label={labels.status}><Badge tone={financialStatusTone(expense.status)}>{financialStatusLabel(expense.status, locale)}</Badge></span>
              <div className="finance-register__actions">
                {expense.attachments[0] && (
                  <a className="icon-button" href={financeAttachmentUrl(projectId, "expenses", expense.id, expense.attachments[0].id)} target="_blank" rel="noreferrer" aria-label={labels.receipt}>
                    <Receipt size={15} />
                  </a>
                )}
                {expense.status === "ACTIVE" && (
                  <button className="icon-button" type="button" onClick={() => setVoidTarget(expense)} aria-label={labels.void}><Trash2 size={15} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <ExpenseDialog
          projectId={projectId}
          locale={locale}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
            onChanged();
          }}
        />
      )}

      {voidTarget && (
        <VoidDialog
          locale={locale}
          record={{
            title: voidTarget.description,
            amount: money(voidTarget.amount, currency, locale),
            date: dateOnly(voidTarget.expenseDate, locale),
            reference: voidTarget.reference
          }}
          onClose={() => setVoidTarget(null)}
          onConfirm={async (reason) => {
            await apiRequest(`/projects/${projectId}/finance/expenses/${voidTarget.id}/void`, { method: "POST", body: JSON.stringify({ reason }) });
            setVoidTarget(null);
            load();
            onChanged();
          }}
        />
      )}
    </section>
  );
}

function ExpenseDialog({ projectId, locale, onClose, onCreated }: { projectId: string; locale: "ar" | "en"; onClose: () => void; onCreated: () => void }) {
  const ar = locale === "ar";
  const [category, setCategory] = useState<ExpenseCategory>("MATERIAL");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [vendor, setVendor] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const labels = ar
    ? {
      title: "تسجيل مصروف", category: "الفئة", description: "الوصف", amount: "القيمة (ج.م)", date: "التاريخ", vendor: "المورد (اختياري)",
      reference: "المرجع (اختياري)", note: "ملاحظة (اختياري)", receipt: "إيصال / مرفق (اختياري)", save: "حفظ", close: "إغلاق", uploading: "جاري الرفع"
    }
    : {
      title: "Record Expense", category: "Category", description: "Description", amount: "Amount (EGP)", date: "Date", vendor: "Vendor (optional)",
      reference: "Reference (optional)", note: "Note (optional)", receipt: "Receipt / attachment (optional)", save: "Save", close: "Close", uploading: "Uploading"
    };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const body = new FormData();
    body.set("category", category);
    body.set("description", description);
    body.set("amount", amount);
    body.set("expenseDate", expenseDate);
    body.set("vendor", vendor);
    body.set("reference", reference);
    body.set("note", note);
    if (file) body.set("attachment", file);
    try {
      await uploadRequest(`/projects/${projectId}/finance/expenses`, body, setProgress);
      onCreated();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !saving) onClose(); }}>
      <section className="design-dialog" role="dialog" aria-modal="true">
        <header>
          <div><span>{ar ? "المصروفات" : "EXPENSES"}</span><h2>{labels.title}</h2></div>
          <button type="button" className="icon-button" onClick={onClose} disabled={saving} aria-label={labels.close}><X size={20} /></button>
        </header>
        <form onSubmit={(event) => void submit(event)}>
          <fieldset disabled={saving}>
            <label className="ui-field">
              {labels.category}
              <select value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory)}>
                {EXPENSE_CATEGORIES.map((option) => (
                  <option key={option} value={option}>{expenseCategoryLabel(option, locale)}</option>
                ))}
              </select>
            </label>
            <label className="ui-field">{labels.amount}<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
            <label className="ui-field full-span">{labels.description}<input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={255} required autoFocus /></label>
            <label className="ui-field">{labels.date}<input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} required /></label>
            <label className="ui-field">{labels.vendor}<input value={vendor} onChange={(event) => setVendor(event.target.value)} maxLength={255} /></label>
            <label className="ui-field">{labels.reference}<input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={120} /></label>
            <label className="ui-field full-span">{labels.note}<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} /></label>
          </fieldset>
          <fieldset disabled={saving}>
            <legend>{labels.receipt}</legend>
            <div className="upload-dropzone" onClick={() => inputRef.current?.click()} role="button" tabIndex={0}>
              <FileText size={24} />
              <strong>{ar ? "اختر ملف الإيصال" : "Choose receipt file"}</strong>
              <span>PDF, PNG, JPG</span>
              <input ref={inputRef} type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} hidden />
            </div>
            {file && <div className="selected-file"><span><bdi>{file.name}</bdi></span><button type="button" onClick={() => setFile(null)}><X size={16} /></button></div>}
          </fieldset>
          {error && <div className="form-error">{error}</div>}
          {saving && <div className="upload-progress"><span>{labels.uploading} <bdi>{progress}%</bdi></span><div><i style={{ width: `${progress}%` }} /></div></div>}
          <footer>
            <button className="ui-button ui-button--secondary" type="button" onClick={onClose} disabled={saving}>{labels.close}</button>
            <button className="ui-button ui-button--accent" type="submit" disabled={saving}>{labels.save}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function VoidDialog({
  locale,
  record,
  onClose,
  onConfirm
}: {
  locale: "ar" | "en";
  record?: { title: string; amount: string; date: string; reference?: string | null };
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const ar = locale === "ar";
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const labels = ar
    ? { title: "إلغاء السجل المالي", reason: "سبب الإلغاء", confirm: "تأكيد الإلغاء", close: "إغلاق", record: "السجل", keepNote: "يبقى السجل محفوظاً في السجل المالي ويُستبعد من الإجماليات." }
    : { title: "Void Financial Record", reason: "Reason for voiding", confirm: "Confirm Void", close: "Close", record: "Record", keepNote: "The record stays in the ledger and is excluded from totals." };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!reason.trim()) return;
    setSaving(true);
    setError("");
    try {
      await onConfirm(reason.trim());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !saving) onClose(); }}>
      <section className="design-dialog design-dialog--compact" role="dialog" aria-modal="true">
        <header>
          <div><span>{ar ? "إجراء مالي" : "FINANCIAL ACTION"}</span><h2>{labels.title}</h2></div>
          <button type="button" className="icon-button" onClick={onClose} disabled={saving} aria-label={labels.close}><X size={20} /></button>
        </header>
        <form onSubmit={(event) => void submit(event)}>
          <fieldset disabled={saving}>
            {record && (
              <div className="finance-void-summary" aria-label={labels.record}>
                <strong>{record.title}</strong>
                <span className="mono"><bdi>{record.amount}</bdi></span>
                <span><bdi>{record.date}</bdi></span>
                {record.reference && <span className="finance-register__cell--muted">{record.reference}</span>}
              </div>
            )}
            <label className="ui-field full-span">{labels.reason}<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} required autoFocus /></label>
            <p className="finance-void-note">{labels.keepNote}</p>
          </fieldset>
          {error && <div className="form-error" role="alert">{error}</div>}
          <footer><button className="ui-button ui-button--accent" type="submit" disabled={saving || reason.trim() === ""}>{labels.confirm}</button></footer>
        </form>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Client payments (Admin/Accountant + Client-safe) */

function ClientPaymentsPanel({
  projectId,
  locale,
  currency,
  readOnly,
  summary,
  onChanged
}: {
  projectId: string;
  locale: "ar" | "en";
  currency: string;
  readOnly: boolean;
  summary?: FinanceSummary | null;
  onChanged?: () => void;
}) {
  const ar = locale === "ar";
  const user = useCurrentUser();
  const canExport = user.role === "ADMIN" || user.role === "ACCOUNTANT";
  const [payments, setPayments] = useState<ClientPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [voidTarget, setVoidTarget] = useState<ClientPaymentRecord | null>(null);

  const labels = ar
    ? {
      title: readOnly ? "سجل دفعاتي" : "دفعات العميل", lead: readOnly ? "سجل الدفعات والإيصالات المستلمة لهذا المشروع." : "سجل الدفعات الواردة من العميل مع الإيصالات.",
      add: "تسجيل دفعة", date: "التاريخ", method: "طريقة الدفع", reference: "المرجع", amount: "القيمة", status: "الحالة",
      actions: "الإجراء", empty: "لا توجد دفعات مسجلة", emptyHint: "سجل أول دفعة من العميل.", loading: "جاري تحميل الدفعات...",
      void: "إلغاء", receipt: "الإيصال", export: "تصدير المدفوعات",
      totalPaid: "إجمالي المحصل", outstanding: "المتبقي على العميل", overpaidShort: "دفع زيادة عن العقد", voided: (n: number) => `${n} ملغي`
    }
    : {
      title: readOnly ? "My Payment History" : "Client Payments", lead: readOnly ? "Payment and receipt history for this project." : "Incoming client payment ledger with receipts.",
      add: "Record Payment", date: "Date", method: "Method", reference: "Reference", amount: "Amount", status: "Status",
      actions: "Action", empty: "No payments recorded", emptyHint: "Record the first client payment.", loading: "Loading payments...",
      void: "Void", receipt: "Receipt", export: "Export payments",
      totalPaid: "Total collected", outstanding: "Outstanding balance", overpaidShort: "Paid above contract", voided: (n: number) => `${n} void`
    };

  const load = useCallback(() => {
    setLoading(true);
    apiRequest<ClientPaymentRecord[]>(`/projects/${projectId}/finance/client-payments`)
      .then((result) => {
        setPayments(result);
        setError("");
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState label={labels.loading} />;

  const cols = readOnly ? "100px minmax(120px,1fr) minmax(140px,1.4fr) 120px 100px 70px" : "100px minmax(120px,1fr) minmax(140px,1.4fr) 120px 100px 90px";

  return (
    <section>
      <div className="finance-panel-heading">
        <div>
          <span className="section-kicker">{ar ? "المدفوعات" : "PAYMENTS"}</span>
          <h2>{labels.title}</h2>
          <p>{labels.lead}</p>
        </div>
        <div className="finance-panel-heading__actions">
          {canExport && (
            <a className="ui-button ui-button--ghost ui-button--sm" href={dataOpsExportUrl("payments", "xlsx", projectId)}>
              <Download size={14} /> {labels.export}
            </a>
          )}
          {!readOnly && (
            <button className="ui-button ui-button--accent" type="button" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> {labels.add}
            </button>
          )}
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {payments.length === 0 && <EmptyState icon={<Banknote size={20} />} title={labels.empty} description={!readOnly ? labels.emptyHint : undefined} />}

      {summary && payments.length > 0 && (
        <div className="finance-register-meta">
          <span>{labels.totalPaid}: <bdi className="mono">{money(summary.clientPaymentsTotal, currency, locale)}</bdi></span>
          {summary.outstandingBalance !== null && (
            <span className={isOverpaid(summary.outstandingBalance) ? "finance-register-meta__voided" : ""}>
              {isOverpaid(summary.outstandingBalance) ? labels.overpaidShort : labels.outstanding}: <bdi className="mono">{money(summary.outstandingBalance, currency, locale)}</bdi>
            </span>
          )}
          {(() => {
            const voidedCount = payments.filter((payment) => payment.status === "VOID").length;
            return voidedCount > 0 ? <span className="finance-register-meta__voided">{labels.voided(voidedCount)}</span> : null;
          })()}
        </div>
      )}

      {payments.length > 0 && (
        <div className="finance-register" style={{ "--finance-cols": cols } as React.CSSProperties}>
          <div className="finance-register__head">
            <span>{labels.date}</span>
            <span>{labels.method}</span>
            <span>{labels.reference}</span>
            <span>{labels.amount}</span>
            <span>{labels.status}</span>
            <span>{labels.actions}</span>
          </div>
          {payments.map((payment) => (
            <div className={`finance-register__row ${payment.status === "VOID" ? "finance-void-row" : ""}`} key={payment.id}>
              <span className="finance-register__cell" data-label={labels.date}>{dateOnly(payment.paymentDate, locale)}</span>
              <span className="finance-register__cell" data-label={labels.method}>{paymentMethodLabel(payment.method, locale)}</span>
              <div className="finance-register__identity" data-label={labels.reference}>
                <strong>{payment.reference ?? "—"}</strong>
                {payment.description && <span className="finance-register__cell--muted">{payment.description}</span>}
                {payment.status === "VOID" && payment.voidReason && <span className="finance-void-reason">{ar ? "سبب الإلغاء" : "Void reason"}: {payment.voidReason}</span>}
              </div>
              <span className="finance-register__cell finance-register__cell--amount" data-label={labels.amount}>{money(payment.amount, currency, locale)}</span>
              <span className="finance-register__cell" data-label={labels.status}><Badge tone={financialStatusTone(payment.status)}>{financialStatusLabel(payment.status, locale)}</Badge></span>
              <div className="finance-register__actions">
                {payment.attachments[0] && (
                  <a className="icon-button" href={financeAttachmentUrl(projectId, "client-payments", payment.id, payment.attachments[0].id)} target="_blank" rel="noreferrer" aria-label={labels.receipt}>
                    <Receipt size={15} />
                  </a>
                )}
                {!readOnly && payment.status === "ACTIVE" && (
                  <button className="icon-button" type="button" onClick={() => setVoidTarget(payment)} aria-label={labels.void}><Trash2 size={15} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <ClientPaymentDialog
          projectId={projectId}
          locale={locale}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
            onChanged?.();
          }}
        />
      )}

      {voidTarget && (
        <VoidDialog
          locale={locale}
          record={{
            title: paymentMethodLabel(voidTarget.method, locale),
            amount: money(voidTarget.amount, currency, locale),
            date: dateOnly(voidTarget.paymentDate, locale),
            reference: voidTarget.reference
          }}
          onClose={() => setVoidTarget(null)}
          onConfirm={async (reason) => {
            await apiRequest(`/projects/${projectId}/finance/client-payments/${voidTarget.id}/void`, { method: "POST", body: JSON.stringify({ reason }) });
            setVoidTarget(null);
            load();
            onChanged?.();
          }}
        />
      )}
    </section>
  );
}

function ClientPaymentDialog({ projectId, locale, onClose, onCreated }: { projectId: string; locale: "ar" | "en"; onClose: () => void; onCreated: () => void }) {
  const ar = locale === "ar";
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const labels = ar
    ? {
      title: "تسجيل دفعة عميل", amount: "القيمة (ج.م)", date: "تاريخ الدفع", method: "طريقة الدفع", reference: "رقم الإيصال / المرجع",
      description: "ملاحظة (اختياري)", receipt: "الإيصال (اختياري)", save: "حفظ", close: "إغلاق", uploading: "جاري الرفع"
    }
    : {
      title: "Record Client Payment", amount: "Amount (EGP)", date: "Payment date", method: "Payment method", reference: "Receipt / reference number",
      description: "Note (optional)", receipt: "Receipt (optional)", save: "Save", close: "Close", uploading: "Uploading"
    };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const body = new FormData();
    body.set("amount", amount);
    body.set("paymentDate", paymentDate);
    body.set("method", method);
    body.set("reference", reference);
    body.set("description", description);
    if (file) body.set("attachment", file);
    try {
      await uploadRequest(`/projects/${projectId}/finance/client-payments`, body, setProgress);
      onCreated();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !saving) onClose(); }}>
      <section className="design-dialog" role="dialog" aria-modal="true">
        <header>
          <div><span>{ar ? "دفعات العميل" : "CLIENT PAYMENTS"}</span><h2>{labels.title}</h2></div>
          <button type="button" className="icon-button" onClick={onClose} disabled={saving} aria-label={labels.close}><X size={20} /></button>
        </header>
        <form onSubmit={(event) => void submit(event)}>
          <fieldset disabled={saving}>
            <label className="ui-field">{labels.amount}<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required autoFocus /></label>
            <label className="ui-field">{labels.date}<input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required /></label>
            <label className="ui-field">
              {labels.method}
              <select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map((option) => (
                  <option key={option} value={option}>{paymentMethodLabel(option, locale)}</option>
                ))}
              </select>
            </label>
            <label className="ui-field">{labels.reference}<input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={120} /></label>
            <label className="ui-field full-span">{labels.description}<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} /></label>
          </fieldset>
          <fieldset disabled={saving}>
            <legend>{labels.receipt}</legend>
            <div className="upload-dropzone" onClick={() => inputRef.current?.click()} role="button" tabIndex={0}>
              <Receipt size={24} />
              <strong>{ar ? "اختر ملف الإيصال" : "Choose receipt file"}</strong>
              <span>PDF, PNG, JPG</span>
              <input ref={inputRef} type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} hidden />
            </div>
            {file && <div className="selected-file"><span><bdi>{file.name}</bdi></span><button type="button" onClick={() => setFile(null)}><X size={16} /></button></div>}
          </fieldset>
          {error && <div className="form-error">{error}</div>}
          {saving && <div className="upload-progress"><span>{labels.uploading} <bdi>{progress}%</bdi></span><div><i style={{ width: `${progress}%` }} /></div></div>}
          <footer>
            <button className="ui-button ui-button--secondary" type="button" onClick={onClose} disabled={saving}>{labels.close}</button>
            <button className="ui-button ui-button--accent" type="submit" disabled={saving}>{labels.save}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Contractor payments */

function ContractorPaymentsPanel({
  projectId,
  locale,
  currency,
  onChanged
}: {
  projectId: string;
  locale: "ar" | "en";
  currency: string;
  onChanged: () => void;
}) {
  const ar = locale === "ar";
  const [payments, setPayments] = useState<ContractorPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [voidTarget, setVoidTarget] = useState<ContractorPaymentRecord | null>(null);

  const labels = ar
    ? {
      title: "دفعات المقاولين", lead: "سجل داخلي لدفعات المقاولين والمقاولين الفرعيين - لا يظهر للعميل.", add: "تسجيل دفعة",
      date: "التاريخ", payee: "المستفيد", method: "طريقة الدفع", amount: "القيمة", status: "الحالة", actions: "الإجراء",
      empty: "لا توجد دفعات مسجلة", emptyHint: "سجل أول دفعة لمقاول.", loading: "جاري تحميل الدفعات...", void: "إلغاء", receipt: "الإيصال",
      activeTotal: "إجمالي الدفعات الفعالة", voided: (n: number) => `${n} ملغي`
    }
    : {
      title: "Contractor Payments", lead: "Internal outgoing ledger for contractors/subcontractors - never shown to the Client.", add: "Record Payment",
      date: "Date", payee: "Payee", method: "Method", amount: "Amount", status: "Status", actions: "Action",
      empty: "No payments recorded", emptyHint: "Record the first contractor payment.", loading: "Loading payments...", void: "Void", receipt: "Receipt",
      activeTotal: "Active payments total", voided: (n: number) => `${n} void`
    };

  const load = useCallback(() => {
    setLoading(true);
    apiRequest<ContractorPaymentRecord[]>(`/projects/${projectId}/finance/contractor-payments`)
      .then((result) => {
        setPayments(result);
        setError("");
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState label={labels.loading} />;

  const cols = "100px minmax(140px,1.2fr) minmax(120px,1fr) 120px 100px 90px";

  return (
    <section>
      <div className="finance-panel-heading">
        <div>
          <span className="section-kicker">{ar ? "مدفوعات خارجية" : "OUTGOING LEDGER"}</span>
          <h2>{labels.title}</h2>
          <p>{labels.lead}</p>
        </div>
        <button className="ui-button ui-button--accent" type="button" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> {labels.add}
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {payments.length === 0 && <EmptyState icon={<Landmark size={20} />} title={labels.empty} description={labels.emptyHint} />}

      {payments.length > 0 && (() => {
        const voidedCount = payments.filter((payment) => payment.status === "VOID").length;
        const activeTotal = formatMoneyMajor(sumAmountMinor(payments.filter((payment) => payment.status === "ACTIVE").map((payment) => payment.amount)));
        return (
          <div className="finance-register-meta">
            <span>{labels.activeTotal}: <bdi className="mono">{money(activeTotal, currency, locale)}</bdi></span>
            {voidedCount > 0 && <span className="finance-register-meta__voided">{labels.voided(voidedCount)}</span>}
          </div>
        );
      })()}

      {payments.length > 0 && (
        <div className="finance-register" style={{ "--finance-cols": cols } as React.CSSProperties}>
          <div className="finance-register__head">
            <span>{labels.date}</span>
            <span>{labels.payee}</span>
            <span>{labels.method}</span>
            <span>{labels.amount}</span>
            <span>{labels.status}</span>
            <span>{labels.actions}</span>
          </div>
          {payments.map((payment) => (
            <div className={`finance-register__row ${payment.status === "VOID" ? "finance-void-row" : ""}`} key={payment.id}>
              <span className="finance-register__cell" data-label={labels.date}>{dateOnly(payment.paymentDate, locale)}</span>
              <div className="finance-register__identity" data-label={labels.payee}>
                <strong>{payment.payee}</strong>
                {payment.category && <span className="finance-register__cell--muted">{expenseCategoryLabel(payment.category, locale)}</span>}
                {payment.status === "VOID" && payment.voidReason && <span className="finance-void-reason">{ar ? "سبب الإلغاء" : "Void reason"}: {payment.voidReason}</span>}
              </div>
              <span className="finance-register__cell" data-label={labels.method}>{paymentMethodLabel(payment.method, locale)}</span>
              <span className="finance-register__cell finance-register__cell--amount" data-label={labels.amount}>{money(payment.amount, currency, locale)}</span>
              <span className="finance-register__cell" data-label={labels.status}><Badge tone={financialStatusTone(payment.status)}>{financialStatusLabel(payment.status, locale)}</Badge></span>
              <div className="finance-register__actions">
                {payment.attachments[0] && (
                  <a className="icon-button" href={financeAttachmentUrl(projectId, "contractor-payments", payment.id, payment.attachments[0].id)} target="_blank" rel="noreferrer" aria-label={labels.receipt}>
                    <Receipt size={15} />
                  </a>
                )}
                {payment.status === "ACTIVE" && (
                  <button className="icon-button" type="button" onClick={() => setVoidTarget(payment)} aria-label={labels.void}><Trash2 size={15} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <ContractorPaymentDialog
          projectId={projectId}
          locale={locale}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
            onChanged();
          }}
        />
      )}

      {voidTarget && (
        <VoidDialog
          locale={locale}
          record={{
            title: voidTarget.payee,
            amount: money(voidTarget.amount, currency, locale),
            date: dateOnly(voidTarget.paymentDate, locale),
            reference: voidTarget.reference
          }}
          onClose={() => setVoidTarget(null)}
          onConfirm={async (reason) => {
            await apiRequest(`/projects/${projectId}/finance/contractor-payments/${voidTarget.id}/void`, { method: "POST", body: JSON.stringify({ reason }) });
            setVoidTarget(null);
            load();
            onChanged();
          }}
        />
      )}
    </section>
  );
}

function ContractorPaymentDialog({ projectId, locale, onClose, onCreated }: { projectId: string; locale: "ar" | "en"; onClose: () => void; onCreated: () => void }) {
  const ar = locale === "ar";
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [category, setCategory] = useState<ExpenseCategory | "">("SUBCONTRACTOR");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const labels = ar
    ? {
      title: "تسجيل دفعة لمقاول", payee: "اسم المقاول / المستفيد", amount: "القيمة (ج.م)", date: "تاريخ الدفع", method: "طريقة الدفع",
      category: "الفئة (اختياري)", none: "بدون تصنيف", reference: "المرجع (اختياري)", description: "ملاحظة (اختياري)",
      receipt: "الإيصال (اختياري)", save: "حفظ", close: "إغلاق", uploading: "جاري الرفع"
    }
    : {
      title: "Record Contractor Payment", payee: "Contractor / payee name", amount: "Amount (EGP)", date: "Payment date", method: "Payment method",
      category: "Category (optional)", none: "Uncategorized", reference: "Reference (optional)", description: "Note (optional)",
      receipt: "Receipt (optional)", save: "Save", close: "Close", uploading: "Uploading"
    };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const body = new FormData();
    body.set("payee", payee);
    body.set("amount", amount);
    body.set("paymentDate", paymentDate);
    body.set("method", method);
    if (category) body.set("category", category);
    body.set("reference", reference);
    body.set("description", description);
    if (file) body.set("attachment", file);
    try {
      await uploadRequest(`/projects/${projectId}/finance/contractor-payments`, body, setProgress);
      onCreated();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !saving) onClose(); }}>
      <section className="design-dialog" role="dialog" aria-modal="true">
        <header>
          <div><span>{ar ? "دفعات المقاولين" : "CONTRACTOR PAYMENTS"}</span><h2>{labels.title}</h2></div>
          <button type="button" className="icon-button" onClick={onClose} disabled={saving} aria-label={labels.close}><X size={20} /></button>
        </header>
        <form onSubmit={(event) => void submit(event)}>
          <fieldset disabled={saving}>
            <label className="ui-field full-span">{labels.payee}<input value={payee} onChange={(event) => setPayee(event.target.value)} maxLength={255} required autoFocus /></label>
            <label className="ui-field">{labels.amount}<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
            <label className="ui-field">{labels.date}<input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required /></label>
            <label className="ui-field">
              {labels.method}
              <select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map((option) => (
                  <option key={option} value={option}>{paymentMethodLabel(option, locale)}</option>
                ))}
              </select>
            </label>
            <label className="ui-field">
              {labels.category}
              <select value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory | "")}>
                <option value="">{labels.none}</option>
                {EXPENSE_CATEGORIES.map((option) => (
                  <option key={option} value={option}>{expenseCategoryLabel(option, locale)}</option>
                ))}
              </select>
            </label>
            <label className="ui-field">{labels.reference}<input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={120} /></label>
            <label className="ui-field full-span">{labels.description}<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} /></label>
          </fieldset>
          <fieldset disabled={saving}>
            <legend>{labels.receipt}</legend>
            <div className="upload-dropzone" onClick={() => inputRef.current?.click()} role="button" tabIndex={0}>
              <Receipt size={24} />
              <strong>{ar ? "اختر ملف الإيصال" : "Choose receipt file"}</strong>
              <span>PDF, PNG, JPG</span>
              <input ref={inputRef} type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} hidden />
            </div>
            {file && <div className="selected-file"><span><bdi>{file.name}</bdi></span><button type="button" onClick={() => setFile(null)}><X size={16} /></button></div>}
          </fieldset>
          {error && <div className="form-error">{error}</div>}
          {saving && <div className="upload-progress"><span>{labels.uploading} <bdi>{progress}%</bdi></span><div><i style={{ width: `${progress}%` }} /></div></div>}
          <footer>
            <button className="ui-button ui-button--secondary" type="button" onClick={onClose} disabled={saving}>{labels.close}</button>
            <button className="ui-button ui-button--accent" type="submit" disabled={saving}>{labels.save}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ History */

function HistoryPanel({ projectId, locale }: { projectId: string; locale: "ar" | "en" }) {
  const ar = locale === "ar";
  const [events, setEvents] = useState<FinanceHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const labels = ar
    ? { title: "السجل المالي", lead: "سجل تدقيق كامل لكل تغيير مالي مهم في هذا المشروع.", empty: "لا يوجد سجل مالي بعد", loading: "جاري تحميل السجل..." }
    : { title: "Financial History", lead: "A complete audit trail of every meaningful financial change on this project.", empty: "No financial history yet", loading: "Loading history..." };

  useEffect(() => {
    let alive = true;
    apiRequest<FinanceHistoryEvent[]>(`/projects/${projectId}/finance/history`)
      .then((result) => {
        if (alive) setEvents(result);
      })
      .catch((requestError: Error) => {
        if (alive) setError(requestError.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [projectId]);

  if (loading) return <LoadingState label={labels.loading} />;

  return (
    <section>
      <div className="finance-panel-heading">
        <div>
          <span className="section-kicker">{ar ? "تدقيق مالي" : "AUDIT TRAIL"}</span>
          <h2>{labels.title}</h2>
          <p>{labels.lead}</p>
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
      {events.length === 0 && <EmptyState icon={<HistoryIcon size={20} />} title={labels.empty} />}
      {events.length > 0 && (
        <div className="finance-history-list">
          {events.map((event) => {
            const context = historyContext(event, locale);
            return (
              <div className="finance-history-row" key={event.id}>
                <div className="finance-history-row__action">
                  <strong>{financeActionLabel(event.action, locale)}</strong>
                  {context && <small>{context}</small>}
                </div>
                <div className="finance-history-row__actor">
                  <strong>{event.actor?.displayName ?? (ar ? "النظام" : "System")}</strong>
                  {event.actor && <small>{roleLabel(event.actor.role as UserRole, locale)}</small>}
                </div>
                <time><bdi>{formatAppDate(event.createdAt, locale, true)}</bdi></time>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ Engineer (BOQ read-only) */

function EngineerBoqPanel({ projectId, locale }: { projectId: string; locale: "ar" | "en" }) {
  return <BoqPanel projectId={projectId} locale={locale} readOnly />;
}

/* ------------------------------------------------------------------ Client (safe summary + own payments) */

function ClientFinancePanel({ projectId, locale }: { projectId: string; locale: "ar" | "en" }) {
  const ar = locale === "ar";
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [error, setError] = useState("");

  const labels = ar
    ? {
      title: "الملخص المالي", lead: "نظرة موجزة وآمنة على الحالة المالية لمشروعك.", agreed: "القيمة المتفق عليها",
      paid: "المدفوع حتى الآن", outstanding: "الرصيد المتبقي", notSet: "لم يتم تحديدها بعد", overpaidNote: "تم دفع كامل القيمة المتفق عليها وأكثر."
    }
    : {
      title: "Financial Summary", lead: "A clear, safe overview of your project's financial status.", agreed: "Agreed Amount",
      paid: "Paid So Far", outstanding: "Outstanding Balance", notSet: "Not set yet", overpaidNote: "The full agreed amount has been paid and exceeded."
    };

  useEffect(() => {
    let alive = true;
    apiRequest<FinanceSummary>(`/projects/${projectId}/finance/summary`)
      .then((result) => {
        if (alive) setSummary(result);
      })
      .catch((requestError: Error) => {
        if (alive) setError(requestError.message);
      });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const currency = summary?.currency ?? "EGP";
  const overpaid = isOverpaid(summary?.outstandingBalance ?? null);

  return (
    <>
      <section className="finance-summary-command finance-client-summary">
        <div className="finance-panel-heading">
          <div>
            <span className="section-kicker">{ar ? "ملخصك المالي" : "YOUR FINANCIAL SUMMARY"}</span>
            <h2>{labels.title}</h2>
            <p>{labels.lead}</p>
          </div>
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="finance-kpi-grid">
          <MetricCard tone="navy" icon={<Landmark size={18} />} label={labels.agreed} value={summary?.contractValue ? money(summary.contractValue, currency, locale) : labels.notSet} />
          <MetricCard tone="success" icon={<Banknote size={18} />} label={labels.paid} value={money(summary?.paidAmount, currency, locale)} />
          <MetricCard
            tone={overpaid ? "success" : "navy"}
            icon={<Wallet size={18} />}
            label={labels.outstanding}
            value={summary?.outstandingBalance !== null && summary?.outstandingBalance !== undefined ? money(summary.outstandingBalance, currency, locale) : labels.notSet}
            hint={overpaid ? labels.overpaidNote : undefined}
          />
        </div>
      </section>
      <ClientPaymentsPanel projectId={projectId} locale={locale} currency={currency} readOnly />
    </>
  );
}
