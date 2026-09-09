"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest, roleLabel, type UserRecord, type UserRole } from "../../../../lib/api";

const roles: UserRole[] = ["ADMIN", "ENGINEER", "ACCOUNTANT", "WORKER", "CLIENT"];

type Mode = "list" | "create" | "edit";

type UsersClientProps = {
  mode: Mode;
  id?: string;
};

export function UsersClient({ mode, id }: UsersClientProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [record, setRecord] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const locale = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("lang") === "en" ? "en" : "ar";

  const labels = useMemo(
    () =>
      locale === "ar"
        ? {
            title: "المستخدمون",
            create: "إنشاء مستخدم",
            edit: "تعديل مستخدم",
            search: "بحث",
            empty: "لا يوجد مستخدمون مطابقون.",
            name: "الاسم",
            email: "البريد الإلكتروني",
            role: "الدور",
            active: "نشط",
            password: "كلمة مرور مؤقتة",
            save: "حفظ",
            saved: "تم الحفظ.",
            status: "الحالة"
          }
        : {
            title: "Users",
            create: "Create user",
            edit: "Edit user",
            search: "Search",
            empty: "No matching users.",
            name: "Name",
            email: "Email",
            role: "Role",
            active: "Active",
            password: "Temporary password",
            save: "Save",
            saved: "Saved.",
            status: "Status"
          },
    [locale]
  );

  useEffect(() => {
    setLoading(true);
    const request =
      mode === "list"
        ? apiRequest<UserRecord[]>(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`).then(
            setUsers
          )
        : apiRequest<UserRecord>(`/admin/users/${id}`).then(setRecord);

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
      role: formValue(data, "role") || "ENGINEER",
      isActive: data.get("isActive") === "on",
      temporaryPassword: formValue(data, "temporaryPassword")
    };

    if (mode === "edit" && !body.temporaryPassword) {
      delete (body as Partial<typeof body>).temporaryPassword;
    }

    try {
      const saved = await apiRequest<UserRecord>(mode === "create" ? "/admin/users" : `/admin/users/${id}`, {
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
            <p>Admin-only user management backed by PostgreSQL.</p>
          </div>
          <Link className="ui-button ui-button--primary" href="/app/admin/users/new">
            {labels.create}
          </Link>
        </div>
        <input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} />
        {loading ? <p>{locale === "ar" ? "جاري التحميل..." : "Loading..."}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        {!loading && users.length === 0 ? <div className="empty-state">{labels.empty}</div> : null}
        {users.length > 0 ? (
          <div className="data-table">
            {users.map((user) => (
              <Link className="data-row" href={`/app/admin/users/${user.id}`} key={user.id}>
                <strong>{user.displayName}</strong>
                <span>{user.email}</span>
                <span>{roleLabel(user.role, locale)}</span>
                <span>{user.isActive ? labels.active : locale === "ar" ? "غير نشط" : "Inactive"}</span>
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
          <input name="displayName" required defaultValue={record?.displayName ?? ""} />
        </label>
        <label className="ui-field">
          <span>{labels.email}</span>
          <input name="email" type="email" required defaultValue={record?.email ?? ""} />
        </label>
        <label className="ui-field">
          <span>{labels.role}</span>
          <select name="role" defaultValue={record?.role ?? "ENGINEER"}>
            {roles.map((role) => (
              <option value={role} key={role}>
                {roleLabel(role, locale)}
              </option>
            ))}
          </select>
        </label>
        <label className="check-field">
          <input name="isActive" type="checkbox" defaultChecked={record?.isActive ?? true} />
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
