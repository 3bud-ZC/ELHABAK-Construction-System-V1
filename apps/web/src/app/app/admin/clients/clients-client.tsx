"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdaptiveFilters, Badge, EmptyState, LoadingState, OperationsGrid, OperationsHeader, OperationsMetric, OperationsPanel, OperationsSurface, PageHeader, Register, RegisterCell, RegisterRow } from "@elhabak/ui";
import { ArrowLeft, ArrowRight, Check, Copy, Download, KeyRound, UploadCloud, UserRoundCog } from "lucide-react";
import { accountStatusTone, apiRequest, dataOpsExportUrl, type ClientRecord } from "../../../../lib/api";
import { filterLabels } from "../../../../lib/adaptive";

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
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
          password: "كلمة مرور مؤقتة",
          passwordHint: "اتركه فارغاً للإبقاء على كلمة المرور الحالية.",
          generatedCredentials: "بيانات الدخول التي تظهر مرة واحدة",
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
          passwordHint: "Leave blank to keep the current password.",
          generatedCredentials: "One-time generated credentials",
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

  const activeCount = useMemo(() => clients.filter((item) => item.user.isActive).length, [clients]);
  const contactReadyCount = useMemo(() => clients.filter((item) => Boolean(item.phone)).length, [clients]);

  useEffect(() => {
    if (mode === "create") {
      setLoading(false);
      return;
    }
    setLoading(true);
    const request =
      mode === "list"
        ? apiRequest<ClientRecord[]>(`/admin/clients${search ? `?search=${encodeURIComponent(search)}` : ""}`).then(
          setClients
        )
        : apiRequest<ClientRecord>(`/admin/clients/${id}`).then(setRecord);

    request.catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  }, [id, mode, search]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const data = new FormData(event.currentTarget);
    const body = {
      displayName: formValue(data, "displayName"),
      email: formValue(data, "email"),
      phone: formValue(data, "phone"),
      notes: formValue(data, "notes"),
      isActive: data.get("isActive") === "on",
      temporaryPassword: mode === "edit" ? formValue(data, "temporaryPassword") : undefined
    };
    if (mode === "create") delete (body as Partial<typeof body>).email;

    if (mode === "edit" && !body.temporaryPassword) {
      delete (body as Partial<typeof body>).temporaryPassword;
    }

    try {
      const saved = await apiRequest<ClientRecord>(mode === "create" ? "/admin/clients" : `/admin/clients/${id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        body: JSON.stringify(body)
      });
      setRecord(saved);
      setSuccess(labels.saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setSaving(false);
    }
  }

  async function copyToClipboard(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {
      // ignore clipboard error
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
              <OperationsMetric tone="navy" label={labels.total} value={<bdi>{clients.length}</bdi>} />
              <OperationsMetric tone="success" label={labels.activeCount} value={<bdi>{activeCount}</bdi>} />
              <OperationsMetric tone="warning" label={labels.inactiveCount} value={<bdi>{clients.length - activeCount}</bdi>} />
              <OperationsMetric tone="neutral" label={labels.contactReady} value={<bdi>{contactReadyCount}</bdi>} />
            </OperationsGrid>
          </OperationsPanel>
        )}
        <OperationsSurface>
          <AdaptiveFilters
            className="register-filters"
            labels={filterLabels(locale)}
            search={<label className="register-search"><span className="sr-only">{labels.search}</span><input className="search-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} /></label>}
            meta={!loading ? <span><bdi>{clients.length}</bdi> {ar ? "عميل" : "clients"}</span> : undefined}
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
        </OperationsSurface>
      </section>
    );
  }

  return (
    <section className="app-page">
      <PageHeader
        title={mode === "create" ? labels.create : labels.edit}
        actions={
          <Link className="ui-button ui-button--secondary" href={ar ? "/app/admin/clients" : "/app/admin/clients?lang=en"}>
            {labels.back}
          </Link>
        }
      />
      {loading && mode === "edit" ? <LoadingState label={labels.loadingLabel} /> : null}
      <form className="admin-form admin-form--elevated" autoComplete="off" onSubmit={(event) => void submit(event)}>
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
              <span>{labels.phone}</span>
              <input name="phone" type="tel" inputMode="tel" dir="ltr" autoComplete="off" defaultValue={record?.phone ?? ""} placeholder="01xxxxxxxxx" />
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
            {mode === "edit" ? (
              <label className="ui-field full-span">
                <span>{labels.password}</span>
                <input name="temporaryPassword" type="password" autoComplete="new-password" minLength={10} placeholder={ar ? "اترك فارغاً للاحتفاظ بكلمة المرور الحالية" : "Leave blank to keep current password"} />
                <small className="field-help">{labels.passwordHint}</small>
              </label>
            ) : (
              <div className="ui-field full-span field-hint">
                <span>{labels.password}</span>
                <p>{ar ? "سيتم إنشاء كلمة مرور عشوائية آمنة وإظهارها مرة واحدة بعد الحفظ." : "A secure random temporary password will be generated and shown once after saving."}</p>
              </div>
            )}
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

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}
        {mode === "create" && record ? (
          <div className="client-create-next-step credential-reveal" role="region" aria-label={labels.generatedCredentials}>
            <div className="credential-reveal__header">
              <KeyRound size={20} className="credential-reveal__icon" />
              <div>
                <strong>{labels.generatedCredentials}</strong>
                <p className="credential-reveal__warning">
                  {ar
                    ? "تنبيه أمني: كلمة المرور المؤقتة تظهر لمرة واحدة فقط ولن يتم عرضها مجدداً. يُرجى نسخها وتزويد العميل بها مع إلزامه باستبدالها بشكل خاص عند أول تسجيل دخول."
                    : "Security Notice: This temporary password is shown only once and cannot be retrieved again. Please copy and provide it to the client; they must change it privately upon first login."}
                </p>
              </div>
            </div>
            <div className="credential-reveal__fields">
              <div className="credential-reveal__row">
                <span className="credential-reveal__label">{labels.email}</span>
                <span className="mono credential-reveal__value"><bdi>{record.generatedCredentials?.email ?? record.user.email}</bdi></span>
                <button
                  type="button"
                  className="ui-button ui-button--secondary ui-button--sm"
                  onClick={() => void copyToClipboard(record.generatedCredentials?.email ?? record.user.email, "email")}
                  aria-label={copiedField === "email" ? (ar ? "تم النسخ" : "Copied") : (ar ? "نسخ معرّف الدخول" : "Copy identifier")}
                >
                  {copiedField === "email" ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedField === "email" ? (ar ? "تم النسخ" : "Copied") : (ar ? "نسخ" : "Copy")}</span>
                </button>
              </div>
              {record.generatedCredentials?.temporaryPassword ? (
                <div className="credential-reveal__row">
                  <span className="credential-reveal__label">{labels.password}</span>
                  <span className="mono credential-reveal__value credential-reveal__value--secret"><bdi>{record.generatedCredentials.temporaryPassword}</bdi></span>
                  <button
                    type="button"
                    className="ui-button ui-button--secondary ui-button--sm"
                    onClick={() => void copyToClipboard(record.generatedCredentials?.temporaryPassword ?? "", "password")}
                    aria-label={copiedField === "password" ? (ar ? "تم النسخ" : "Copied") : (ar ? "نسخ كلمة المرور" : "Copy password")}
                  >
                    {copiedField === "password" ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedField === "password" ? (ar ? "تم النسخ" : "Copied") : (ar ? "نسخ" : "Copy")}</span>
                  </button>
                </div>
              ) : null}
            </div>
            <div className="credential-reveal__actions">



            <Link
              className="ui-button ui-button--primary ui-button--sm"
              href={ar ? `/app/admin/projects/new?clientId=${record.id}` : `/app/admin/projects/new?clientId=${record.id}&lang=en`}
            >
              {labels.createProject}
            </Link>
            </div>
          </div>
        ) : null}

        <div className="form-actions-bar">
          <Link className="ui-button ui-button--secondary" href={ar ? "/app/admin/clients" : "/app/admin/clients?lang=en"}>
            {labels.back}
          </Link>
          <button className="ui-button ui-button--primary" disabled={saving} type="submit">
            {saving ? (locale === "ar" ? "جاري الحفظ..." : "Saving...") : labels.save}
          </button>
        </div>
      </form>
    </section>
  );
}

function formValue(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}
