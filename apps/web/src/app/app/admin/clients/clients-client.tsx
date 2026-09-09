"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, PageHeader } from "@elhabak/ui";
import { UserRoundCog } from "lucide-react";
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
            loadingLabel: "جاري تحميل العملاء..."
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
            loadingLabel: "Loading clients..."
          },
    [locale]
  );

  useEffect(() => {
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
        <div className="table-toolbar">
          <input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} />
        </div>
        {error ? <div className="form-error">{error}</div> : null}
        {loading ? <LoadingState label={labels.loadingLabel} /> : null}
        {!loading && clients.length === 0 ? (
          <EmptyState icon={<UserRoundCog size={20} />} title={labels.empty} description={labels.emptyHint} />
        ) : null}
        {!loading && clients.length > 0 ? (
          <div className="data-table">
            <div className="data-table-head client-row">
              <span>{labels.name}</span>
              <span>{labels.email}</span>
              <span>{labels.phone}</span>
              <span>{labels.status}</span>
            </div>
            {clients.map((client) => (
              <Link className="data-row client-row" href={`/app/admin/clients/${client.id}`} key={client.id}>
                <div>
                  <strong>{client.user.displayName}</strong>
                </div>
                <div>
                  <span>{client.user.email}</span>
                </div>
                <div>
                  <span className="mono">{client.phone ?? "-"}</span>
                </div>
                <div>
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
      <form className="admin-form" onSubmit={(event) => void submit(event)}>
        <label className="ui-field">
          <span>{labels.name}</span>
          <input name="displayName" required defaultValue={record?.user.displayName ?? ""} />
        </label>
        <label className="ui-field">
          <span>{labels.email}</span>
          <input name="email" type="email" required defaultValue={record?.user.email ?? ""} />
        </label>
        <label className="ui-field">
          <span>{labels.phone}</span>
          <input name="phone" defaultValue={record?.phone ?? ""} />
        </label>
        <label className="ui-field">
          <span>{labels.notes}</span>
          <textarea name="notes" defaultValue={record?.notes ?? ""} />
        </label>
        <label className="check-field">
          <input name="isActive" type="checkbox" defaultChecked={record?.user.isActive ?? true} />
          <span>{labels.active}</span>
        </label>
        <label className="ui-field">
          <span>{labels.password}</span>
          <input name="temporaryPassword" type="password" required={mode === "create"} minLength={10} />
          {mode === "edit" && <span style={{ color: "var(--muted-soft)", fontSize: "0.78rem", fontWeight: 500 }}>{labels.passwordHint}</span>}
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}
        <button className="ui-button ui-button--primary" disabled={saving} type="submit">
          {saving ? (locale === "ar" ? "جاري الحفظ..." : "Saving...") : labels.save}
        </button>
      </form>
    </section>
  );
}

function formValue(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}
