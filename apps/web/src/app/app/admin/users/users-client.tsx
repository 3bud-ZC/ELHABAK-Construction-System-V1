"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, PageHeader } from "@elhabak/ui";
import { UsersRound } from "lucide-react";
import { accountStatusTone, apiRequest, roleLabel, type UserRecord, type UserRole } from "../../../../lib/api";

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
            lead: "إدارة حسابات فريق العمل وصلاحيات الوصول لكل دور.",
            create: "إنشاء مستخدم",
            edit: "تعديل مستخدم",
            back: "العودة للمستخدمين",
            search: "بحث بالاسم أو البريد الإلكتروني",
            empty: "لا يوجد مستخدمون مطابقون",
            emptyHint: "جرّب بحثاً مختلفاً أو أنشئ مستخدماً جديداً.",
            name: "الاسم",
            email: "البريد الإلكتروني",
            role: "الدور",
            active: "نشط",
            inactive: "غير نشط",
            password: "كلمة مرور مؤقتة",
            passwordHint: "اتركه فارغاً للإبقاء على كلمة المرور الحالية.",
            save: "حفظ",
            saved: "تم الحفظ.",
            status: "الحالة",
            loadingLabel: "جاري تحميل المستخدمين...",
            total: "إجمالي المستخدمين",
            activeCount: "حسابات نشطة"
          }
        : {
            title: "Users",
            lead: "Manage team accounts and role-based access across the system.",
            create: "Create user",
            edit: "Edit user",
            back: "Back to users",
            search: "Search by name or email",
            empty: "No matching users",
            emptyHint: "Try a different search or create a new user.",
            name: "Name",
            email: "Email",
            role: "Role",
            active: "Active",
            inactive: "Inactive",
            password: "Temporary password",
            passwordHint: "Leave blank to keep the current password.",
            save: "Save",
            saved: "Saved.",
            status: "Status",
            loadingLabel: "Loading users...",
            total: "Total users",
            activeCount: "Active accounts"
          },
    [locale]
  );

  const activeCount = useMemo(() => users.filter((item) => item.isActive).length, [users]);

  useEffect(() => {
    if (mode === "create") {
      setLoading(false);
      return;
    }
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
        <PageHeader
          title={labels.title}
          description={labels.lead}
          actions={
            <Link className="ui-button ui-button--primary" href="/app/admin/users/new">
              {labels.create}
            </Link>
          }
        />
        {!loading && (
          <div className="design-kpi-strip design-kpi-strip--compact">
            <span>
              <small>{labels.total}</small>
              <strong>{users.length}</strong>
            </span>
            <span>
              <small>{labels.activeCount}</small>
              <strong>{activeCount}</strong>
            </span>
            <p>{labels.lead}</p>
          </div>
        )}
        <div className="table-toolbar">
          <input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} />
        </div>
        {error ? <div className="form-error">{error}</div> : null}
        {loading ? <LoadingState label={labels.loadingLabel} /> : null}
        {!loading && users.length === 0 ? (
          <EmptyState icon={<UsersRound size={20} />} title={labels.empty} description={labels.emptyHint} />
        ) : null}
        {!loading && users.length > 0 ? (
          <div className="data-table">
            <div className="data-table-head user-row">
              <span>{labels.name}</span>
              <span>{labels.email}</span>
              <span>{labels.role}</span>
              <span>{labels.status}</span>
            </div>
            {users.map((user) => (
              <Link className="data-row user-row" href={`/app/admin/users/${user.id}`} key={user.id}>
                <div>
                  <strong>{user.displayName}</strong>
                </div>
                <div>
                  <span>{user.email}</span>
                </div>
                <div>
                  <Badge tone="navy">{roleLabel(user.role, locale)}</Badge>
                </div>
                <div>
                  <Badge tone={accountStatusTone(user.isActive)}>{user.isActive ? labels.active : labels.inactive}</Badge>
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
          <Link className="ui-button ui-button--secondary" href="/app/admin/users">
            {labels.back}
          </Link>
        }
      />
      {loading && mode === "edit" ? <LoadingState label={labels.loadingLabel} /> : null}
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
