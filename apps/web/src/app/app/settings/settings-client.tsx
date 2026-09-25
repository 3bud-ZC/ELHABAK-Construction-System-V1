"use client";

import { FormEvent, useState } from "react";
import { apiRequest } from "../../../lib/api";
import { useCurrentUser } from "../../../lib/user-context";

export function SettingsClient() {
  const user = useCurrentUser();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ar = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("lang") !== "en";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null); setMessage(null);
    const data = new FormData(event.currentTarget);
    const currentPassword = formValue(data, "currentPassword");
    const newPassword = formValue(data, "newPassword");
    const confirmation = formValue(data, "confirmation");
    if (newPassword !== confirmation) { setError(ar ? "كلمتا المرور غير متطابقتين." : "Passwords do not match."); setBusy(false); return; }
    try {
      await apiRequest("/auth/password/change", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
      event.currentTarget.reset(); setMessage(ar ? "تم تغيير كلمة المرور وإلغاء الجلسات الأخرى." : "Password changed and other sessions revoked.");
    } catch (err) { setError(err instanceof Error ? err.message : "Request failed."); }
    finally { setBusy(false); }
  }

  return <section className="app-page settings-page">
    <header className="page-header"><div><span className="section-kicker">{ar ? "الحساب" : "ACCOUNT"}</span><h1>{ar ? "الإعدادات" : "Settings"}</h1><p>{ar ? "إدارة بيانات الحساب وكلمة المرور." : "Manage your account details and password."}</p></div></header>
    <div className="settings-grid">
      <section className="console-surface settings-identity"><h2>{ar ? "بيانات الحساب" : "Account details"}</h2><dl><div><dt>{ar ? "الاسم" : "Name"}</dt><dd>{user.displayName}</dd></div><div><dt>{ar ? "معرّف الدخول" : "Login identifier"}</dt><dd className="mono" dir="ltr">{user.email}</dd></div></dl></section>
      <form className="console-surface settings-password" onSubmit={(event) => void submit(event)}><h2>{ar ? "تغيير كلمة المرور" : "Change password"}</h2><label className="ui-field"><span>{ar ? "كلمة المرور الحالية" : "Current password"}</span><input name="currentPassword" type="password" required autoComplete="current-password" /></label><label className="ui-field"><span>{ar ? "كلمة المرور الجديدة" : "New password"}</span><input name="newPassword" type="password" required minLength={10} autoComplete="new-password" /><small>{ar ? "10 أحرف على الأقل." : "At least 10 characters."}</small></label><label className="ui-field"><span>{ar ? "تأكيد كلمة المرور" : "Confirm password"}</span><input name="confirmation" type="password" required minLength={10} autoComplete="new-password" /></label>{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}<button className="ui-button ui-button--primary" disabled={busy} type="submit">{busy ? (ar ? "جاري الحفظ..." : "Saving...") : (ar ? "حفظ كلمة المرور" : "Save password")}</button></form>
    </div>
  </section>;
}

function formValue(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}
