import Image from "next/image";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
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
        <div className="hero__bg" aria-hidden="true" />
        <div className="container hero-inner">
          <aside className="hero-side-note" aria-hidden="true">
            <span>{locale === "ar" ? "نبني أفكارك لواقع أجمل" : "ENGINEERING A BETTER TOMORROW"}</span>
          </aside>
          <div className="hero-copy">
            <span className="hero-eyebrow">
              <span className="hero-eyebrow__bar" aria-hidden="true" />
              ELHABAK CONSTRUCTION
            </span>
            <h1>{t.home.heroTitle}</h1>
            <p>{t.home.heroSubtitle}</p>
            <div className="hero-actions">
              <Button href="#contact" variant="accent">
                {t.home.primaryCta} {dir === "rtl" ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </Button>
              <Button href="#services" variant="ghost">
                {t.home.secondaryCta} {dir === "rtl" ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </Button>
            </div>
          </div>
          <div className="hero-visual" aria-label={t.home.heroPanelTitle}>
            <div className="hero-visual__frame">
              <div className="hero-visual__construction" aria-hidden="true">
                <span className="hero-visual__tower" />
                <span className="hero-visual__slab hero-visual__slab--one" />
                <span className="hero-visual__slab hero-visual__slab--two" />
                <span className="hero-visual__slab hero-visual__slab--three" />
              </div>
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
                <span className="hero-panel__tag">{locale === "ar" ? "نظام إدارة المشاريع" : "PROJECT MANAGEMENT SYSTEM"}</span>
                <h2>{t.home.heroPanelTitle}</h2>
                <p>{t.home.heroPanelText}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-stats hero-sequence" aria-hidden="true">
          <div className="container hero-stats__inner">
            <span><strong>DESIGN</strong><small>{locale === "ar" ? "دراسة وتصميم" : "Study and design"}</small></span>
            <span><strong>BUILD</strong><small>{locale === "ar" ? "تنفيذ ومتابعة" : "Execution control"}</small></span>
            <span><strong>DELIVER</strong><small>{locale === "ar" ? "تسليم موثق" : "Documented handover"}</small></span>
          </div>
        </div>
      </section>

      <Section
        id="about"
        className="about-band"
        eyebrow={locale === "ar" ? "٠١ // عن الشركة" : "01 // ABOUT ELHABAK"}
        title={t.home.aboutTitle}
        lead={t.home.aboutLead}
      >
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

      <Section
        id="services"
        eyebrow={locale === "ar" ? "٠٢ // نطاق الخدمات" : "02 // SERVICES PORTFOLIO"}
        title={t.home.servicesTitle}
        lead={t.home.servicesLead}
      >
        <div className="services-grid services-bento">
          {t.services.map(([title, body], index) => (
            <Card className={`service-card ${index === 0 ? "service-card--feature" : ""}`} key={title}>
              <span className="service-card__index">{String(index + 1).padStart(2, "0")}</span>
              <div className="service-card__body">
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
              <span className="service-card__corner" aria-hidden="true" />
            </Card>
          ))}
        </div>
      </Section>

      <Section
        id="process"
        className="process-band"
        eyebrow={locale === "ar" ? "٠٣ // مسار التسليم الهندسي" : "03 // ENGINEERING DELIVERY SEQUENCE"}
        title={t.home.processTitle}
        lead={t.home.processLead}
      >
        <div className="process-pipeline">
          <div className="process-pipeline__track" aria-hidden="true" />
          <div className="process-grid">
            {t.process.map(([title, body], index) => (
              <div className={`process-step ${index === 0 ? "process-step--start" : ""} ${index === t.process.length - 1 ? "process-step--end" : ""}`} key={title}>
                <div className="process-step__indicator" aria-hidden="true">
                  <span className="process-step__node" />
                  <span className="process-step__connector" aria-hidden="true" />
                </div>
                <div className="process-step__body">
                  <div className="process-step__meta">
                    <span className="process-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="process-step__phase-label">PHASE {String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section
        id="why"
        eyebrow={locale === "ar" ? "٠٤ // معايير الجودة" : "04 // QUALITY STANDARDS"}
        title={t.home.whyTitle}
        lead={t.home.whyLead}
      >
        <div className="why-grid">
          {t.why.map((item) => (
            <div className="why-item" key={item}>
              <CheckCircle2 aria-hidden="true" size={20} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="contact"
        className="contact-band"
        eyebrow={locale === "ar" ? "٠٥ // بيانات التواصل الرسمية" : "05 // OFFICIAL CONTACT"}
        title={t.home.contactTitle}
        lead={t.home.contactLead}
      >
        <div className="contact-grid">
          <a className="contact-item" href={`tel:${t.contact.phone.replace(/[^\d+]/g, "")}`}>
            <Phone aria-hidden="true" size={18} />
            <strong>{locale === "ar" ? "الهاتف" : "Phone"}</strong>
            <span>{t.contact.phone}</span>
          </a>
          <a className="contact-item" href={`mailto:${t.contact.email}`}>
            <Mail aria-hidden="true" size={18} />
            <strong>{locale === "ar" ? "البريد الإلكتروني" : "Email"}</strong>
            <span>{t.contact.email}</span>
          </a>
          <div className="contact-item">
            <MapPin aria-hidden="true" size={18} />
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
