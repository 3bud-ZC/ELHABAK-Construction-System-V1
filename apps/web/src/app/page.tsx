import Image from "next/image";
import { CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
import { Button, Card, Section } from "@elhabak/ui";
import { dictionary, resolveLocale, textDirections } from "../i18n/translations";

type PageProps = {
  searchParams?: Promise<{ lang?: string }>;
};

function langHref(locale: "ar" | "en", path = "/") {
  return locale === "ar" ? path : `${path}?lang=en`;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const locale = resolveLocale(params?.lang);
  const t = dictionary[locale];
  const alternate = locale === "ar" ? "en" : "ar";
  const dir = textDirections[locale];

  return (
    <main className="site-shell" lang={locale} dir={dir}>
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand-link" href={langHref(locale)} aria-label="ELHABAK Construction">
            <Image
              src="/brand/logo-horizontal.png"
              alt="ELHABAK Construction"
              width={240}
              height={100}
              priority
            />
          </a>
          <nav className="header-nav" aria-label="Main navigation">
            <a href="#about">{t.nav.about}</a>
            <a href="#services">{t.nav.services}</a>
            <a href="#process">{t.nav.process}</a>
            <a href="#why">{t.nav.why}</a>
            <a href="#contact">{t.nav.contact}</a>
          </nav>
          <div className="header-actions">
            <a className="lang-link" href={langHref(alternate)}>
              {t.nav.language}
            </a>
            <Button href={langHref(locale, "/login")}>{t.nav.login}</Button>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="hero-eyebrow">ELHABAK CONSTRUCTION</span>
            <h1>{t.home.heroTitle}</h1>
            <p>{t.home.heroSubtitle}</p>
            <div className="hero-actions">
              <Button href="#contact" variant="accent">
                {t.home.primaryCta}
              </Button>
              <Button href="#services" variant="ghost">
                {t.home.secondaryCta}
              </Button>
            </div>
          </div>
          <div className="hero-visual" aria-label={t.home.heroPanelTitle}>
            <div className="brand-monogram">
              <Image
                src="/brand/logo-vertical.png"
                alt=""
                width={300}
                height={217}
                priority
              />
            </div>
            <div className="hero-panel">
              <h2>{t.home.heroPanelTitle}</h2>
              <p>{t.home.heroPanelText}</p>
            </div>
          </div>
        </div>
      </section>

      <Section id="about" className="about-band" title={t.home.aboutTitle} lead={t.home.aboutLead}>
        <div className="about-grid">
          <div className="about-note">
            <strong>ELHABAK CONSTRUCTION</strong>
            <span>الحباك للاستشارات الهندسية</span>
          </div>
          <div className="about-note">
            <strong>{t.contact.address}</strong>
            <span>Sohag, Egypt</span>
          </div>
        </div>
      </Section>

      <Section id="services" title={t.home.servicesTitle} lead={t.home.servicesLead}>
        <div className="services-grid">
          {t.services.map(([title, body], index) => (
            <Card className="service-card" key={title}>
              <span className="service-card__index">{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        id="process"
        className="process-band"
        title={t.home.processTitle}
        lead={t.home.processLead}
      >
        <div className="process-grid">
          {t.process.map(([title, body], index) => (
            <div className="process-step" key={title}>
              <span className="process-index">{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="why" title={t.home.whyTitle} lead={t.home.whyLead}>
        <div className="why-grid">
          {t.why.map((item) => (
            <div className="why-item" key={item}>
              <CheckCircle2 aria-hidden="true" size={24} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="contact" className="contact-band" title={t.home.contactTitle} lead={t.home.contactLead}>
        <div className="contact-grid">
          <a className="contact-item" href={`tel:${t.contact.phone.replace(/[^\d+]/g, "")}`}>
            <Phone aria-hidden="true" />
            <strong>{locale === "ar" ? "الهاتف" : "Phone"}</strong>
            <span>{t.contact.phone}</span>
          </a>
          <a className="contact-item" href={`mailto:${t.contact.email}`}>
            <Mail aria-hidden="true" />
            <strong>{locale === "ar" ? "البريد الإلكتروني" : "Email"}</strong>
            <span>{t.contact.email}</span>
          </a>
          <div className="contact-item">
            <MapPin aria-hidden="true" />
            <strong>{locale === "ar" ? "العنوان" : "Address"}</strong>
            <span>{t.contact.address}</span>
          </div>
        </div>
      </Section>

      <footer className="site-footer">
        <div className="container footer-inner">
          <Image src="/brand/logo-horizontal.png" alt="ELHABAK Construction" width={180} height={75} />
          <span>{t.home.footerText}</span>
        </div>
      </footer>
    </main>
  );
}
