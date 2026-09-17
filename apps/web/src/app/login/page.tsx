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
      title: "إدارة هندسية متكاملة للمشاريع",
      lead: "منظومة موحدة لضبط الجودة ومتابعة المعاينة والتصميم والتنفيذ حتى التسليم النهائي.",
      steps: ["المعاينة والتصميم", "التنفيذ والمتابعة", "التسليم والاعتماد"],
      secure: "بوابة العمليات المصرح بها",
      team: "للفريق المعتمد والعملاء"
    }
    : {
      title: "Integrated Engineering & Project Control",
      lead: "A unified system coordinating quality, designs, site execution, and delivery to handover.",
      steps: ["Design & Planning", "Site Execution", "Final Handover"],
      secure: "Authorized Operations Gateway",
      team: "Approved teams & clients"
    };

  return (
    <main className="login-shell" lang={locale} dir={dir}>
      <section className="login-brand">
        <div className="login-brand__media" aria-hidden="true">
          <Image
            src="/marketing/hero-execution.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 980px) 100vw, 55vw"
            className="login-brand__image"
          />
          <div className="login-brand__overlay" />
        </div>
        <div className="login-brand__content">
          <Image
            src="/brand/logo-horizontal.png"
            alt="ELHABAK Construction"
            width={280}
            height={116}
            priority
          />
          <div className="login-brand__copy">
            <span className="login-brand__eyebrow">{brand.secure}</span>
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
            <span>{brand.team}</span>
            <span>ELHABAK CONSTRUCTION SYSTEM</span>
          </div>
        </div>
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
