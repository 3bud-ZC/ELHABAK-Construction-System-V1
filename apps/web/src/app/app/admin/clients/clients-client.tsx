"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, MetricCard, PageHeader } from "@elhabak/ui";
import { CheckCircle2, Phone, UserRoundCog, UserX, UsersRound } from "lucide-react";
import { accountStatusTone, apiRequest, type ClientRecord } from "../../../../lib/api";

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
          email: "البريد الإلكتروني",
          phone: "الهاتف",
          notes: "ملاحظات",
          active: "الحساب نشط",
          statusActive: "نشط",
          statusInactive: "غير نشط",
          password: "كلمة مرور مؤقتة",
          passwordHint: "اتركه فارغاً للإبقاء على كلمة المرور الحالية.",
          save: "حفظ",
          saved: "تم الحفظ.",
          status: "الحالة",
          loadingLabel: "جاري تحميل العملاء...",
          total: "إجمالي العملاء",
          activeCount: "حسابات نشطة",
          inactiveCount: "حسابات غير نشطة",
          contactReady: "بيانات اتصال مكتملة"
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
          email: "Email",
          phone: "Phone",
          notes: "Notes",
          active: "Account active",
          statusActive: "Active",
          statusInactive: "Inactive",
          password: "Temporary password",
          passwordHint: "Leave blank to keep the current password.",
          save: "Save",
          saved: "Saved.",
          status: "Status",
          loadingLabel: "Loading clients...",
          total: "Total clients",
          activeCount: "Active accounts",
          inactiveCount: "Inactive accounts",
          contactReady: "Contact details ready"
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
      temporaryPassword: formValue(data, "temporaryPassword")
    };

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

  if (mode === "list") {
    return (
      <section className="app-page">
        <PageHeader
          title={labels.title}
          description={labels.lead}
          actions={
            <Link className="ui-button ui-button--primary" href="/app/admin/clients/new">
              {labels.create}
            </Link>
          }
        />
        {!loading && (
          <div className="metric-grid">
            <MetricCard icon={<UsersRound size={18} />} tone="navy" label={labels.total} value={clients.length} />
            <MetricCard icon={<CheckCircle2 size={18} />} tone="success" label={labels.activeCount} value={activeCount} />
            <MetricCard icon={<UserX size={18} />} tone="orange" label={labels.inactiveCount} value={clients.length - activeCount} />
            <MetricCard icon={<Phone size={18} />} tone="info" label={labels.contactReady} value={contactReadyCount} />
          </div>
        )}
        <div className="table-toolbar">
          <input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} />
        </div>
        {error ? <div className="form-error">{error}</div> : null}
        {loading ? <LoadingState label={labels.loadingLabel} /> : null}
        {!loading && clients.length === 0 ? (
          <EmptyState icon={<UserRoundCog size={20} />} title={labels.empty} description={labels.emptyHint} />
        ) : null}
        {!loading && clients.length > 0 ? (
          <div className="data-table data-table--clients">
            <div className="data-table-head client-row">
              <span>{labels.name}</span>
              <span>{labels.email}</span>
              <span>{labels.phone}</span>
              <span>{labels.status}</span>
            </div>
            {clients.map((client) => (
              <Link className="data-row client-row" href={`/app/admin/clients/${client.id}`} key={client.id}>
                <div data-label={labels.name}>
                  <strong>{client.user.displayName}</strong>
                </div>
                <div data-label={labels.email}>
                  <span>{client.user.email}</span>
                </div>
                <div data-label={labels.phone}>
                  <span className="mono">{client.phone ?? "-"}</span>
                </div>
                <div data-label={labels.status}>
                  <Badge tone={accountStatusTone(client.user.isActive)}>
                    {client.user.isActive ? labels.statusActive : labels.statusInactive}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="app-page">
      <PageHeader
        title={mode === "create" ? labels.create : labels.edit}
        actions={
          <Link className="ui-button ui-button--secondary" href="/app/admin/clients">
            {labels.back}
          </Link>
        }
      />
      {loading && mode === "edit" ? <LoadingState label={labels.loadingLabel} /> : null}
      <form className="admin-form admin-form--elevated" onSubmit={(event) => void submit(event)}>
        <div className="form-section">
          <div className="form-section__header">
            <span className="form-section__index">01</span>
            <h4>{ar ? "بيانات العميل والتواصل" : "Client & Contact Details"}</h4>
          </div>
          <div className="form-grid">
            <label className="ui-field">
              <span>{labels.name} <strong className="required-star">*</strong></span>
              <input name="displayName" required defaultValue={record?.user.displayName ?? ""} placeholder={ar ? "اسم العميل أو الجهة" : "Client or Organization Name"} />
            </label>
            <label className="ui-field">
              <span>{labels.email} <strong className="required-star">*</strong></span>
              <input name="email" type="email" required defaultValue={record?.user.email ?? ""} placeholder="client@example.com" />
            </label>
            <label className="ui-field">
              <span>{labels.phone}</span>
              <input name="phone" defaultValue={record?.phone ?? ""} placeholder="01xxxxxxxxx" />
            </label>
            <div className="field-group-center">
              <label className="check-field check-field--toggle">
                <input name="isActive" type="checkbox" defaultChecked={record?.user.isActive ?? true} />
                <span>{labels.active}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section__header">
            <span className="form-section__index">02</span>
            <h4>{ar ? "حساب الدخول والملاحظات" : "Login Account & Notes"}</h4>
          </div>
          <div className="form-grid">
            <label className="ui-field full-span">
              <span>{labels.password} {mode === "create" && <strong className="required-star">*</strong>}</span>
              <input name="temporaryPassword" type="password" required={mode === "create"} minLength={10} placeholder={mode === "create" ? (ar ? "كلمة مرور مؤقتة لحساب العميل (١٠ أحرف على الأقل)" : "Temporary password for client account (min 10 characters)") : (ar ? "اترك فارغاً للاحتفاظ بكلمة المرور الحالية" : "Leave blank to keep current password")} />
              {mode === "edit" && <span className="field-hint">{labels.passwordHint}</span>}
            </label>
            <label className="ui-field full-span">
              <span>{labels.notes}</span>
              <textarea name="notes" defaultValue={record?.notes ?? ""} placeholder={ar ? "ملاحظات إضافية حول العميل ونطاق المشاريع..." : "Optional notes regarding client requirements..."} />
            </label>
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        <div className="form-actions-bar">
          <Link className="ui-button ui-button--secondary" href="/app/admin/clients">
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
