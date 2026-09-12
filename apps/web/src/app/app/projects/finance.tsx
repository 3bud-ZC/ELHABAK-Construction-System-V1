"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, EmptyState, LoadingState, MetricCard } from "@elhabak/ui";
import {
  Banknote,
  ClipboardList,
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
import { ProjectWorkspace } from "../../../components/project-workspace";
import {
  apiRequest,
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
  type PaymentMethod
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
    <section className="app-page project-workspace-page">
      <ProjectWorkspace project={context} locale={locale} role={user.role} active="finance" />
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

function dateOnly(iso: string, locale: "ar" | "en") {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium" }).format(new Date(iso));
}

function isOverpaid(outstanding: string | null) {
  return Boolean(outstanding && outstanding.trim().startsWith("-"));
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
      <nav className="finance-subtabs" aria-label={ar ? "أقسام الشؤون المالية" : "Finance sections"}>
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
      {tab === "client-payments" && <ClientPaymentsPanel projectId={projectId} locale={locale} currency={summary?.currency ?? "EGP"} readOnly={false} onChanged={loadSummary} />}
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
      contractorPayments: "دفعات المقاولين", committed: "إجمالي التكلفة الفعلية (مصروفات + مقاولين)", notSet: "غير محدد بعد"
    }
    : {
      title: "Project Financial Summary", lead: "Real figures calculated from actually persisted financial records.",
      setContract: "Set Contract Value", contractValue: "Contract Value", boqTotal: "BOQ Total",
      estimateTotal: "Current Estimate Total", clientPayments: "Client Payments Received", outstanding: "Client Outstanding Balance",
      overpaidNote: "Warning: the client has paid more than the agreed contract value.", expenses: "Internal Expenses Total",
      contractorPayments: "Contractor Payments", committed: "Committed Actual Cost (expenses + contractors)", notSet: "Not set yet"
    };

  return (
    <section className="finance-summary-panel">
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

      <div className="finance-kpi-grid">
        <MetricCard tone="navy" icon={<Landmark size={18} />} label={labels.contractValue} value={summary?.contractValue ? money(summary.contractValue, currency, locale) : labels.notSet} />
        <MetricCard tone="orange" icon={<ClipboardList size={18} />} label={labels.boqTotal} value={money(summary?.boqTotal, currency, locale)} />
        <MetricCard tone="orange" icon={<FileText size={18} />} label={labels.estimateTotal} value={money(summary?.estimateTotal, currency, locale)} />
        <MetricCard tone="success" icon={<Banknote size={18} />} label={labels.clientPayments} value={money(summary?.clientPaymentsTotal, currency, locale)} />
        <MetricCard
          tone={overpaid ? "danger" : "navy"}
          icon={<Wallet size={18} />}
          label={labels.outstanding}
          value={summary?.outstandingBalance !== null && summary?.outstandingBalance !== undefined ? money(summary.outstandingBalance, currency, locale) : labels.notSet}
          hint={overpaid ? labels.overpaidNote : undefined}
        />
        <MetricCard tone="danger" icon={<Receipt size={18} />} label={labels.expenses} value={money(summary?.expensesTotal, currency, locale)} />
        <MetricCard tone="danger" icon={<Landmark size={18} />} label={labels.contractorPayments} value={money(summary?.contractorPaymentsTotal, currency, locale)} />
        <MetricCard tone="navy" icon={<Wallet size={18} />} label={labels.committed} value={money(summary?.committedCostTotal, currency, locale)} />
      </div>

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

  const labels = ar
    ? {
      title: "المقايسة التقريبية", lead: "مستند العمل الحالي لتقدير التكلفة الأولية للمشروع.",
      create: "إنشاء مقايسة", newVersion: "إصدار نسخة جديدة", addItem: "إضافة بند", empty: "لا توجد مقايسة مسجلة",
      emptyHint: "ابدأ بإنشاء أول مقايسة تقريبية لهذا المشروع.", description: "الوصف", unit: "الوحدة", quantity: "الكمية",
      unitRate: "سعر الوحدة", total: "الإجمالي", actions: "الإجراء", version: "نسخة", finalized: "نسخة سابقة (نهائية)",
      current: "النسخة الحالية", loading: "جاري تحميل المقايسة...", removeConfirm: "هل تريد حذف هذا البند؟", noItems: "لا توجد بنود في هذه المقايسة بعد."
    }
    : {
      title: "Preliminary Estimation", lead: "The current working document for the project's preliminary cost estimate.",
      create: "Create Estimate", newVersion: "New Version", addItem: "Add Item", empty: "No estimate recorded",
      emptyHint: "Start by creating the first preliminary estimate for this project.", description: "Description", unit: "Unit", quantity: "Quantity",
      unitRate: "Unit Rate", total: "Total", actions: "Action", version: "version", finalized: "Previous version (finalized)",
      current: "Current version", loading: "Loading estimate...", removeConfirm: "Remove this item?", noItems: "No items in this estimate yet."
    };

  const load = useCallback(() => {
    setLoading(true);
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
    await apiRequest(`/projects/${projectId}/finance/estimates/${current.id}/new-version`, { method: "POST", body: "{}" });
    load();
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
            <button className="ui-button ui-button--secondary" type="button" onClick={() => void newVersion()}>{labels.newVersion}</button>
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
          <div className="finance-totals-strip">
            <span><small>{ar ? "العنوان" : "Title"}</small><strong>{current.title}</strong></span>
            <span><small>{ar ? "الإصدار" : "Version"}</small><strong>{labels.version} {current.version}</strong></span>
            <span><small>{labels.total}</small><strong>{money(current.total, "EGP", locale)}</strong></span>
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
            <div style={{ marginTop: "1.2rem" }}>
              <span className="section-kicker">{ar ? "نسخ سابقة" : "PREVIOUS VERSIONS"}</span>
              {history
                .map((estimate) => (
                  <div className="finance-totals-strip" key={estimate.id} style={{ marginTop: "0.5rem" }}>
                    <span><small>{labels.version}</small><strong>{estimate.version}</strong></span>
                    <span><small>{labels.total}</small><strong>{money(estimate.total, "EGP", locale)}</strong></span>
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
        />
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
          <span className="finance-register__cell finance-register__cell--amount" data-label={labels.quantity}>{item.quantity}</span>
          <span className="finance-register__cell finance-register__cell--amount" data-label={labels.unitRate}>{item.unitRate}</span>
          <span className="finance-register__cell finance-register__cell--amount" data-label={labels.total}>{item.lineTotal}</span>
          <div className="finance-register__actions">
            <button className="icon-button" type="button" onClick={() => onEdit(item)} aria-label="Edit"><Pencil size={15} /></button>
            <button className="icon-button" type="button" onClick={() => onRemove(item)} aria-label="Delete"><Trash2 size={15} /></button>
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
  onClose,
  onSaved
}: {
  mode: "estimate" | "boq";
  projectId: string;
  parentId: string;
  locale: "ar" | "en";
  item: (LineItemLike & { code?: string; section?: string | null }) | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ar = locale === "ar";
  const [code, setCode] = useState(item?.code ?? "");
  const [section, setSection] = useState(item?.section ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [unit, setUnit] = useState<BoqUnit>(item?.unit ?? "M2");
  const [quantity, setQuantity] = useState(item?.quantity ?? "");
  const [unitRate, setUnitRate] = useState(item?.unitRate ?? "");
  const [note, setNote] = useState(item?.note ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const labels = ar
    ? {
      title: item ? "تعديل بند" : "إضافة بند", code: "الكود", section: "القسم / التصنيف", description: "الوصف",
      unit: "الوحدة", quantity: "الكمية", unitRate: "سعر الوحدة", note: "ملاحظة (اختياري)", save: "حفظ", close: "إغلاق"
    }
    : {
      title: item ? "Edit item" : "Add item", code: "Code", section: "Section / category", description: "Description",
      unit: "Unit", quantity: "Quantity", unitRate: "Unit rate", note: "Note (optional)", save: "Save", close: "Close"
    };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const body: Record<string, unknown> = { description, unit, quantity, unitRate, note };
    if (mode === "boq") {
      body.code = code;
      body.section = section;
    }
    const basePath = mode === "boq" ? `/projects/${projectId}/finance/boq` : `/projects/${projectId}/finance/estimates/${parentId}/items`;
    const path = item ? `${basePath}/${item.id}` : basePath;
    const method = item ? "PATCH" : "POST";
    try {
      await apiRequest(path, { method, body: JSON.stringify(body) });
      onSaved();
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
        <form onSubmit={(event) => void submit(event)}>
          <fieldset disabled={saving}>
            {mode === "boq" && (
              <>
                <label className="ui-field">{labels.code}<input value={code} onChange={(event) => setCode(event.target.value)} maxLength={40} required /></label>
                <label className="ui-field">{labels.section}<input value={section ?? ""} onChange={(event) => setSection(event.target.value)} maxLength={120} /></label>
              </>
            )}
            <label className="ui-field full-span">{labels.description}<input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} required /></label>
            <label className="ui-field">
              {labels.unit}
              <select value={unit} onChange={(event) => setUnit(event.target.value as BoqUnit)}>
                {BOQ_UNITS.map((option) => (
                  <option key={option} value={option}>{boqUnitLabel(option, locale)}</option>
                ))}
              </select>
            </label>
            <label className="ui-field">{labels.quantity}<input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></label>
            <label className="ui-field">{labels.unitRate}<input inputMode="decimal" value={unitRate} onChange={(event) => setUnitRate(event.target.value)} required /></label>
            <label className="ui-field full-span">{labels.note}<textarea value={note ?? ""} onChange={(event) => setNote(event.target.value)} maxLength={1000} /></label>
          </fieldset>
          {error && <div className="form-error">{error}</div>}
          <footer><button className="ui-button ui-button--accent" type="submit" disabled={saving}>{labels.save}</button></footer>
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
  const [showDialog, setShowDialog] = useState<{ item?: BoqItemRecord } | null>(null);

  const labels = ar
    ? {
      title: "جدول الكميات (BOQ)", lead: "سجل هندسي كثيف لبنود الكميات والأسعار والإجماليات المعتمدة.",
      addItem: "إضافة بند", code: "الكود", description: "الوصف", unit: "الوحدة", quantity: "الكمية", unitRate: "سعر الوحدة",
      total: "الإجمالي", actions: "الإجراء", empty: "لا توجد بنود في جدول الكميات", emptyHint: "ابدأ بإضافة أول بند.",
      overall: "الإجمالي الكلي", loading: "جاري تحميل جدول الكميات...", removeConfirm: "هل تريد حذف هذا البند؟", section: "القسم"
    }
    : {
      title: "Bill of Quantities (BOQ)", lead: "Dense engineering register of quantities, rates, and approved totals.",
      addItem: "Add Item", code: "Code", description: "Description", unit: "Unit", quantity: "Quantity", unitRate: "Unit Rate",
      total: "Total", actions: "Action", empty: "No BOQ items registered", emptyHint: "Start by adding the first item.",
      overall: "Overall Total", loading: "Loading BOQ...", removeConfirm: "Remove this item?", section: "Section"
    };

  const load = useCallback(() => {
    setLoading(true);
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

  if (loading) return <LoadingState label={labels.loading} />;

  const cols = "minmax(160px,1.6fr) minmax(130px,1fr) 90px 90px 110px 120px" + (readOnly ? "" : " 80px");

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
          <div className="finance-totals-strip">
            <span><small>{labels.overall}</small><strong>{money(data.overallTotal, "EGP", locale)}</strong></span>
            {data.sectionTotals.map((entry) => (
              <span key={entry.section ?? "none"}><small>{entry.section ?? labels.section}</small><strong>{money(entry.total, "EGP", locale)}</strong></span>
            ))}
          </div>

          <div className="finance-register" style={{ "--finance-cols": cols } as React.CSSProperties}>
            <div className="finance-register__head">
              <span>{labels.description}</span>
              <span>{labels.section}</span>
              <span>{labels.unit}</span>
              <span>{labels.quantity}</span>
              <span>{labels.unitRate}</span>
              <span>{labels.total}</span>
              {!readOnly && <span>{labels.actions}</span>}
            </div>
            {data.items.map((item) => (
              <div className="finance-register__row" key={item.id}>
                <div className="finance-register__identity" data-label={labels.description}>
                  <span className="mono" style={{ fontSize: "0.68rem", color: "var(--muted)" }}>{item.code}</span>
                  <strong>{item.description}</strong>
                </div>
                <span className="finance-register__cell finance-register__cell--muted" data-label={labels.section}>{item.section ?? "—"}</span>
                <span className="finance-register__cell" data-label={labels.unit}>{boqUnitLabel(item.unit, locale)}</span>
                <span className="finance-register__cell finance-register__cell--amount" data-label={labels.quantity}>{item.quantity}</span>
                <span className="finance-register__cell finance-register__cell--amount" data-label={labels.unitRate}>{item.unitRate}</span>
                <span className="finance-register__cell finance-register__cell--amount" data-label={labels.total}>{item.lineTotal}</span>
                {!readOnly && (
                  <div className="finance-register__actions">
                    <button className="icon-button" type="button" onClick={() => setShowDialog({ item })} aria-label="Edit"><Pencil size={15} /></button>
                    <button className="icon-button" type="button" onClick={() => void removeItem(item.id)} aria-label="Delete"><Trash2 size={15} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {showDialog && (
        <LineItemDialog
          mode="boq"
          projectId={projectId}
          parentId=""
          locale={locale}
          item={showDialog.item}
          onClose={() => setShowDialog(null)}
          onSaved={() => {
            setShowDialog(null);
            load();
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
      loading: "جاري تحميل المصروفات...", void: "إلغاء", receipt: "إيصال"
    }
    : {
      title: "Internal Expenses", lead: "Internal expense ledger - never shown to the Client.", add: "Record Expense",
      allCategories: "All Categories", date: "Date", category: "Category", description: "Description", vendor: "Vendor", amount: "Amount",
      status: "Status", actions: "Action", empty: "No expenses recorded", emptyHint: "Record the first expense for this project.",
      loading: "Loading expenses...", void: "Void", receipt: "Receipt"
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
            <label className="ui-field full-span">{labels.description}<input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={255} required /></label>
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
          <footer><button className="ui-button ui-button--accent" type="submit" disabled={saving}>{labels.save}</button></footer>
        </form>
      </section>
    </div>
  );
}

function VoidDialog({ locale, onClose, onConfirm }: { locale: "ar" | "en"; onClose: () => void; onConfirm: (reason: string) => Promise<void> }) {
  const ar = locale === "ar";
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const labels = ar
    ? { title: "إلغاء السجل المالي", reason: "سبب الإلغاء", confirm: "تأكيد الإلغاء", close: "إغلاق" }
    : { title: "Void Financial Record", reason: "Reason for voiding", confirm: "Confirm Void", close: "Close" };

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
            <label className="ui-field full-span">{labels.reason}<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} required autoFocus /></label>
          </fieldset>
          {error && <div className="form-error">{error}</div>}
          <footer><button className="ui-button ui-button--accent" type="submit" disabled={saving}>{labels.confirm}</button></footer>
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
  onChanged
}: {
  projectId: string;
  locale: "ar" | "en";
  currency: string;
  readOnly: boolean;
  onChanged?: () => void;
}) {
  const ar = locale === "ar";
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
      void: "إلغاء", receipt: "الإيصال"
    }
    : {
      title: readOnly ? "My Payment History" : "Client Payments", lead: readOnly ? "Payment and receipt history for this project." : "Incoming client payment ledger with receipts.",
      add: "Record Payment", date: "Date", method: "Method", reference: "Reference", amount: "Amount", status: "Status",
      actions: "Action", empty: "No payments recorded", emptyHint: "Record the first client payment.", loading: "Loading payments...",
      void: "Void", receipt: "Receipt"
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
        {!readOnly && (
          <button className="ui-button ui-button--accent" type="button" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> {labels.add}
          </button>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      {payments.length === 0 && <EmptyState icon={<Banknote size={20} />} title={labels.empty} description={!readOnly ? labels.emptyHint : undefined} />}

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
          <footer><button className="ui-button ui-button--accent" type="submit" disabled={saving}>{labels.save}</button></footer>
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
      empty: "لا توجد دفعات مسجلة", emptyHint: "سجل أول دفعة لمقاول.", loading: "جاري تحميل الدفعات...", void: "إلغاء", receipt: "الإيصال"
    }
    : {
      title: "Contractor Payments", lead: "Internal outgoing ledger for contractors/subcontractors - never shown to the Client.", add: "Record Payment",
      date: "Date", payee: "Payee", method: "Method", amount: "Amount", status: "Status", actions: "Action",
      empty: "No payments recorded", emptyHint: "Record the first contractor payment.", loading: "Loading payments...", void: "Void", receipt: "Receipt"
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
            <label className="ui-field full-span">{labels.payee}<input value={payee} onChange={(event) => setPayee(event.target.value)} maxLength={255} required /></label>
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
          <footer><button className="ui-button ui-button--accent" type="submit" disabled={saving}>{labels.save}</button></footer>
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
          {events.map((event) => (
            <div className="finance-history-row" key={event.id}>
              <div>
                <strong>{financeActionLabel(event.action, locale)}</strong>
                <span>{event.actor?.displayName ?? (ar ? "النظام" : "System")}</span>
              </div>
              <time>{dateOnly(event.createdAt, locale)}</time>
            </div>
          ))}
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
      <section>
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
