"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiRequest } from "../../lib/api";

type LoginFormProps = {
  locale: "ar" | "en";
  labels: {
    email: string;
    password: string;
    submit: string;
    invalid: string;
    server: string;
    showPassword: string;
    hidePassword: string;
    required: string;
  };
};

export function LoginForm({ locale, labels }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError(labels.required);
      return;
    }

    setLoading(true);

    try {
      const result = await apiRequest<{ user: { role: string } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      const target = result.user.role === "ADMIN" ? "/app/admin/users" : "/app";
      router.replace(locale === "ar" ? target : `${target}?lang=en`);
    } catch (requestError) {
      setError(requestError instanceof Error && requestError.message ? labels.invalid : labels.server);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={(event) => void submit(event)}>
      <label className="ui-field" htmlFor="email">
        <span>{labels.email}</span>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={loading}
        />
      </label>
      <label className="ui-field password-field" htmlFor="password">
        <span>{labels.password}</span>
        <span className="password-input">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
          />
          <button
            type="button"
            className="icon-button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? labels.hidePassword : labels.showPassword}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </span>
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="ui-button ui-button--primary login-submit" type="submit" disabled={loading}>
        {loading ? (locale === "ar" ? "جاري الدخول..." : "Signing in...") : labels.submit}
      </button>
    </form>
  );
}
