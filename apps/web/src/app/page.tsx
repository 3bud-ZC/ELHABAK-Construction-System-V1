import Image from "next/image";
import { ArrowLeft, ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { Button, Section } from "@elhabak/ui";
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
          <nav className="header-nav" aria-label={locale === "ar" ? "التنقل الرئيسي" : "Main navigation"}>
            <a href="#about">{t.nav.about}</a>
            <a href="#services">{t.nav.services}</a>
            <a href="#process">{t.nav.process}</a>
            <a href="#why">{t.nav.why}</a>
            <a href="#platform">{t.nav.platform}</a>
            <a href="#contact">{t.nav.contact}</a>
          </nav>
          <div className="header-actions">
            <a className="lang-link" href={langHref(alternate)}>
              {t.nav.language}
            </a>
            <Button href={langHref(locale, "/login")} variant="primary" className="header-login">
              {t.nav.login}
            </Button>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-media" aria-hidden="true">
          <Image
            src="/marketing/hero-architecture.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
          />
        </div>
        <div className="container hero-layout">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <span className="hero-eyebrow__index" dir="ltr" aria-hidden="true">ENGINEERING / DELIVERY</span>
              <span className="hero-eyebrow__brand">ELHABAK CONSTRUCTION</span>
            </div>
            <h1>
              {locale === "ar" ? (
                <>
                  <span className="hero-title__brand">الحباك</span>
                  <span className="hero-title__line">للاستشارات</span>
                  <span className="hero-title__line">الهندسية</span>
                </>
              ) : (
                <>
                  <span className="hero-title__brand">ELHABAK</span>
                  <span className="hero-title__line hero-title__line--en">CONSTRUCTION</span>
                </>
              )}
            </h1>
            <p>{t.home.heroSubtitle}</p>
            <div className="hero-actions">
              <Button href="#contact" variant="accent" className="hero-cta">
                {t.home.primaryCta} {dir === "rtl" ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </Button>
              <Button href="#services" variant="ghost" className="hero-cta hero-cta--ghost">
                {t.home.secondaryCta} {dir === "rtl" ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </Button>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-visual__image">
              <Image
                src="/marketing/hero-architecture.jpg"
                alt={locale === "ar"
                  ? "مبنى حديث تحت التشطيب يعكس أعمال التصميم والتنفيذ في الحباك"
                  : "Modern building under final construction representing ELHABAK design and delivery work"}
                fill
                priority
                sizes="(max-width: 980px) 100vw, 58vw"
              />
            </div>
            <aside className="hero-scope">
              <div className="hero-scope__head">
                <span>{locale === "ar" ? "نطاق متكامل" : "INTEGRATED SCOPE"}</span>
                <bdi>01</bdi>
              </div>
              <div className="hero-scope__body">
                <div>
                  <strong>{t.home.heroPanelTitle}</strong>
                  <p>{t.home.heroPanelText}</p>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="hero-rail" aria-hidden="true">
          <div className="container hero-rail__inner">
            <span>{locale === "ar" ? "تصميم" : "DESIGN"}</span>
            <span>{locale === "ar" ? "تنفيذ" : "BUILD"}</span>
            <span>{locale === "ar" ? "تشطيب" : "FINISH"}</span>
            <i className="hero-rail__sep" />
            <span className="hero-rail__end">
              {locale === "ar" ? "قرار هندسي واضح من أول مقابلة حتى التسليم" : "Clear engineering decisions from first meeting to handover"}
            </span>
          </div>
        </div>
      </section>

      {/* ============ 01 // ABOUT ============ */}
      <Section
        id="about"
        className="about-section"
        eyebrow={locale === "ar" ? "01 // عن الشركة" : "01 // ABOUT ELHABAK"}
      >
        <div className="about-layout">
          <div className="about-copy">
            <h2 className="about-statement">{t.home.aboutTitle}</h2>
            <p className="about-lead">{t.home.aboutLead}</p>
            <ul className="about-principles" aria-label={locale === "ar" ? "مجالات العمل" : "Work domains"}>
              {t.aboutPrinciples.map(([label, tag], index) => (
                <li key={tag}>
                  <span className="about-principles__num" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <strong>{label}</strong>
                  <span className="about-principles__tag" aria-hidden="true">{tag}</span>
                </li>
              ))}
            </ul>
          </div>
          <figure className="about-figure" dir="ltr">
            <Image
              src="/marketing/hero-architecture.jpg"
              alt=""
              fill
              sizes="(max-width: 980px) 100vw, 48vw"
            />
            <div className="about-figure__panel">
              <span>{locale === "ar" ? "من الفكرة إلى الموقع" : "FROM IDEA TO SITE"}</span>
              <strong>{locale === "ar" ? "إدارة واحدة للتصميم والتنفيذ" : "One team for design and delivery"}</strong>
            </div>
            <figcaption className="sr-only">
              {locale === "ar"
                ? "صورة معمارية تعكس تنفيذ مبنى حديث بمواد زجاج وخرسانة"
                : "Architectural image showing a modern concrete and glass building under delivery"}
            </figcaption>
          </figure>
        </div>
      </Section>

      {/* ============ 02 // SERVICES ============ */}
      <Section
        id="services"
        className="services-section"
        eyebrow={locale === "ar" ? "02 // نطاق الخدمات" : "02 // SCOPE OF SERVICES"}
        title={t.home.servicesTitle}
        lead={t.home.servicesLead}
      >
        <div className="services-layout">
          {t.services.map(([title, body], index) => (
            <article className={`service-module ${index === 0 ? "service-module--feature" : ""}`} key={title}>
              <header className="service-module__head">
                <span className="service-module__index">{String(index + 1).padStart(2, "0")}</span>
                <span className="service-module__tag">{locale === "ar" ? "خدمة" : "SERVICE"}</span>
              </header>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* ============ 03 // DELIVERY PROCESS ============ */}
      <Section
        id="process"
        className="process-section"
        eyebrow={locale === "ar" ? "03 // مسار التسليم" : "03 // DELIVERY SEQUENCE"}
        title={t.home.processTitle}
        lead={t.home.processLead}
      >
        <ol className="process-rail">
          {t.process.map(([title, body], index) => (
            <li className="process-phase" key={title}>
              <div className="process-phase__rail" aria-hidden="true">
                <span className="process-phase__node">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="process-phase__body">
                <span className="process-phase__label" aria-hidden="true">
                  {locale === "ar" ? "المرحلة" : "PHASE"} {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* ============ 04 // METHOD ============ */}
      <section className="method-section" id="why" aria-labelledby="method-title">
        <div className="container method-inner">
          <div className="method-head">
            <p className="ui-section__eyebrow">
              {locale === "ar" ? "04 // منهجية العمل" : "04 // WORKING METHOD"}
            </p>
            <h2 id="method-title">{t.home.whyTitle}</h2>
            <p className="method-lead">{t.home.whyLead}</p>
          </div>
          <div className="method-rows">
            {t.why.map(([title, body], index) => (
              <div className="method-row" key={title}>
                <span className="method-row__num" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 05 // DIGITAL EXPERIENCE ============ */}
      <section className="digital-section" id="platform" aria-labelledby="digital-title">
        <div className="container digital-inner">
          <div className="digital-copy">
            <p className="ui-section__eyebrow">
              {locale === "ar" ? "05 // التجربة الرقمية" : "05 // DIGITAL EXPERIENCE"}
            </p>
            <h2 id="digital-title">{t.home.digitalTitle}</h2>
            <p className="digital-lead">{t.home.digitalLead}</p>
            <ul className="digital-points">
              {t.digitalPoints.map((point, index) => (
                <li key={point}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  {point}
                </li>
              ))}
            </ul>
            <div className="digital-actions">
              <Button href={langHref(locale, "/login")} variant="primary" className="digital-cta">
                {t.home.digitalCta} {dir === "rtl" ? <ArrowLeft size={15} /> : <ArrowRight size={15} />}
              </Button>
              <span className="digital-note">{t.home.digitalNote}</span>
            </div>
          </div>
          <div className="digital-visual">
            <span className="digital-visual__tag">
              {locale === "ar" ? "نظام إدارة المشاريع" : "PROJECT CONTROL SYSTEM"}
            </span>
            <figure className="digital-frame digital-frame--desktop">
              <span className="digital-frame__bar" aria-hidden="true">
                <i /><i /><i />
                <b>{locale === "ar" ? "نظام الحباك — لوحة التحكم" : "ELHABAK System — Operations"}</b>
              </span>
              <Image
                src="/marketing/platform-desktop.webp"
                alt={locale === "ar"
                  ? "لقطة من نظام إدارة الحباك تعرض لوحة متابعة المشاريع"
                  : "Screenshot of the ELHABAK management platform project dashboard"}
                width={1440}
                height={900}
                loading="lazy"
              />
            </figure>
            <figure className="digital-frame digital-frame--mobile">
              <Image
                src="/marketing/platform-mobile.webp"
                alt={locale === "ar"
                  ? "لقطة جوال من نظام الحباك تعرض تقدم مشروع ومراحله"
                  : "Mobile screenshot of an ELHABAK project progress view"}
                width={390}
                height={844}
                loading="lazy"
              />
            </figure>
          </div>
        </div>
      </section>

      {/* ============ 06 // PRINCIPLES ============ */}
      <Section
        className="principles-section"
        eyebrow={locale === "ar" ? "06 // قواعد العمل" : "06 // WORKING PRINCIPLES"}
        title={t.home.principlesTitle}
      >
        <ol className="principles-rail">
          {t.principles.map(([title, tag], index) => (
            <li className="principles-item" key={tag}>
              <span className="principles-item__num" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <strong>{title}</strong>
              <span className="principles-item__tag" aria-hidden="true">{tag}</span>
            </li>
          ))}
        </ol>
      </Section>

      {/* ============ 07 // CONTACT ============ */}
      <section className="contact-section" id="contact" aria-labelledby="contact-title">
        <div className="container">
          <div className="contact-inner">
            <div className="contact-copy">
              <p className="ui-section__eyebrow">
                {locale === "ar" ? "07 // تواصل" : "07 // CONTACT"}
              </p>
              <h2 id="contact-title">{t.home.contactTitle}</h2>
              <p className="contact-lead">{t.home.contactLead}</p>
            </div>
            <div className="contact-conversion">
              <div className="contact-channels">
                <a className="contact-channel" href={`tel:${t.contact.phone.replace(/[^\d+]/g, "")}`}>
                  <Phone aria-hidden="true" size={17} />
                  <span className="contact-channel__label">{locale === "ar" ? "الهاتف" : "PHONE"}</span>
                  <bdi dir="ltr">{t.contact.phone}</bdi>
                </a>
                <div className="contact-channel contact-channel--static">
                  <MapPin aria-hidden="true" size={17} />
                  <span className="contact-channel__label">{locale === "ar" ? "العنوان" : "ADDRESS"}</span>
                  <bdi>{t.contact.address}</bdi>
                </div>
                <a className="contact-channel contact-channel--wide" href={`mailto:${t.contact.email}`}>
                  <Mail aria-hidden="true" size={17} />
                  <span className="contact-channel__label">{locale === "ar" ? "البريد" : "EMAIL"}</span>
                  <bdi dir="ltr">{t.contact.email}</bdi>
                </a>
              </div>
              <div className="contact-actions">
                <Button href={`tel:${t.contact.phone.replace(/[^\d+]/g, "")}`} variant="accent" className="hero-cta">
                  {t.home.primaryCta} {dir === "rtl" ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <Image src="/brand/logo-horizontal.png" alt="ELHABAK Construction" width={190} height={79} />
            <p>{t.home.footerTagline}</p>
          </div>
          <nav className="footer-col" aria-label={t.home.footerNav}>
            <h3>{t.home.footerNav}</h3>
            <a href="#about">{t.nav.about}</a>
            <a href="#services">{t.nav.services}</a>
            <a href="#process">{t.nav.process}</a>
            <a href="#why">{t.nav.why}</a>
            <a href="#contact">{t.nav.contact}</a>
          </nav>
          <div className="footer-col">
            <h3>{t.home.footerServices}</h3>
            {t.services.map(([title]) => (
              <a href="#services" key={title}>{title}</a>
            ))}
          </div>
          <div className="footer-col">
            <h3>{t.home.footerContact}</h3>
            <a href={`tel:${t.contact.phone.replace(/[^\d+]/g, "")}`}><bdi>{t.contact.phone}</bdi></a>
            <a href={`mailto:${t.contact.email}`}>{t.contact.email}</a>
            <span className="footer-col__text">{t.contact.address}</span>
            <a className="footer-col__login" href={langHref(locale, "/login")}>{t.nav.login}</a>
          </div>
        </div>
        <div className="container footer-base">
          <span>© {new Date().getFullYear()} ELHABAK CONSTRUCTION — {t.home.footerRights}</span>
          <span className="footer-base__mark" aria-hidden="true">الحباك / ELHABAK</span>
        </div>
      </footer>
    </main>
  );
}
