"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { OperationsHeader } from "@elhabak/ui";
import { apiRequest, roleLabel } from "../../../lib/api";
import { useCurrentUser } from "../../../lib/user-context";

export function SettingsClient() {
  const user = useCurrentUser();
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null); setMessage(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = formValue(data, "currentPassword");
    const newPassword = formValue(data, "newPassword");
    const confirmation = formValue(data, "confirmation");
    if (newPassword !== confirmation) { setError(ar ? "كلمتا المرور غير متطابقتين." : "Passwords do not match."); setBusy(false); return; }
    try {
      await apiRequest("/auth/password/change", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
      form.reset(); setMessage(ar ? "تم تغيير كلمة المرور وإلغاء الجلسات الأخرى." : "Password changed and other sessions revoked.");
    } catch (err) { setError(err instanceof Error ? err.message : "Request failed."); }
    finally { setBusy(false); }
  }

  return <section className="app-page settings-page">
    <OperationsHeader
      eyebrow={ar ? "الحساب" : "Account"}
      title={ar ? "إعدادات الحساب" : "Account settings"}
      description={ar ? "هوية الحساب، معرّف الدخول، وتغيير كلمة المرور من مساحة واحدة واضحة." : "Account identity, login identifier, and password change in one clear workspace."}
    />
    <div className="settings-layout">
      <section className="settings-card settings-identity" aria-labelledby="settings-identity-title">
        <header className="settings-card__head">
          <span className="settings-card__icon" aria-hidden="true"><UserRound size={20} /></span>
          <div>
            <span className="section-kicker">{ar ? "هوية الحساب" : "Identity"}</span>
            <h2 id="settings-identity-title">{ar ? "بيانات الدخول الحالية" : "Current access details"}</h2>
          </div>
        </header>
        <dl className="settings-facts">
          <div><dt>{ar ? "الاسم" : "Name"}</dt><dd dir="auto">{user.displayName}</dd></div>
          <div><dt>{ar ? "معرّف الدخول" : "Login identifier"}</dt><dd><bdi className="mono settings-login-id" dir="ltr">{user.email}</bdi></dd></div>
          <div><dt>{ar ? "الدور" : "Role"}</dt><dd>{roleLabel(user.role, locale)} <bdi className="mono settings-role-code" dir="ltr">{user.role}</bdi></dd></div>
          <div>
            <dt>{ar ? "حالة كلمة المرور" : "Password state"}</dt>
            <dd className={user.mustChangePassword ? "settings-state settings-state--warning" : "settings-state"}>
              <ShieldCheck size={16} aria-hidden="true" />
              {user.mustChangePassword
                ? (ar ? "تغيير كلمة المرور مطلوب عند الدخول الأول" : "Password change required on first login")
                : (ar ? "كلمة مرور خاصة مفعّلة" : "Private password in use")}
            </dd>
          </div>
        </dl>
      </section>

      <section className="settings-card settings-password" aria-labelledby="settings-password-title">
        <header className="settings-card__head">
          <span className="settings-card__icon settings-card__icon--accent" aria-hidden="true"><KeyRound size={20} /></span>
          <div>
            <span className="section-kicker">{ar ? "الأمان" : "Security"}</span>
            <h2 id="settings-password-title">{ar ? "تغيير كلمة المرور" : "Change password"}</h2>
            <p>{ar ? "تغيير كلمة المرور يلغي جميع الجلسات الأخرى على الأجهزة الأخرى." : "Changing your password signs out every other session."}</p>
          </div>
        </header>
        <form className="settings-password__form" onSubmit={(event) => void submit(event)}>
          <label className="ui-field"><span>{ar ? "كلمة المرور الحالية" : "Current password"}</span><input name="currentPassword" type="password" required autoComplete="current-password" /></label>
          <label className="ui-field"><span>{ar ? "كلمة المرور الجديدة" : "New password"}</span><input name="newPassword" type="password" required minLength={10} autoComplete="new-password" aria-describedby="settings-password-rule" /><small id="settings-password-rule">{ar ? "10 أحرف على الأقل." : "At least 10 characters."}</small></label>
          <label className="ui-field"><span>{ar ? "تأكيد كلمة المرور" : "Confirm password"}</span><input name="confirmation" type="password" required minLength={10} autoComplete="new-password" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message}</p>}
          <footer className="settings-password__actions"><button className="ui-button ui-button--primary" disabled={busy} type="submit"><KeyRound size={18} />{busy ? (ar ? "جاري الحفظ..." : "Saving...") : (ar ? "حفظ كلمة المرور" : "Save password")}</button></footer>
        </form>
      </section>
    </div>
  </section>;
}

function formValue(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}
