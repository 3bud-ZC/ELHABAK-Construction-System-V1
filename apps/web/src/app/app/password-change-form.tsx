"use client";

import { type FormEvent, useId, useState } from "react";
import { Check, Circle, Eye, EyeOff, KeyRound } from "lucide-react";
import { passwordMinLength, passwordPolicyIssue, type PasswordPolicyAudience } from "@elhabak/validation/password-policy";
import { ApiError, apiRequest } from "../../lib/api";

type Locale = "ar" | "en";

type PasswordFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  locale: Locale;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
};

/** Password input with an in-field show/hide toggle; value is never trimmed or rewritten. */
export function PasswordField({ label, name, value, onChange, autoComplete, locale, describedBy, invalid, disabled }: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const ar = locale === "ar";
  return (
    <label className="ui-field password-field" htmlFor={id}>
      <span>{label}</span>
      <span className="password-input">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          className="icon-button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? (ar ? "إخفاء كلمة المرور" : "Hide password") : (ar ? "إظهار كلمة المرور" : "Show password")}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}

type Props = {
  locale: Locale;
  /** `first-login` labels the current field as the temporary password. */
  variant: "settings" | "first-login";
  onChanged?: () => void;
  submitLabel?: string;
  /** Clients choose any 8+ character password; staff keep the stronger rule. */
  audience: PasswordPolicyAudience;
};

/**
 * Current / new / confirm password form backed by POST /auth/password/change. The shared
 * policy gives a live checklist, but the API re-validates everything; server error codes
 * map to precise localized messages instead of a generic failure.
 */
export function PasswordChangeForm({ locale, variant, onChanged, submitLabel, audience }: Props) {
  const ar = locale === "ar";
  const rulesId = useId();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const minLength = passwordMinLength(audience);
  const needsMix = audience === "staff";
  const issue = passwordPolicyIssue(newPassword, audience);
  const lengthOk = Array.from(newPassword).length >= minLength;
  const mixOk = newPassword.length > 0 && /\p{L}/u.test(newPassword) && /[\p{N}\p{P}\p{S}]/u.test(newPassword);
  const edgeOk = newPassword.length > 0 && newPassword === newPassword.trim();
  const matches = confirmation.length > 0 && confirmation === newPassword;

  const t = ar
    ? {
        current: variant === "first-login" ? "كلمة المرور المؤقتة" : "كلمة المرور الحالية",
        next: "كلمة المرور الجديدة",
        confirm: "تأكيد كلمة المرور الجديدة",
        ruleLength: `${minLength} أحرف أو أرقام على الأقل`,
        ruleMix: "حرف واحد على الأقل ورقم أو رمز",
        ruleEdge: "بدون مسافات في البداية أو النهاية",
        ruleMatch: "التأكيد مطابق",
        mismatch: "كلمتا المرور غير متطابقتين.",
        weak: "كلمة المرور الجديدة لا تستوفي الشروط الموضحة.",
        same: "كلمة المرور الجديدة يجب أن تختلف عن الحالية.",
        wrongCurrent: variant === "first-login" ? "كلمة المرور المؤقتة غير صحيحة." : "كلمة المرور الحالية غير صحيحة.",
        impersonation: "لا يمكن تغيير كلمة المرور أثناء استعراض حساب مستخدم آخر.",
        submit: submitLabel ?? "حفظ كلمة المرور",
        saving: "جاري الحفظ...",
        done: "تم تغيير كلمة المرور. أُلغيت الجلسات الأخرى وبقيت هذه الجلسة نشطة."
      }
    : {
        current: variant === "first-login" ? "Temporary password" : "Current password",
        next: "New password",
        confirm: "Confirm new password",
        ruleLength: `At least ${minLength} characters`,
        ruleMix: "At least one letter and one number or symbol",
        ruleEdge: "No spaces at the start or end",
        ruleMatch: "Confirmation matches",
        mismatch: "Passwords do not match.",
        weak: "The new password does not meet the listed requirements.",
        same: "The new password must differ from the current one.",
        wrongCurrent: variant === "first-login" ? "The temporary password is incorrect." : "The current password is incorrect.",
        impersonation: "Passwords cannot be changed while viewing as another user.",
        submit: submitLabel ?? "Save password",
        saving: "Saving...",
        done: "Password changed. Other sessions were signed out; this session stays active."
      };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (issue) {
      setError(t.weak);
      return;
    }
    if (newPassword !== confirmation) {
      setError(t.mismatch);
      return;
    }
    setBusy(true);
    try {
      await apiRequest("/auth/password/change", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setSuccess(t.done);
      onChanged?.();
    } catch (requestError) {
      setError(messageFor(requestError, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="password-change-form" noValidate onSubmit={(event) => void submit(event)}>
      <PasswordField label={t.current} name="currentPassword" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" locale={locale} disabled={busy} />
      <PasswordField label={t.next} name="newPassword" value={newPassword} onChange={setNewPassword} autoComplete="new-password" locale={locale} describedBy={rulesId} invalid={newPassword.length > 0 && Boolean(issue)} disabled={busy} />
      <PasswordField label={t.confirm} name="confirmation" value={confirmation} onChange={setConfirmation} autoComplete="new-password" locale={locale} invalid={confirmation.length > 0 && !matches} disabled={busy} />
      <ul className="password-rules" id={rulesId} aria-live="polite">
        <Rule ok={lengthOk} label={t.ruleLength} />
        {needsMix ? <Rule ok={mixOk} label={t.ruleMix} /> : null}
        <Rule ok={edgeOk} label={t.ruleEdge} />
        <Rule ok={matches} label={t.ruleMatch} />
      </ul>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {success ? <p className="form-success" role="status">{success}</p> : null}
      <footer className="password-change-form__actions">
        <button className="ui-button ui-button--primary" disabled={busy || !currentPassword || !newPassword || !confirmation} type="submit">
          <KeyRound size={18} aria-hidden="true" />
          {busy ? t.saving : t.submit}
        </button>
      </footer>
    </form>
  );
}

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={ok ? "is-met" : undefined}>
      {ok ? <Check size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}
      <span>{label}</span>
    </li>
  );
}

function messageFor(error: unknown, t: { wrongCurrent: string; weak: string; same: string; impersonation: string }) {
  if (error instanceof ApiError) {
    if (error.code === "CURRENT_PASSWORD_INVALID") return t.wrongCurrent;
    if (error.code === "PASSWORD_POLICY") return error.reason === "same_as_current" ? t.same : t.weak;
    if (error.code === "PASSWORD_CHANGE_IMPERSONATION") return t.impersonation;
    return error.message;
  }
  return error instanceof Error ? error.message : "Request failed.";
}
