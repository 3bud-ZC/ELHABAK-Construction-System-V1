import Image from "next/image";
import { Button } from "@elhabak/ui";
import { dictionary, resolveLocale, textDirections } from "../../i18n/translations";
import { LoginForm } from "./login-form";

type PageProps = {
  searchParams?: Promise<{ lang?: string }>;
};

function langHref(locale: "ar" | "en", path = "/login") {
  return locale === "ar" ? path : `${path}?lang=en`;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const locale = resolveLocale(params?.lang);
  const alternate = locale === "ar" ? "en" : "ar";
  const t = dictionary[locale].login;
  const dir = textDirections[locale];

  return (
    <main className="login-shell" lang={locale} dir={dir}>
      <section className="login-brand">
        <Image
          src="/brand/logo-horizontal.png"
          alt="ELHABAK Construction"
          width={300}
          height={125}
          priority
        />
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <div className="login-card__top">
            <Button href={langHref(locale, "/")} variant="secondary">
              {t.back}
            </Button>
            <a className="lang-link" href={langHref(alternate)}>
              {t.language}
            </a>
          </div>
          <h2>{t.title}</h2>
          <p>{t.subtitle}</p>
          <LoginForm
            locale={locale}
            labels={{
              email: t.email,
              password: t.password,
              submit: t.submit,
              invalid: t.invalid,
              server: t.server,
              showPassword: t.showPassword,
              hidePassword: t.hidePassword,
              required: t.required
            }}
          />
        </div>
      </section>
    </main>
  );
}
