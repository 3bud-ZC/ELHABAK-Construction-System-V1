"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { apiRequest } from "../../lib/api";

type Props = {
  locale: "ar" | "en";
  onDone: () => void;
};

/**
 * First-login gate for accounts provisioned with a temporary credential. Rendered in
 * place of the whole app shell; the API independently confines the session to
 * /auth/me, /auth/password/change, and /auth/logout until the flag clears.
 */
export function ForcePasswordChange({ locale, onDone }: Props) {
  const router = useRouter();
  const ar = locale === "ar";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labels = useMemo(
    () =>
      ar
        ? {
            title: "تعيين كلمة مرور جديدة",
            lead: "تم إنشاء حسابك بكلمة مرور مؤقتة. لأسباب أمنية يجب تعيين كلمة مرور خاصة بك قبل استخدام النظام.",
            temporary: "كلمة المرور المؤقتة",
            next: "كلمة المرور الجديدة",
            nextHint: "10 أحرف على الأقل.",
            confirm: "تأكيد كلمة المرور الجديدة",
            mismatch: "كلمتا المرور غير متطابقتين.",
            submit: "تعيين كلمة المرور والمتابعة",
            saving: "جاري الحفظ...",
            logout: "تسجيل الخروج",
            note: "بعد الحفظ تُلغى الجلسات الأخرى تلقائياً وتكمل هذه الجلسة بأمان."
          }
        : {
            title: "Set a new password",
            lead: "Your account was provisioned with a temporary password. For security you must set your own password before using the system.",
            temporary: "Temporary password",
            next: "New password",
            nextHint: "At least 10 characters.",
            confirm: "Confirm new password",
            mismatch: "Passwords do not match.",
            submit: "Set password and continue",
            saving: "Saving...",
            logout: "Sign out",
            note: "After saving, other sessions are revoked and this session continues safely."
          },
    [ar]
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const currentPassword = field(data, "currentPassword");
    const newPassword = field(data, "newPassword");
    if (newPassword !== field(data, "confirmation")) {
      setError(labels.mismatch);
      return;
    }
    setBusy(true);
    try {
      await apiRequest("/auth/password/change", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword })
      });
      onDone();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await apiRequest<{ ok: true }>("/auth/logout", { method: "POST", body: "{}" }).catch(() => undefined);
    router.replace(ar ? "/login" : "/login?lang=en");
  }

  return (
    <main className="force-password" lang={locale} dir={ar ? "rtl" : "ltr"}>
      <section className="force-password__card">
        <Image src="/brand/logo-horizontal.png" alt="ELHABAK Construction" width={150} height={62} priority />
        <span className="force-password__icon" aria-hidden="true">
          <ShieldCheck size={22} />
        </span>
        <h1>{labels.title}</h1>
        <p className="force-password__lead">{labels.lead}</p>
        <form onSubmit={(event) => void submit(event)}>
          <label className="ui-field">
            <span>{labels.temporary}</span>
            <input name="currentPassword" type="password" required autoComplete="current-password" />
          </label>
          <label className="ui-field">
            <span>{labels.next}</span>
            <input name="newPassword" type="password" required minLength={10} autoComplete="new-password" />
            <small>{labels.nextHint}</small>
          </label>
          <label className="ui-field">
            <span>{labels.confirm}</span>
            <input name="confirmation" type="password" required minLength={10} autoComplete="new-password" />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="ui-button ui-button--primary force-password__submit" disabled={busy} type="submit">
            <KeyRound size={15} /> {busy ? labels.saving : labels.submit}
          </button>
        </form>
        <p className="force-password__note">{labels.note}</p>
        <button type="button" className="force-password__logout" onClick={() => void logout()}>
          <LogOut size={14} /> {labels.logout}
        </button>
      </section>
    </main>
  );
}

function field(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}
