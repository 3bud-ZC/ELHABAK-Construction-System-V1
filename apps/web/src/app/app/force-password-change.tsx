"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { PasswordChangeForm } from "./password-change-form";

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

  const labels = useMemo(
    () =>
      ar
        ? {
            title: "تعيين كلمة مرور جديدة",
            lead: "تم إنشاء حسابك بكلمة مرور مؤقتة. لأسباب أمنية يجب تعيين كلمة مرور خاصة بك قبل استخدام النظام.",
            submit: "تعيين كلمة المرور والمتابعة",
            logout: "تسجيل الخروج",
            note: "بعد الحفظ تُلغى الجلسات الأخرى تلقائياً وتكمل هذه الجلسة بأمان."
          }
        : {
            title: "Set a new password",
            lead: "Your account was provisioned with a temporary password. For security you must set your own password before using the system.",
            submit: "Set password and continue",
            logout: "Sign out",
            note: "After saving, other sessions are revoked and this session continues safely."
          },
    [ar]
  );

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
        <PasswordChangeForm locale={locale} variant="first-login" submitLabel={labels.submit} onChanged={onDone} />
        <p className="force-password__note">{labels.note}</p>
        <button type="button" className="force-password__logout" onClick={() => void logout()}>
          <LogOut size={14} /> {labels.logout}
        </button>
      </section>
    </main>
  );
}
