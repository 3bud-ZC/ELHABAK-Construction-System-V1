"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest, type ClientRecord } from "../../../../lib/api";

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
            create: "إنشاء عميل",
            edit: "تفاصيل العميل",
            search: "بحث",
            empty: "لا يوجد عملاء مطابقون.",
            name: "اسم العميل",
            email: "البريد الإلكتروني",
            phone: "الهاتف",
            notes: "ملاحظات",
            active: "الحساب نشط",
            password: "كلمة مرور مؤقتة",
            save: "حفظ",
            saved: "تم الحفظ."
          }
        : {
            title: "Clients",
            create: "Create client",
            edit: "Client details",
            search: "Search",
            empty: "No matching clients.",
            name: "Client name",
            email: "Email",
            phone: "Phone",
            notes: "Notes",
            active: "Account active",
            password: "Temporary password",
            save: "Save",
            saved: "Saved."
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
        <div className="page-heading page-heading--row">
          <div>
            <h1>{labels.title}</h1>
            <p>Admin-only client account foundation. Projects start in Milestone 03.</p>
          </div>
          <Link className="ui-button ui-button--primary" href="/app/admin/clients/new">
            {labels.create}
          </Link>
        </div>
        <input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} />
        {loading ? <p>{locale === "ar" ? "جاري التحميل..." : "Loading..."}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        {!loading && clients.length === 0 ? <div className="empty-state">{labels.empty}</div> : null}
        {clients.length > 0 ? (
          <div className="data-table">
            {clients.map((client) => (
              <Link className="data-row" href={`/app/admin/clients/${client.id}`} key={client.id}>
                <strong>{client.user.displayName}</strong>
                <span>{client.user.email}</span>
                <span>{client.phone ?? "-"}</span>
                <span>{client.user.isActive ? labels.active : locale === "ar" ? "غير نشط" : "Inactive"}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="app-page">
      <div className="page-heading">
        <h1>{mode === "create" ? labels.create : labels.edit}</h1>
      </div>
      {loading && mode === "edit" ? <p>{locale === "ar" ? "جاري التحميل..." : "Loading..."}</p> : null}
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
