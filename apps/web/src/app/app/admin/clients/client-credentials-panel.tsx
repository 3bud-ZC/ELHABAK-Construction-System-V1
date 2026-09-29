"use client";

import { type ReactNode, useState } from "react";
import { Check, ClipboardCopy, Copy, KeyRound, ShieldAlert } from "lucide-react";

export type OneTimeCredentials = {
  displayName: string;
  email: string;
  phone: string | null;
  temporaryPassword: string;
};

type Props = {
  credentials: OneTimeCredentials;
  locale: "ar" | "en";
  kind: "created" | "reset";
  /** Dismissal drops the plaintext from component state; it cannot be shown again. */
  onDone: () => void;
  doneLabel?: string;
  extraAction?: ReactNode;
};

type CopyTarget = "login" | "password" | "all";

/**
 * One-time surface for an Admin-generated client credential. The plaintext lives only in
 * the parent's state until `onDone`; the server never returns it again.
 */
export function ClientCredentialsPanel({ credentials, locale, kind, onDone, doneLabel, extraAction }: Props) {
  const ar = locale === "ar";
  const [copied, setCopied] = useState<CopyTarget | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);

  const t = ar
    ? {
        title: kind === "created" ? "تم إنشاء حساب العميل" : "تم إنشاء كلمة مرور مؤقتة جديدة",
        warning:
          kind === "created"
            ? "تظهر كلمة المرور المؤقتة هنا مرة واحدة فقط ولا يمكن استرجاعها لاحقاً. انسخها وأرسلها للعميل الآن؛ سيُطلب منه تعيين كلمة مرور خاصة عند أول دخول."
            : "أُلغيت كلمة المرور السابقة وكل جلسات العميل. تظهر كلمة المرور الجديدة هنا مرة واحدة فقط؛ انسخها وأرسلها للعميل الآن.",
        name: "العميل",
        login: "معرّف الدخول",
        phone: "الهاتف",
        password: "كلمة المرور المؤقتة",
        copyLogin: "نسخ البريد",
        copyPassword: "نسخ كلمة المرور",
        copyAll: "نسخ بيانات الدخول",
        copied: "تم النسخ",
        copyFailed: "تعذر النسخ تلقائياً. حدّد النص وانسخه يدوياً.",
        hint: "٨ أرقام فقط.",
        done: doneLabel ?? "تم — إخفاء كلمة المرور"
      }
    : {
        title: kind === "created" ? "Client account created" : "New temporary password generated",
        warning:
          kind === "created"
            ? "This temporary password is shown only once and cannot be retrieved later. Copy it and send it to the client now; they will set a private password at first sign-in."
            : "The previous password and every client session were revoked. The new password is shown only once; copy it and send it to the client now.",
        name: "Client",
        login: "Login ID",
        phone: "Phone",
        password: "Temporary password",
        copyLogin: "Copy email",
        copyPassword: "Copy Password",
        copyAll: "Copy Credentials",
        copied: "Copied",
        copyFailed: "Automatic copy failed. Select the text and copy it manually.",
        hint: "8 digits only.",
        done: doneLabel ?? "Done — hide password"
      };

  // The message the Admin pastes into WhatsApp: plain words, no technical wording, and each
  // value on its own line so the client can long-press copy just that value.
  const fullText = ar
    ? [
        "بيانات دخول العميل",
        "",
        "البريد:",
        credentials.email,
        "",
        "كلمة المرور المؤقتة:",
        credentials.temporaryPassword,
        "",
        "يمكنك تغيير كلمة المرور بعد تسجيل الدخول."
      ].join("\n")
    : [
        "Client sign-in details",
        "",
        "Email:",
        credentials.email,
        "",
        "Temporary password:",
        credentials.temporaryPassword,
        "",
        "You can change your password after signing in."
      ].join("\n");

  async function copy(target: CopyTarget, text: string) {
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(target);
      window.setTimeout(() => setCopied((current) => (current === target ? null : current)), 2500);
    } catch {
      setCopyFailed(true);
    }
  }

  return (
    <section className="credential-reveal credential-panel" role="region" aria-label={t.title} aria-live="polite">
      <header className="credential-reveal__header">
        <KeyRound size={20} className="credential-reveal__icon" aria-hidden="true" />
        <div>
          <strong className="credential-panel__title">{t.title}</strong>
          <p className="credential-reveal__warning">
            <ShieldAlert size={14} aria-hidden="true" /> {t.warning}
          </p>
        </div>
      </header>

      <dl className="credential-panel__facts">
        <div>
          <dt>{t.name}</dt>
          <dd dir="auto">{credentials.displayName}</dd>
        </div>
        <div>
          <dt>{t.login}</dt>
          <dd><bdi className="mono" dir="ltr">{credentials.email}</bdi></dd>
        </div>
        {credentials.phone ? (
          <div>
            <dt>{t.phone}</dt>
            <dd><bdi className="mono" dir="ltr">{credentials.phone}</bdi></dd>
          </div>
        ) : null}
        <div className="credential-panel__secret">
          <dt>{t.password}</dt>
          <dd>
            <code className="credential-panel__password" dir="ltr" translate="no">{credentials.temporaryPassword}</code>
            <small>{t.hint}</small>
          </dd>
        </div>
      </dl>

      <div className="credential-panel__copy">
        <CopyButton active={copied === "login"} label={t.copyLogin} copiedLabel={t.copied} onClick={() => void copy("login", credentials.email)} />
        <CopyButton active={copied === "password"} label={t.copyPassword} copiedLabel={t.copied} onClick={() => void copy("password", credentials.temporaryPassword)} />
        <CopyButton active={copied === "all"} label={t.copyAll} copiedLabel={t.copied} onClick={() => void copy("all", fullText)} primary />
      </div>
      {copyFailed ? <p className="form-error" role="alert">{t.copyFailed}</p> : null}

      <div className="credential-reveal__actions">
        {extraAction}
        <button type="button" className="ui-button ui-button--secondary" onClick={onDone}>{t.done}</button>
      </div>
    </section>
  );
}

function CopyButton({ active, label, copiedLabel, onClick, primary = false }: { active: boolean; label: string; copiedLabel: string; onClick: () => void; primary?: boolean }) {
  return (
    <button type="button" className={`ui-button ${primary ? "ui-button--primary" : "ui-button--secondary"}`} onClick={onClick}>
      {active ? <Check size={16} aria-hidden="true" /> : primary ? <ClipboardCopy size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      <span>{active ? copiedLabel : label}</span>
    </button>
  );
}
