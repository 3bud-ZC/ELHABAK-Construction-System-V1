"use client";

import { FormEvent, useState } from "react";
import { OperationsGrid, OperationsMetric, OperationsPanel } from "@elhabak/ui";
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
    <header className="page-header"><div><span className="section-kicker">{ar ? "الحساب" : "ACCOUNT"}</span><h1>{ar ? "إعدادات الحساب" : "Account settings"}</h1><p>{ar ? "هوية الحساب، معرّف الدخول، وتغيير كلمة المرور من مساحة واحدة واضحة." : "Account identity, login identifier, and password change in one clear workspace."}</p></div></header>
    <div className="settings-grid settings-ops-grid">
      <OperationsPanel className="settings-identity" eyebrow={ar ? "هوية الحساب" : "IDENTITY"} title={ar ? "بيانات الدخول الحالية" : "Current access details"}>
        <OperationsGrid columns="repeat(3, minmax(150px, 1fr))">
          <OperationsMetric tone="navy" label={ar ? "الاسم" : "Name"} value={<bdi>{user.displayName}</bdi>} />
          <OperationsMetric tone="neutral" label={ar ? "معرّف الدخول" : "Login identifier"} value={<bdi dir="ltr">{user.email}</bdi>} />
          <OperationsMetric tone="success" label={ar ? "الدور" : "Role"} value={user.role} hint={user.mustChangePassword ? (ar ? "تغيير كلمة المرور مطلوب عند الدخول الأول" : "Password change required on first login") : undefined} />
        </OperationsGrid>
      </OperationsPanel>
      <OperationsPanel className="settings-password" eyebrow={ar ? "الأمان" : "SECURITY"} title={ar ? "تغيير كلمة المرور" : "Change password"} description={ar ? "يحافظ النظام على إجبار تغيير كلمة المرور لأول دخول، وتؤدي هذه العملية إلى إلغاء الجلسات الأخرى." : "First-login forced password change remains enforced; changing password revokes other sessions."}>
        <form className="settings-password__form" onSubmit={(event) => void submit(event)}>
          <label className="ui-field"><span>{ar ? "كلمة المرور الحالية" : "Current password"}</span><input name="currentPassword" type="password" required autoComplete="current-password" /></label>
          <label className="ui-field"><span>{ar ? "كلمة المرور الجديدة" : "New password"}</span><input name="newPassword" type="password" required minLength={10} autoComplete="new-password" /><small>{ar ? "10 أحرف على الأقل." : "At least 10 characters."}</small></label>
          <label className="ui-field"><span>{ar ? "تأكيد كلمة المرور" : "Confirm password"}</span><input name="confirmation" type="password" required minLength={10} autoComplete="new-password" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message}</p>}
          <footer className="form-actions-bar"><button className="ui-button ui-button--primary" disabled={busy} type="submit">{busy ? (ar ? "جاري الحفظ..." : "Saving...") : (ar ? "حفظ كلمة المرور" : "Save password")}</button></footer>
        </form>
      </OperationsPanel>
    </div>
  </section>;
}

function formValue(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}
