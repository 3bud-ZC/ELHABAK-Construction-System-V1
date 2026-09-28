"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { normalizeEgyptianMobile } from "@elhabak/contracts";
import { AdaptiveFilters, Badge, ConfirmDialog, EmptyState, LoadingState, OperationsGrid, OperationsHeader, OperationsMetric, OperationsPanel, OperationsSurface, PageHeader, Register, RegisterCell, RegisterRow } from "@elhabak/ui";
import { ArrowLeft, ArrowRight, Download, KeyRound, UploadCloud, UserRoundCog } from "lucide-react";
import { accountStatusTone, apiRequest, dataOpsExportUrl, REGISTER_PAGE_SIZE, type ClientListSummary, type ClientPasswordReset, type ClientRecord, type PagedResult } from "../../../../lib/api";
import { RegisterPager } from "../../../../components/register-pager";
import { filterLabels } from "../../../../lib/adaptive";
import { ClientCredentialsPanel, type OneTimeCredentials } from "./client-credentials-panel";

type Mode = "list" | "create" | "edit";

type ClientsClientProps = {
  mode: Mode;
  id?: string;
};

export function ClientsClient({ mode, id }: ClientsClientProps) {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [record, setRecord] = useState<ClientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  // Server-side paging: one bounded page per request, whole-table counts from summary.
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<ClientListSummary | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // One-time plaintext credential (create or reset). Cleared on dismissal; never refetchable.
  const [credentials, setCredentials] = useState<OneTimeCredentials | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const router = useRouter();
  const locale = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("lang") === "en" ? "en" : "ar";
  const ar = locale === "ar";

  const labels = useMemo(
    () =>
      locale === "ar"
        ? {
          title: "العملاء",
          lead: "إدارة حسابات العملاء وربطها بمشاريعهم.",
          create: "إنشاء عميل",
          edit: "تفاصيل العميل",
          back: "العودة للعملاء",
          search: "بحث بالاسم أو البريد الإلكتروني",
          empty: "لا يوجد عملاء مطابقون",
          emptyHint: "جرّب بحثاً مختلفاً أو أنشئ عميلاً جديداً.",
          name: "اسم العميل",
          email: "معرّف الدخول",
          phone: "الهاتف",
          notes: "ملاحظات",
          active: "الحساب نشط",
          statusActive: "نشط",
          statusInactive: "غير نشط",
          password: "كلمة المرور المؤقتة",
          phoneHint: "رقم موبايل مصري (010 / 011 / 012 / 015). يُحفظ بصيغة دولية موحّدة.",
          phoneInvalid: "أدخل رقم موبايل مصري صحيحاً يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً.",
          credential: "بيانات الدخول",
          credentialPending: "بانتظار تغيير كلمة المرور المؤقتة عند أول دخول",
          credentialPrivate: "العميل يستخدم كلمة مرور خاصة",
          resetAction: "إنشاء كلمة مرور مؤقتة جديدة",
          resetHint: "كلمة المرور لا تُعرض مرة أخرى بعد إخفائها. إذا فُقدت، أنشئ كلمة مرور جديدة.",
          resetTitle: "إنشاء كلمة مرور مؤقتة جديدة؟",
          resetBody: "ستتوقف كلمة المرور الحالية فوراً، وتُلغى كل جلسات العميل، ويُطلب منه تعيين كلمة مرور خاصة عند الدخول التالي.",
          resetConfirm: "إنشاء كلمة المرور",
          cancel: "إلغاء",
          save: "حفظ",
          saved: "تم الحفظ.",
          status: "الحالة",
          loadingLabel: "جاري تحميل العملاء...",
          total: "إجمالي العملاء",
          activeCount: "حسابات نشطة",
          inactiveCount: "حسابات غير نشطة",
          contactReady: "بيانات اتصال مكتملة",
          projects: "المشاريع",
          export: "تصدير",
          import: "استيراد Excel/CSV",
          createProject: "إنشاء مشروع لهذا العميل"
        }
        : {
          title: "Clients",
          lead: "Manage client accounts and their linked projects.",
          create: "Create client",
          edit: "Client details",
          back: "Back to clients",
          search: "Search by name or email",
          empty: "No matching clients",
          emptyHint: "Try a different search or create a new client.",
          name: "Client name",
          email: "Login identifier",
          phone: "Phone",
          notes: "Notes",
          active: "Account active",
          statusActive: "Active",
          statusInactive: "Inactive",
          password: "Temporary password",
          phoneHint: "Egyptian mobile (010 / 011 / 012 / 015). Stored in one canonical international format.",
          phoneInvalid: "Enter a valid Egyptian mobile number: 11 digits starting with 010, 011, 012 or 015.",
          credential: "Sign-in credential",
          credentialPending: "Waiting for the temporary password to be changed at first sign-in",
          credentialPrivate: "Client uses a private password",
          resetAction: "Generate new temporary password",
          resetHint: "Passwords are never shown again once hidden. If one is lost, generate a new one.",
          resetTitle: "Generate a new temporary password?",
          resetBody: "The current password stops working immediately, every client session is signed out, and the client must set a private password at next sign-in.",
          resetConfirm: "Generate password",
          cancel: "Cancel",
          save: "Save",
          saved: "Saved.",
          status: "Status",
          loadingLabel: "Loading clients...",
          total: "Total clients",
          activeCount: "Active accounts",
          inactiveCount: "Inactive accounts",
          contactReady: "Contact details ready",
          projects: "Projects",
          export: "Export",
          import: "Import Excel/CSV",
          createProject: "Create project for this client"
        },
    [locale]
  );

  // Debounced search: typing does not fire a request per keystroke; a new query starts at page 1.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (mode === "create") {
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(REGISTER_PAGE_SIZE) });
    if (query) params.set("search", query);
    const request =
      mode === "list"
        ? apiRequest<PagedResult<ClientRecord, ClientListSummary>>(`/admin/clients?${params.toString()}`).then((result) => {
          setClients(result.items);
          setTotal(result.total);
          setSummary(result.summary);
        })
        : apiRequest<ClientRecord>(`/admin/clients/${id}`).then(setRecord);

    request.catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  }, [id, mode, page, query]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const data = new FormData(event.currentTarget);
    const phone = normalizeEgyptianMobile(formValue(data, "phone"));
    if (!phone) {
      setError(labels.phoneInvalid);
      return;
    }
    const body: Record<string, string | boolean> = {
      displayName: formValue(data, "displayName"),
      phone,
      notes: formValue(data, "notes"),
      isActive: data.get("isActive") === "on"
    };
    if (mode === "edit") body.email = formValue(data, "email");

    setSaving(true);
    try {
      const saved = await apiRequest<ClientRecord>(mode === "create" ? "/admin/clients" : `/admin/clients/${id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        body: JSON.stringify(body)
      });
      const { generatedCredentials, ...client } = saved;
      setRecord(client);
      if (mode === "create" && generatedCredentials) {
        setCredentials({ displayName: client.user.displayName, ...generatedCredentials });
      } else {
        setSuccess(labels.saved);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    if (!id) return;
    setResetBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await apiRequest<ClientPasswordReset>(`/admin/clients/${id}/reset-password`, { method: "POST", body: "{}" });
      setCredentials({ displayName: result.displayName, email: result.email, phone: result.phone, temporaryPassword: result.temporaryPassword });
      setRecord((current) => (current ? { ...current, user: { ...current.user, mustChangePassword: true } } : current));
      setResetOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
      setResetOpen(false);
    } finally {
      setResetBusy(false);
    }
  }

  if (mode === "list") {
    return (
      <section className="app-page clients-console">
        <OperationsHeader
          eyebrow={ar ? "إدارة حسابات العملاء" : "Client Account Management"}
          title={labels.title}
          description={labels.lead}
          actions={
            <>
              <a className="ui-button ui-button--ghost" href={dataOpsExportUrl("clients", "xlsx")}>
                <Download size={18} /> {labels.export}
              </a>
              <Link className="ui-button ui-button--secondary" href={ar ? "/app/data" : "/app/data?lang=en"}>
                <UploadCloud size={18} /> {labels.import}
              </Link>
              <Link className="ui-button ui-button--primary" href={ar ? "/app/admin/clients/new" : "/app/admin/clients/new?lang=en"}>
                {labels.create}
              </Link>
            </>
          }
        />
        {!loading && (
          <OperationsPanel className="client-account-ledger" aria-label={ar ? "حالة الوصول" : "Access state"}>
            <OperationsGrid columns="repeat(4, minmax(150px, 1fr))">
              <OperationsMetric tone="navy" label={labels.total} value={<bdi>{summary?.total ?? 0}</bdi>} />
              <OperationsMetric tone="success" label={labels.activeCount} value={<bdi>{summary?.active ?? 0}</bdi>} />
              <OperationsMetric tone="warning" label={labels.inactiveCount} value={<bdi>{summary?.inactive ?? 0}</bdi>} />
              <OperationsMetric tone="neutral" label={labels.contactReady} value={<bdi>{summary?.contactReady ?? 0}</bdi>} />
            </OperationsGrid>
          </OperationsPanel>
        )}
        <OperationsSurface>
          <AdaptiveFilters
            className="register-filters"
            labels={filterLabels(locale)}
            search={<label className="register-search"><span className="sr-only">{labels.search}</span><input className="search-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} /></label>}
            meta={!loading ? <span><bdi>{total}</bdi> {ar ? "عميل" : "clients"}</span> : undefined}
          />
          {error ? <div className="form-error">{error}</div> : null}
          {loading ? <LoadingState label={labels.loadingLabel} /> : null}
          {!loading && clients.length === 0 ? (
            <EmptyState icon={<UserRoundCog size={20} />} title={labels.empty} description={labels.emptyHint} />
          ) : null}
          {!loading && clients.length > 0 ? (
            <Register
              className="ops-register--accounts"
              columns="minmax(240px,2.2fr) minmax(140px,1fr) minmax(120px,.9fr) 120px 120px"
              head={<><span>{labels.name}</span><span>{labels.phone}</span><span>{labels.projects}</span><span>{labels.status}</span><span /></>}
            >
              {clients.map((client) => {
                const clientHref = ar ? `/app/admin/clients/${client.id}` : `/app/admin/clients/${client.id}?lang=en`;
                return (
                  <RegisterRow className={!client.user.isActive ? "admin-row--suspended" : ""} key={client.id}>
                    <RegisterCell className="ops-register__cell--identity" label={labels.name}>
                      <div className="project-record__identity">
                        <Link href={clientHref}><strong dir="auto">{client.user.displayName}</strong></Link>
                        <bdi className="project-code-tag mono account-login-id" dir="ltr">{client.user.email}</bdi>
                      </div>
                    </RegisterCell>
                    <RegisterCell label={labels.phone}><bdi className="mono" dir="ltr">{client.phone ?? "—"}</bdi></RegisterCell>
                    <RegisterCell label={labels.projects}>
                      <span>
                        <bdi>{client.projectCount ?? 0}</bdi>
                        {typeof client.activeProjectCount === "number" && client.activeProjectCount > 0
                          ? <> · <bdi>{client.activeProjectCount}</bdi> {ar ? "نشط" : "active"}</>
                          : null}
                      </span>
                    </RegisterCell>
                    <RegisterCell label={labels.status}>
                      <Badge tone={accountStatusTone(client.user.isActive)}>
                        {client.user.isActive ? labels.statusActive : labels.statusInactive}
                      </Badge>
                    </RegisterCell>
                    <RegisterCell className="ops-register__cell--action">
                      <Link className="project-register-open" href={clientHref} aria-label={`${labels.edit}: ${client.user.displayName}`}>
                        <span className="register-open-label">{labels.edit}</span>{ar ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
                      </Link>
                    </RegisterCell>
                  </RegisterRow>
                );
              })}
            </Register>
          ) : null}
          {!loading ? <RegisterPager page={page} pageSize={REGISTER_PAGE_SIZE} total={total} locale={locale} onPage={setPage} /> : null}
        </OperationsSurface>
      </section>
    );
  }

  const clientsHref = ar ? "/app/admin/clients" : "/app/admin/clients?lang=en";

  // Create: the success state replaces the form entirely, so the same client cannot be
  // submitted twice and the plaintext is dropped when the Admin moves on.
  if (mode === "create" && credentials && record) {
    const detailHref = ar ? `/app/admin/clients/${record.id}` : `/app/admin/clients/${record.id}?lang=en`;
    return (
      <section className="app-page">
        <PageHeader title={labels.create} />
        <ClientCredentialsPanel
          credentials={credentials}
          locale={locale}
          kind="created"
          doneLabel={ar ? "تم — فتح ملف العميل" : "Done — open client record"}
          onDone={() => {
            setCredentials(null);
            router.replace(detailHref);
          }}
          extraAction={
            <Link
              className="ui-button ui-button--ghost"
              href={ar ? `/app/admin/projects/new?clientId=${record.id}` : `/app/admin/projects/new?clientId=${record.id}&lang=en`}
              onClick={() => setCredentials(null)}
            >
              {labels.createProject}
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section className="app-page">
      <PageHeader
        title={mode === "create" ? labels.create : labels.edit}
        actions={
          <Link className="ui-button ui-button--secondary" href={clientsHref}>
            {labels.back}
          </Link>
        }
      />
      {loading && mode === "edit" ? <LoadingState label={labels.loadingLabel} /> : null}
      {mode === "edit" && credentials ? (
        <ClientCredentialsPanel credentials={credentials} locale={locale} kind="reset" onDone={() => setCredentials(null)} />
      ) : null}
      {loading && mode === "edit" ? null : (
        <form className="admin-form admin-form--elevated" autoComplete="off" noValidate onSubmit={(event) => void submit(event)}>
          <div className="form-section">
            <div className="form-section__header">
              <span className="form-section__index">01</span>
              <h4>{ar ? "هوية العميل" : "Client identity"}</h4>
            </div>
            <div className="form-grid">
              <label className="ui-field full-span">
                <span>{labels.name} <strong className="required-star">*</strong></span>
                <input name="displayName" required autoComplete="off" defaultValue={record?.user.displayName ?? ""} placeholder={ar ? "اسم العميل أو الجهة" : "Client or Organization Name"} />
              </label>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section__header">
              <span className="form-section__index">02</span>
              <h4>{ar ? "التواصل" : "Contact"}</h4>
            </div>
            <div className="form-grid">
              <label className="ui-field">
                <span>{labels.phone} <strong className="required-star">*</strong></span>
                <input name="phone" type="tel" inputMode="tel" dir="ltr" required autoComplete="off" defaultValue={record?.phone ?? ""} placeholder="01xxxxxxxxx" aria-describedby="client-phone-hint" />
                <small className="field-help" id="client-phone-hint">{labels.phoneHint}</small>
              </label>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section__header">
              <span className="form-section__index">03</span>
              <h4>{ar ? "حساب الدخول" : "Login account"}</h4>
            </div>
            <div className="form-grid">
              {mode === "edit" ? (
                <label className="ui-field">
                  <span>{labels.email}</span>
                  <input name="email" type="email" dir="ltr" autoComplete="off" defaultValue={record?.user.email ?? ""} />
                </label>
              ) : (
                <div className="ui-field">
                  <span>{labels.email}</span>
                  <div className="generated-id"><bdi>…@elhabak.com</bdi></div>
                  <small className="field-help">{ar ? "يُنشأ معرّف دخول فريد تلقائياً عند الحفظ." : "A unique login identifier is generated automatically on save."}</small>
                </div>
              )}
              <div className="field-group-center">
                <label className="check-field check-field--toggle">
                  <input name="isActive" type="checkbox" defaultChecked={record?.user.isActive ?? true} />
                  <span>{labels.active}</span>
                </label>
              </div>
              {mode === "edit" && record ? (
                <div className="ui-field full-span client-credential-state">
                  <span>{labels.credential}</span>
                  <div className="client-credential-state__row">
                    <Badge tone={record.user.mustChangePassword ? "orange" : "success"}>
                      {record.user.mustChangePassword ? labels.credentialPending : labels.credentialPrivate}
                    </Badge>
                    <button type="button" className="ui-button ui-button--secondary" onClick={() => setResetOpen(true)} disabled={Boolean(record.user.archivedAt)}>
                      <KeyRound size={16} aria-hidden="true" /> {labels.resetAction}
                    </button>
                  </div>
                  <small className="field-help">{labels.resetHint}</small>
                </div>
              ) : mode === "create" ? (
                <div className="ui-field full-span field-hint">
                  <span>{labels.password}</span>
                  <p>{ar ? "تُنشأ كلمة مرور مؤقتة آمنة تلقائياً (آخر 4 أرقام من الموبايل تظهر فيها كعلامة تعريف فقط) وتُعرض مرة واحدة بعد الحفظ." : "A secure temporary password is generated automatically (the last 4 mobile digits appear only as a recognizable label) and shown once after saving."}</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="form-section">
            <div className="form-section__header">
              <span className="form-section__index">04</span>
              <h4>{labels.notes}</h4>
            </div>
            <div className="form-grid">
              <label className="ui-field full-span">
                <span className="sr-only">{labels.notes}</span>
                <textarea name="notes" defaultValue={record?.notes ?? ""} placeholder={ar ? "ملاحظات إضافية حول العميل ونطاق المشاريع..." : "Optional notes regarding client requirements..."} />
              </label>
            </div>
          </div>

          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {success ? <p className="form-success" role="status">{success}</p> : null}

          <div className="form-actions-bar">
            <Link className="ui-button ui-button--secondary" href={clientsHref}>
              {labels.back}
            </Link>
            <button className="ui-button ui-button--primary" disabled={saving} type="submit">
              {saving ? (locale === "ar" ? "جاري الحفظ..." : "Saving...") : labels.save}
            </button>
          </div>
        </form>
      )}
      <ConfirmDialog
        open={resetOpen}
        onClose={() => (resetBusy ? undefined : setResetOpen(false))}
        onConfirm={() => void resetPassword()}
        title={labels.resetTitle}
        description={labels.resetBody}
        confirmLabel={resetBusy ? (ar ? "جاري الإنشاء..." : "Generating...") : labels.resetConfirm}
        cancelLabel={labels.cancel}
        busy={resetBusy}
      />
    </section>
  );
}

function formValue(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}
