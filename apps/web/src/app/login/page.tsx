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
  const brand = locale === "ar"
    ? {
      title: "نبني اليوم مستقبلاً أفضل",
      lead: "نظام داخلي لإدارة المشاريع الهندسية بوضوح وتحكم.",
      steps: ["تصميم", "تنفيذ", "تسليم"],
      secure: "وصول موثوق",
      team: "للفريق المعتمد"
    }
    : {
      title: "Build Today. Control Tomorrow.",
      lead: "Internal project-control workspace for ELHABAK engineering operations.",
      steps: ["Design", "Build", "Deliver"],
      secure: "Trusted access",
      team: "Approved team only"
    };

  return (
    <main className="login-shell" lang={locale} dir={dir}>
      <section className="login-brand">
        <div className="login-brand__grid" aria-hidden="true" />
        <div className="login-brand__drawing" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="login-brand__content">
          <Image
            src="/brand/logo-horizontal.png"
            alt="ELHABAK Construction"
            width={300}
            height={125}
            priority
          />
          <div className="login-brand__copy">
            <h1>{brand.title}</h1>
            <p>{brand.lead}</p>
          </div>
          <div className="login-brand__sequence" aria-label={brand.steps.join(" / ")}>
            {brand.steps.map((step, index) => (
              <span key={step}>
                <bdi>{String(index + 1).padStart(2, "0")}</bdi>
                {step}
              </span>
            ))}
          </div>
          <div className="login-brand__meta">
            <span>{brand.secure}</span>
            <span>{brand.team}</span>
          </div>
        </div>
        <span className="login-brand__corner login-brand__corner--tl" aria-hidden="true" />
        <span className="login-brand__corner login-brand__corner--br" aria-hidden="true" />
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
          <div className="login-card__heading">
            <span className="login-card__tag">{locale === "ar" ? "نظام آمن" : "SECURE SYSTEM"}</span>
            <h2>{t.title}</h2>
            <p>{t.subtitle}</p>
          </div>
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
