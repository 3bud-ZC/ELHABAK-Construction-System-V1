import Image from "next/image";
import { Button, Input } from "@elhabak/ui";
import { dictionary, resolveLocale, textDirections } from "../../i18n/translations";

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
          src="/brand/logo-primary-horizontal.png"
          alt="ELHABAK Construction"
          width={360}
          height={120}
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
          <form className="login-form" aria-disabled="true">
            <Input label={t.email} type="email" autoComplete="email" disabled />
            <Input label={t.password} type="password" autoComplete="current-password" disabled />
            <button className="ui-button ui-button--primary login-submit" type="button" disabled>
              {t.submit}
            </button>
            <p className="login-disabled-note">{t.disabled}</p>
          </form>
        </div>
      </section>
    </main>
  );
}
