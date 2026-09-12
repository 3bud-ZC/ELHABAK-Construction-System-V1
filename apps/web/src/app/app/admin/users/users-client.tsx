"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, MetricCard, PageHeader } from "@elhabak/ui";
import {
  Archive,
  CheckCircle2,
  KeyRound,
  LogIn,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  RotateCcw,
  Trash2,
  UserX,
  UsersRound,
  X
} from "lucide-react";
import { apiRequest, roleLabel, type UserRecord, type UserRole } from "../../../../lib/api";
import { useCurrentUser } from "../../../../lib/user-context";

const roles: UserRole[] = ["ADMIN", "ENGINEER", "ACCOUNTANT", "WORKER", "CLIENT"];
type AccountStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";
type Mode = "list" | "create" | "edit";
type ActionKind = "activate" | "suspend" | "restore" | "archive" | "delete" | "reset" | "impersonate";

type DeletionImpact = {
  canPermanentlyDelete: boolean;
  linkedRecords: Array<{ relation: string; count: number }>;
  protectedPrimaryAdmin: boolean;
};

type PendingAction = {
  kind: ActionKind;
  user: UserRecord;
  impact?: DeletionImpact;
};

type UsersClientProps = { mode: Mode; id?: string };

export function UsersClient({ mode, id }: UsersClientProps) {
  const currentUser = useCurrentUser();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [record, setRecord] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<AccountStatus | "ALL">("ALL");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const locale = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("lang") === "en" ? "en" : "ar";
  const ar = locale === "ar";

  const labels = useMemo(() => copy(ar), [ar]);
  const activeCount = users.filter((user) => statusOf(user) === "ACTIVE").length;
  const suspendedCount = users.filter((user) => statusOf(user) === "SUSPENDED").length;
  const archivedCount = users.filter((user) => statusOf(user) === "ARCHIVED").length;
  const visibleUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return users.filter((user) => {
      const matchesQuery = !query || `${user.displayName} ${user.email}`.toLocaleLowerCase().includes(query);
      return matchesQuery && (roleFilter === "ALL" || user.role === roleFilter) && (statusFilter === "ALL" || statusOf(user) === statusFilter);
    });
  }, [roleFilter, search, statusFilter, users]);

  useEffect(() => {
    if (mode === "create") {
      setLoading(false);
      return;
    }
    setLoading(true);
    const request = mode === "list" ? apiRequest<UserRecord[]>("/admin/users").then(setUsers) : apiRequest<UserRecord>(`/admin/users/${id}`).then(setRecord);
    request.catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  }, [id, mode]);

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [openMenu]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const data = new FormData(event.currentTarget);
    const body: Record<string, string | boolean> = {
      displayName: formValue(data, "displayName"),
      email: formValue(data, "email"),
      role: formValue(data, "role") || "ENGINEER"
    };
    if (mode === "create") {
      body.isActive = data.get("isActive") === "on";
      body.temporaryPassword = formValue(data, "temporaryPassword");
    }

    try {
      const saved = await apiRequest<UserRecord>(mode === "create" ? "/admin/users" : `/admin/users/${id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        body: JSON.stringify(body)
      });
      setRecord(saved);
      setSuccess(labels.saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.requestFailed);
    } finally {
      setSaving(false);
    }
  }

  async function openAction(kind: ActionKind, user: UserRecord) {
    setOpenMenu(null);
    setError(null);
    setConfirmationText("");
    setTemporaryPassword("");
    if (kind === "delete") {
      setActionBusy(true);
      try {
        const impact = await apiRequest<DeletionImpact>(`/admin/users/${user.id}/deletion-impact`);
        setPending({ kind, user, impact });
      } catch (err) {
        setError(err instanceof Error ? err.message : labels.requestFailed);
      } finally {
        setActionBusy(false);
      }
      return;
    }
    setPending({ kind, user });
  }

  async function confirmAction() {
    if (!pending) return;
    setActionBusy(true);
    setError(null);
    const { kind, user } = pending;
    try {
      if (kind === "impersonate") {
        await apiRequest(`/admin/users/${user.id}/impersonate`, { method: "POST", body: "{}" });
        window.location.assign(ar ? "/app" : "/app?lang=en");
        return;
      }
      if (kind === "reset") {
        await apiRequest(`/admin/users/${user.id}/reset-password`, {
          method: "POST",
          body: JSON.stringify({ temporaryPassword })
        });
      } else if (kind === "delete" && pending.impact?.canPermanentlyDelete) {
        await apiRequest(`/admin/users/${user.id}`, { method: "DELETE" });
        setUsers((items) => items.filter((item) => item.id !== user.id));
      } else {
        const operation = kind === "delete" ? "archive" : kind;
        const updated = await apiRequest<UserRecord>(`/admin/users/${user.id}/${operation}`, { method: "POST", body: "{}" });
        setUsers((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      }
      setSuccess(actionSuccess(kind, ar, pending.impact));
      setPending(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.requestFailed);
    } finally {
      setActionBusy(false);
    }
  }

  if (mode === "list") {
    return (
      <section className="app-page users-console">
        <PageHeader title={labels.title} description={labels.lead} actions={<Link className="ui-button ui-button--primary" href={withLocale("/app/admin/users/new", ar)}>{labels.create}</Link>} />

        {!loading ? (
          <div className="users-kpi-strip">
            <MetricCard icon={<UsersRound size={18} />} tone="navy" label={labels.total} value={users.length} />
            <MetricCard icon={<CheckCircle2 size={18} />} tone="success" label={labels.activeCount} value={activeCount} />
            <MetricCard icon={<UserX size={18} />} tone="orange" label={labels.suspendedCount} value={suspendedCount} />
            <MetricCard icon={<Archive size={18} />} tone="neutral" label={labels.archivedCount} value={archivedCount} />
          </div>
        ) : null}

        <div className="users-role-strip">
          <small>{labels.roleDistribution}</small>
          <div className="users-role-strip__chips">
            {roles.map((role) => (
              <span key={role} className="users-role-chip">
                {roleLabel(role, locale)} <strong>{users.filter((user) => user.role === role).length}</strong>
              </span>
            ))}
          </div>
        </div>

        <div className="table-toolbar users-toolbar">
          <input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.search} aria-label={labels.search} />
          <select className="filter-select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as UserRole | "ALL")} aria-label={labels.filterRole}>
            <option value="ALL">{labels.allRoles}</option>
            {roles.map((role) => <option value={role} key={role}>{roleLabel(role, locale)}</option>)}
          </select>
          <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AccountStatus | "ALL")} aria-label={labels.filterStatus}>
            <option value="ALL">{labels.allStatuses}</option>
            <option value="ACTIVE">{labels.active}</option>
            <option value="SUSPENDED">{labels.suspended}</option>
            <option value="ARCHIVED">{labels.archived}</option>
          </select>
        </div>
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        {success ? <div className="form-success" role="status">{success}</div> : null}
        {loading || actionBusy && !pending ? <LoadingState label={labels.loadingLabel} /> : null}
        {!loading && visibleUsers.length === 0 ? <EmptyState icon={<UsersRound size={20} />} title={labels.empty} description={labels.emptyHint} /> : null}
        {!loading && visibleUsers.length > 0 ? (
          <div className="data-table users-table">
            <div className="data-table-head user-row">
              <span>{labels.name}</span><span>{labels.email}</span><span>{labels.role}</span><span>{labels.status}</span><span>{labels.created}</span><span>{labels.actions}</span>
            </div>
            {visibleUsers.map((user) => (
              <div className="data-row user-row" key={user.id}>
                <div data-label={labels.name}><Link className="user-name-link" href={withLocale(`/app/admin/users/${user.id}`, ar)}><strong>{user.displayName}</strong></Link></div>
                <div data-label={labels.email}><span>{user.email}</span></div>
                <div data-label={labels.role}><Badge tone="navy">{roleLabel(user.role, locale)}</Badge></div>
                <div data-label={labels.status}><StatusBadge status={statusOf(user)} labels={labels} /></div>
                <div data-label={labels.created}><span>{formatDate(user.createdAt, locale)}</span></div>
                <div className="user-actions" data-label={labels.actions}>
                  <button className="user-actions__trigger" type="button" aria-label={`${labels.actions}: ${user.displayName}`} aria-expanded={openMenu === user.id} onClick={(event) => { event.stopPropagation(); setOpenMenu(openMenu === user.id ? null : user.id); }}><MoreHorizontal size={19} /></button>
                  {openMenu === user.id ? <ActionMenu user={user} currentUserId={currentUser.id} labels={labels} ar={ar} onAction={(kind) => void openAction(kind, user)} /> : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {pending ? <ActionDialog pending={pending} labels={labels} ar={ar} busy={actionBusy} confirmationText={confirmationText} temporaryPassword={temporaryPassword} onConfirmationText={setConfirmationText} onTemporaryPassword={setTemporaryPassword} onClose={() => setPending(null)} onConfirm={() => void confirmAction()} /> : null}
      </section>
    );
  }

  if (loading && mode === "edit") return <section className="app-page"><LoadingState label={labels.loadingLabel} /></section>;

  return (
    <section className="app-page">
      <PageHeader title={mode === "create" ? labels.create : labels.edit} description={mode === "edit" ? labels.editHint : labels.createHint} actions={<Link className="ui-button ui-button--secondary" href={withLocale("/app/admin/users", ar)}>{labels.back}</Link>} />
      {record && mode === "edit" ? <div className="account-state-callout"><StatusBadge status={statusOf(record)} labels={labels} /><span>{labels.lifecycleHint}</span></div> : null}
      <form key={record?.id ?? mode} className="admin-form admin-form--elevated" onSubmit={(event) => void submit(event)}>
        <div className="form-section"><div className="form-section__header"><span className="form-section__index">01</span><h4>{labels.basic}</h4></div><div className="form-grid">
          <label className="ui-field"><span>{labels.name} <strong className="required-star">*</strong></span><input name="displayName" required defaultValue={record?.displayName ?? ""} placeholder={labels.fullName} /></label>
          <label className="ui-field"><span>{labels.email} <strong className="required-star">*</strong></span><input name="email" type="email" required defaultValue={record?.email ?? ""} placeholder="user@elhabak.eg" /></label>
        </div></div>
        <div className="form-section"><div className="form-section__header"><span className="form-section__index">02</span><h4>{labels.roleSection}</h4></div><div className="form-grid">
          <label className="ui-field"><span>{labels.role} <strong className="required-star">*</strong></span><select name="role" defaultValue={record?.role ?? "ENGINEER"}>{roles.map((role) => <option value={role} key={role}>{roleLabel(role, locale)}</option>)}</select></label>
          {mode === "create" ? <div className="field-group-center"><label className="check-field check-field--toggle"><input name="isActive" type="checkbox" defaultChecked /><span>{labels.active}</span></label></div> : <div className="field-hint account-form-note">{labels.separateActions}</div>}
        </div></div>
        {mode === "create" ? <div className="form-section"><div className="form-section__header"><span className="form-section__index">03</span><h4>{labels.credentials}</h4></div><div className="form-grid"><label className="ui-field full-span"><span>{labels.password} <strong className="required-star">*</strong></span><input name="temporaryPassword" type="password" required minLength={10} autoComplete="new-password" placeholder={labels.passwordCreateHint} /></label></div></div> : null}
        {error ? <p className="form-error">{error}</p> : null}{success ? <p className="form-success">{success}</p> : null}
        <div className="form-actions-bar"><Link className="ui-button ui-button--secondary" href={withLocale("/app/admin/users", ar)}>{labels.back}</Link><button className="ui-button ui-button--primary" disabled={saving} type="submit">{saving ? labels.saving : labels.save}</button></div>
      </form>
    </section>
  );
}

function StatusBadge({ status, labels }: { status: AccountStatus; labels: ReturnType<typeof copy> }) {
  const tone = status === "ACTIVE" ? "success" : status === "SUSPENDED" ? "orange" : "neutral";
  return <Badge tone={tone}>{status === "ACTIVE" ? labels.active : status === "SUSPENDED" ? labels.suspended : labels.archived}</Badge>;
}

function ActionMenu({ user, currentUserId, labels, ar, onAction }: { user: UserRecord; currentUserId: string; labels: ReturnType<typeof copy>; ar: boolean; onAction: (kind: ActionKind) => void }) {
  const status = statusOf(user);
  const protectedAccount = user.id === currentUserId || user.email === "mohamed.elhabak@elhabak.local";
  return <div className="user-actions__menu" role="menu" onClick={(event) => event.stopPropagation()}>
    <Link role="menuitem" href={withLocale(`/app/admin/users/${user.id}`, ar)}><Pencil size={16} />{labels.viewEdit}</Link>
    {!protectedAccount && status === "ACTIVE" ? <button role="menuitem" onClick={() => onAction("suspend")}><PowerOff size={16} />{labels.suspend}</button> : null}
    {!protectedAccount && status === "SUSPENDED" ? <button role="menuitem" onClick={() => onAction("activate")}><Power size={16} />{labels.activate}</button> : null}
    {!protectedAccount && status === "ARCHIVED" ? <button role="menuitem" onClick={() => onAction("restore")}><RotateCcw size={16} />{labels.restore}</button> : null}
    {!protectedAccount && status !== "ARCHIVED" ? <button role="menuitem" onClick={() => onAction("reset")}><KeyRound size={16} />{labels.resetPassword}</button> : null}
    {!protectedAccount && status === "ACTIVE" ? <button role="menuitem" onClick={() => onAction("impersonate")}><LogIn size={16} />{labels.loginAs}</button> : null}
    {!protectedAccount && status !== "ARCHIVED" ? <button role="menuitem" className="danger" onClick={() => onAction("archive")}><Archive size={16} />{labels.archive}</button> : null}
    {!protectedAccount ? <button role="menuitem" className="danger" onClick={() => onAction("delete")}><Trash2 size={16} />{labels.deleteArchive}</button> : null}
  </div>;
}

function ActionDialog(props: { pending: PendingAction; labels: ReturnType<typeof copy>; ar: boolean; busy: boolean; confirmationText: string; temporaryPassword: string; onConfirmationText: (value: string) => void; onTemporaryPassword: (value: string) => void; onClose: () => void; onConfirm: () => void }) {
  const { pending, labels, busy } = props;
  const permanent = pending.kind === "delete" && pending.impact?.canPermanentlyDelete;
  const needsTypedEmail = permanent;
  const disabled = busy || (needsTypedEmail && props.confirmationText !== pending.user.email) || (pending.kind === "reset" && props.temporaryPassword.length < 10);
  return <div className="account-dialog-backdrop" role="presentation"><div className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title">
    <button className="account-dialog__close" type="button" onClick={props.onClose} aria-label={labels.close}><X size={19} /></button>
    <div className="account-dialog__icon">{dialogIcon(pending.kind)}</div>
    <h2 id="account-dialog-title">{dialogTitle(pending, props.ar)}</h2>
    <p>{dialogDescription(pending, props.ar)}</p>
    {pending.kind === "delete" && pending.impact && !pending.impact.canPermanentlyDelete ? <div className="deletion-impact"><strong>{labels.linkedHistory}</strong><ul>{pending.impact.linkedRecords.map((item) => <li key={item.relation}>{relationLabel(item.relation, props.ar)}: {item.count}</li>)}</ul><span>{labels.archiveInstead}</span></div> : null}
    {permanent ? <label className="ui-field"><span>{labels.typeEmail} <strong>{pending.user.email}</strong></span><input value={props.confirmationText} onChange={(event) => props.onConfirmationText(event.target.value)} autoComplete="off" /></label> : null}
    {pending.kind === "reset" ? <label className="ui-field"><span>{labels.newTemporaryPassword}</span><input type="password" minLength={10} value={props.temporaryPassword} onChange={(event) => props.onTemporaryPassword(event.target.value)} autoComplete="new-password" /><small>{labels.passwordRequirement}</small></label> : null}
    <div className="account-dialog__actions"><button className="ui-button ui-button--secondary" type="button" onClick={props.onClose}>{labels.cancel}</button><button className={pending.kind === "impersonate" || pending.kind === "activate" || pending.kind === "restore" ? "ui-button ui-button--primary" : "ui-button account-dialog__danger"} type="button" disabled={disabled} onClick={props.onConfirm}>{busy ? labels.processing : dialogConfirm(pending, props.ar)}</button></div>
  </div></div>;
}

function statusOf(user: UserRecord): AccountStatus {
  if (user.status) return user.status;
  if (user.archivedAt) return "ARCHIVED";
  return user.isActive ? "ACTIVE" : "SUSPENDED";
}

function withLocale(path: string, ar: boolean) { return ar ? path : `${path}?lang=en`; }
function formValue(data: FormData, key: string) { const value = data.get(key); return typeof value === "string" ? value : ""; }
function formatDate(value: string, locale: string) { return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { dateStyle: "medium" }).format(new Date(value)); }

function dialogIcon(kind: ActionKind) {
  if (kind === "reset") return <KeyRound size={22} />;
  if (kind === "impersonate") return <LogIn size={22} />;
  if (kind === "restore" || kind === "activate") return <Power size={22} />;
  if (kind === "suspend") return <PowerOff size={22} />;
  if (kind === "archive") return <Archive size={22} />;
  return <Trash2 size={22} />;
}

function dialogTitle(pending: PendingAction, ar: boolean) {
  const name = pending.user.displayName;
  const titles: Record<ActionKind, [string, string]> = {
    activate: [`تفعيل حساب ${name}`, `Activate ${name}`], suspend: [`تعليق حساب ${name}`, `Suspend ${name}`], restore: [`استعادة حساب ${name}`, `Restore ${name}`], archive: [`أرشفة حساب ${name}`, `Archive ${name}`], delete: pending.impact?.canPermanentlyDelete ? [`حذف ${name} نهائياً`, `Permanently delete ${name}`] : [`لا يمكن الحذف النهائي`, `Permanent deletion blocked`], reset: [`إعادة تعيين كلمة مرور ${name}`, `Reset password for ${name}`], impersonate: [`تسجيل الدخول بصلاحيات ${name}`, `Log in as ${name}`]
  };
  return titles[pending.kind][ar ? 0 : 1];
}

function dialogDescription(pending: PendingAction, ar: boolean) {
  const messages: Record<ActionKind, [string, string]> = {
    activate: ["سيصبح الحساب مؤهلاً لتسجيل الدخول دون تغيير الدور أو كلمة المرور.", "Login eligibility returns without changing role or password."],
    suspend: ["سيُرفض تسجيل الدخول وتُلغى كل الجلسات الحالية فوراً.", "Login will be blocked and all current sessions revoked immediately."],
    restore: ["سيعود الحساب المؤرشف إلى الحالة النشطة دون تغيير الدور أو كلمة المرور.", "Archived account returns active without changing role or password."],
    archive: ["سيُحفظ السجل التاريخي ويُمنع الحساب من تسجيل الدخول.", "Business history stays intact and the account can no longer sign in."],
    delete: pending.impact?.canPermanentlyDelete ? ["هذا الحساب بلا سجلات عمل مرتبطة. الحذف نهائي ولا يمكن التراجع عنه.", "This account has no linked business history. Deletion is permanent and cannot be undone."] : ["الحساب مرتبط بسجل أعمال أو تدقيق. يمكن أرشفته بأمان بدلاً من إتلاف التاريخ.", "This account owns business or audit history. Archive it safely instead of destroying history."],
    reset: ["استخدم كلمة مرور مؤقتة قوية. ستُلغى كل الجلسات الحالية ولن تظهر كلمة المرور في السجل.", "Set a strong temporary password. Current sessions will be revoked and the password will never enter audit logs."],
    impersonate: ["ستبقى هويتك الإدارية محفوظة على الخادم، وستطبق واجهة وصلاحيات المستخدم المستهدف حتى العودة.", "Your Admin identity stays server-side while the target user's UI and RBAC apply until you return."]
  };
  return messages[pending.kind][ar ? 0 : 1];
}

function dialogConfirm(pending: PendingAction, ar: boolean) {
  const labels: Record<ActionKind, [string, string]> = {
    activate: ["تفعيل", "Activate"], suspend: ["تعليق الحساب", "Suspend account"], restore: ["استعادة", "Restore"], archive: ["أرشفة", "Archive"], delete: pending.impact?.canPermanentlyDelete ? ["حذف نهائي", "Delete permanently"] : ["أرشفة بدلاً من الحذف", "Archive instead"], reset: ["تعيين كلمة المرور", "Set password"], impersonate: ["بدء الاستعراض", "Start viewing"]
  };
  return labels[pending.kind][ar ? 0 : 1];
}

function actionSuccess(kind: ActionKind, ar: boolean, impact?: DeletionImpact) {
  const messages: Record<ActionKind, [string, string]> = {
    activate: ["تم تفعيل الحساب.", "Account activated."], suspend: ["تم تعليق الحساب وإلغاء جلساته.", "Account suspended and sessions revoked."], restore: ["تمت استعادة الحساب.", "Account restored."], archive: ["تمت أرشفة الحساب مع حفظ سجله.", "Account archived with history preserved."], delete: impact?.canPermanentlyDelete ? ["تم حذف الحساب نهائياً.", "Account permanently deleted."] : ["تمت أرشفة الحساب المرتبط بسجل تاريخي.", "Linked account archived safely."], reset: ["تم تغيير كلمة المرور المؤقتة وإلغاء الجلسات.", "Temporary password changed and sessions revoked."], impersonate: ["", ""]
  };
  return messages[kind][ar ? 0 : 1];
}

function relationLabel(relation: string, ar: boolean) {
  const english: Record<string, string> = { clientProfile: "Client profile", assignments: "Project assignments", engineeredProjects: "Managed projects", siteUpdates: "Site updates", uploadedMedia: "Uploaded media", uploadedDesignRevisions: "Design revisions", designEvents: "Design history", auditLogs: "Audit history", financialProfilesUpdated: "Finance profiles", costEstimatesCreated: "Cost estimates", boqItemsCreated: "BOQ items", expensesCreated: "Expenses", clientPaymentsCreated: "Client payments", contractorPaymentsCreated: "Contractor payments", financialAttachmentsUploaded: "Finance files", documentsCreated: "Documents", documentVersionsUploaded: "Document versions", projectMessages: "Chat messages", chatReadStates: "Chat history", notifications: "Notifications" };
  const arabic: Record<string, string> = { clientProfile: "ملف عميل", assignments: "تكليفات مشاريع", engineeredProjects: "مشاريع مُدارة", siteUpdates: "تحديثات موقع", uploadedMedia: "وسائط مرفوعة", uploadedDesignRevisions: "مراجعات تصميم", designEvents: "سجل التصميم", auditLogs: "سجل التدقيق", financialProfilesUpdated: "ملفات مالية", costEstimatesCreated: "مقايسات", boqItemsCreated: "بنود كميات", expensesCreated: "مصروفات", clientPaymentsCreated: "دفعات عملاء", contractorPaymentsCreated: "دفعات مقاولين", financialAttachmentsUploaded: "ملفات مالية", documentsCreated: "مستندات", documentVersionsUploaded: "إصدارات مستندات", projectMessages: "رسائل دردشة", chatReadStates: "سجل دردشة", notifications: "إشعارات" };
  return (ar ? arabic : english)[relation] ?? relation;
}

function copy(ar: boolean) {
  return ar ? {
    title: "إدارة المستخدمين", lead: "دورة حياة الحسابات واختبار الصلاحيات من مكان واحد آمن.", create: "إنشاء مستخدم", edit: "تعديل المستخدم", back: "العودة للمستخدمين", search: "بحث بالاسم أو البريد", empty: "لا يوجد مستخدمون مطابقون", emptyHint: "غيّر البحث أو عوامل التصفية.", name: "الاسم", email: "البريد الإلكتروني", role: "الدور", active: "نشط", suspended: "معلّق", archived: "مؤرشف", password: "كلمة مرور مؤقتة", save: "حفظ التغييرات", saved: "تم الحفظ.", saving: "جاري الحفظ...", status: "الحالة", created: "تاريخ الإنشاء", actions: "الإجراءات", loadingLabel: "جاري تحميل المستخدمين...", total: "الإجمالي", activeCount: "النشط", suspendedCount: "المعلّق", archivedCount: "المؤرشف", roleDistribution: "توزيع الأدوار", accountSummary: "ملخص الحسابات", filterRole: "تصفية حسب الدور", filterStatus: "تصفية حسب الحالة", allRoles: "كل الأدوار", allStatuses: "كل الحالات", viewEdit: "عرض / تعديل", activate: "تفعيل", suspend: "تعليق", restore: "استعادة", resetPassword: "إعادة تعيين كلمة المرور", loginAs: "الدخول كمستخدم", archive: "أرشفة", deleteArchive: "حذف / أرشفة", close: "إغلاق", cancel: "إلغاء", processing: "جاري التنفيذ...", linkedHistory: "السجلات المرتبطة", archiveInstead: "لن يُحذف أي سجل تاريخي. المتاح هو أرشفة الحساب.", typeEmail: "اكتب البريد للتأكيد:", newTemporaryPassword: "كلمة المرور المؤقتة الجديدة", passwordRequirement: "10 أحرف على الأقل.", requestFailed: "فشل الطلب.", basic: "البيانات الأساسية", fullName: "الاسم الكامل", roleSection: "الدور الوظيفي", credentials: "بيانات الدخول", passwordCreateHint: "كلمة مرور مؤقتة (10 أحرف على الأقل)", separateActions: "التفعيل والتعليق وكلمة المرور إجراءات منفصلة ومؤكدة من قائمة المستخدم.", lifecycleHint: "غيّر حالة الحساب أو كلمة المرور من قائمة الإجراءات لضمان التأكيد والتدقيق.", editHint: "تعديل الهوية والدور دون تغيير حالة الحساب أو كلمة المرور.", createHint: "أنشئ حساباً بدور واضح وكلمة مرور مؤقتة آمنة."
  } : {
    title: "User Management", lead: "Account lifecycle and permission testing from one secure console.", create: "Create user", edit: "Edit user", back: "Back to users", search: "Search name or email", empty: "No matching users", emptyHint: "Adjust search or filters.", name: "Name", email: "Email", role: "Role", active: "Active", suspended: "Suspended", archived: "Archived", password: "Temporary password", save: "Save changes", saved: "Saved.", saving: "Saving...", status: "Status", created: "Created", actions: "Actions", loadingLabel: "Loading users...", total: "Total", activeCount: "Active", suspendedCount: "Suspended", archivedCount: "Archived", roleDistribution: "Role distribution", accountSummary: "Account summary", filterRole: "Filter by role", filterStatus: "Filter by status", allRoles: "All roles", allStatuses: "All statuses", viewEdit: "View / Edit", activate: "Activate", suspend: "Suspend", restore: "Restore", resetPassword: "Reset password", loginAs: "Login as user", archive: "Archive", deleteArchive: "Delete / Archive", close: "Close", cancel: "Cancel", processing: "Processing...", linkedHistory: "Linked history", archiveInstead: "No historical record will be deleted. Archive is the safe available action.", typeEmail: "Type the email to confirm:", newTemporaryPassword: "New temporary password", passwordRequirement: "At least 10 characters.", requestFailed: "Request failed.", basic: "Basic information", fullName: "Full name", roleSection: "User role", credentials: "Credentials", passwordCreateHint: "Temporary password (at least 10 characters)", separateActions: "Activation, suspension, and password reset are separate confirmed actions in the user menu.", lifecycleHint: "Change account status or password from the actions menu for confirmation and audit coverage.", editHint: "Edit identity and role without silently changing account state or password.", createHint: "Create an account with a clear role and secure temporary password."
  };
}
