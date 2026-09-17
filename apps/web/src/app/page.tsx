import Image from "next/image";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Button, Section } from "@elhabak/ui";
import { dictionary, resolveLocale, textDirections } from "../i18n/translations";
import { PublicHero } from "./public-hero";
import { PublicMotion } from "./public-motion";

type PageProps = {
  searchParams?: Promise<{ lang?: string }>;
};

function langHref(locale: "ar" | "en", path = "/") {
  return locale === "ar" ? path : `${path}?lang=en`;
}

function whatsappHref(phone: string, message: string) {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const locale = resolveLocale(params?.lang);

  if (locale === "en") {
    return {
      title: "ELHABAK Construction | Design, Construction & Finishing in Sohag",
      description:
        "ELHABAK Construction delivers design, construction, finishing, general contracting, and furnishing in Sohag with organized digital project follow-up.",
      alternates: {
        canonical: "/?lang=en",
        languages: {
          ar: "/",
          en: "/?lang=en"
        }
      },
      openGraph: {
        title: "ELHABAK Construction | Design, Construction & Finishing in Sohag",
        description:
          "Engineering delivery for residential and commercial projects with digital project tracking from inspection to handover.",
        url: "/?lang=en",
        locale: "en_US"
      },
      twitter: {
        title: "ELHABAK Construction | Design, Construction & Finishing in Sohag",
        description:
          "Design, construction, finishing, general contracting, and furnishing with organized digital project follow-up."
      }
    };
  }

  return {
    title: "ELHABAK — الحباك للاستشارات الهندسية في سوهاج",
    description:
      "الحباك للاستشارات الهندسية تقدم التصميم والتنفيذ والتشطيب والمقاولات العامة والتأثيث في سوهاج مع متابعة رقمية منظمة للمشروع.",
    alternates: {
      canonical: "/",
      languages: {
        ar: "/",
        en: "/?lang=en"
      }
    },
    openGraph: {
      title: "ELHABAK — الحباك للاستشارات الهندسية في سوهاج",
      description:
        "تصميم وتنفيذ وتشطيب للمشروعات السكنية والتجارية بإدارة هندسية واضحة ومتابعة رقمية من المعاينة حتى التسليم.",
      url: "/",
      locale: "ar_EG"
    },
    twitter: {
      title: "ELHABAK — الحباك للاستشارات الهندسية في سوهاج",
      description:
        "تصميم وتنفيذ وتشطيب ومقاولات عامة وتأثيث مع متابعة رقمية منظمة للمشروع."
    }
  };
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const locale = resolveLocale(params?.lang);
  const t = dictionary[locale];
  const alternate = locale === "ar" ? "en" : "ar";
  const dir = textDirections[locale];
  const arrow = dir === "rtl" ? <ArrowLeft size={16} /> : <ArrowRight size={16} />;
  const whatsapp = whatsappHref(t.contact.phone, t.home.whatsappMessage);
  const mobileQuickNav = [
    ["#services", t.nav.services],
    ["#platform", t.home.mobilePlatform],
    ["#process", t.nav.process],
    ["#faq", t.home.mobileFaq],
    ["#contact", t.nav.contact]
  ] as const;

  const heroStates = [
    {
      key: "design" as const,
      image: "/marketing/hero-design.webp",
      label: locale === "ar" ? "التصميم" : "DESIGN"
    },
    {
      key: "execution" as const,
      image: "/marketing/hero-execution.webp",
      label: locale === "ar" ? "التنفيذ" : "EXECUTION"
    },
    {
      key: "delivery" as const,
      image: "/marketing/hero-delivery.webp",
      label: locale === "ar" ? "التسليم" : "DELIVERY"
    }
  ];

  return (
    <main className="site-shell" lang={locale} dir={dir}>
      <PublicMotion />
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
          <nav className="mobile-quick-nav" aria-label={locale === "ar" ? "تنقل سريع" : "Quick navigation"}>
            {mobileQuickNav.map(([href, label]) => (
              <a href={href} key={href}>{label}</a>
            ))}
          </nav>
        </div>
      </header>

      <PublicHero
        states={heroStates}
        railEnd={
          locale === "ar"
            ? "قرار هندسي واضح من أول مقابلة حتى التسليم"
            : "Clear engineering decisions from first meeting to handover"
        }
        scopeIndex={locale === "ar" ? "نطاق متكامل" : "INTEGRATED SCOPE"}
        scopeTitle={t.home.heroPanelTitle}
        scopeText={t.home.heroPanelText}
        alt={
          locale === "ar"
            ? "مشاهد متعاقبة: تصميم معماري حديث، موقع تنفيذ وقت الغروب، ومبنى مكتمل"
            : "Rotating scenes: modern architectural design, construction site at sunset, and a completed building"
        }
      >
        <div className="hero-eyebrow">
          <span className="hero-eyebrow__index" dir="ltr" aria-hidden="true">ENGINEERING / DELIVERY</span>
          <span className="hero-eyebrow__brand">ELHABAK CONSTRUCTION</span>
        </div>
        <h1 aria-label={t.home.heroTitle}>
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
            {t.home.primaryCta} {arrow}
          </Button>
          <Button href={whatsapp} target="_blank" rel="noreferrer" variant="primary" className="hero-cta hero-cta--whatsapp">
            <MessageCircle size={16} /> {t.home.whatsappCta}
          </Button>
          <Button href="#services" variant="ghost" className="hero-cta hero-cta--ghost">
            {t.home.secondaryCta} {arrow}
          </Button>
        </div>
      </PublicHero>

      {/* ============ 01 // ABOUT ============ */}
      <Section
        id="about"
        className="about-section"
        eyebrow={locale === "ar" ? "01 // عن الشركة" : "01 // ABOUT ELHABAK"}
      >
        <div className="about-layout">
          <div className="about-copy" data-reveal="up">
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
          <figure className="about-figure" dir="ltr" data-reveal="mask">
            <Image
              src="/marketing/about-site.webp"
              alt=""
              fill
              sizes="(max-width: 980px) 100vw, 48vw"
            />
            <div className="about-figure__panel" dir={dir}>
              <span>{locale === "ar" ? "من الفكرة إلى الموقع" : "FROM IDEA TO SITE"}</span>
              <strong>{locale === "ar" ? "إدارة واحدة للتصميم والتنفيذ" : "One team for design and delivery"}</strong>
            </div>
            <figcaption className="sr-only">
              {locale === "ar"
                ? "هيكل إنشائي لمبنى تحت التنفيذ بإضاءة وقت الغروب"
                : "Structural frame of a building under construction at golden hour"}
            </figcaption>
          </figure>
        </div>
      </Section>

      {/* ============ 02 // DIGITAL EXPERIENCE ============ */}
      <section className="digital-section" id="platform" aria-labelledby="digital-title">
        <div className="container digital-inner">
          <div className="digital-copy" data-reveal="up">
            <p className="ui-section__eyebrow">
              {locale === "ar" ? "02 // التجربة الرقمية" : "02 // DIGITAL EXPERIENCE"}
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
            <figure className="digital-frame digital-frame--desktop" data-reveal="mask">
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
            <figure className="digital-frame digital-frame--mobile" data-reveal="up">
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

      {/* ============ 03 // SERVICES ============ */}
      <Section
        id="services"
        className="services-section"
        eyebrow={locale === "ar" ? "03 // نطاق الخدمات" : "03 // SCOPE OF SERVICES"}
        title={t.home.servicesTitle}
        lead={t.home.servicesLead}
      >
        <div className="services-layout">
          <article className="services-feature" data-reveal="mask">
            <div className="services-feature__media" aria-hidden="true">
              <Image
                src="/marketing/services-feature.webp"
                alt=""
                fill
                sizes="(max-width: 980px) 100vw, 42vw"
              />
            </div>
            <header className="services-feature__head">
              <span className="service-index" aria-hidden="true">01</span>
              <span className="service-tag">{locale === "ar" ? "خدمة أساسية" : "CORE SERVICE"}</span>
            </header>
            <div className="services-feature__body">
              <h3>{t.services[0][0]}</h3>
              <p>{t.services[0][1]}</p>
            </div>
          </article>
          <ol className="services-register" data-reveal-group>
            {t.services.slice(1).map(([title, body], index) => (
              <li className="services-register__row" key={title} data-reveal="up">
                <span className="service-index" aria-hidden="true">
                  {String(index + 2).padStart(2, "0")}
                </span>
                <div className="services-register__text">
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
                <i className="services-register__tick" aria-hidden="true" />
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ============ 04 // DELIVERY PROCESS ============ */}
      <Section
        id="process"
        className="process-section"
        eyebrow={locale === "ar" ? "04 // مسار التسليم" : "04 // DELIVERY SEQUENCE"}
        title={t.home.processTitle}
        lead={t.home.processLead}
      >
        <div className="process-panel" data-reveal="up">
          <div className="process-field" aria-hidden="true">
            <span>{locale === "ar" ? "المعاينة" : "SITE INSPECTION"}</span>
            <i />
            <span>{locale === "ar" ? "التسليم النهائي" : "FINAL HANDOVER"}</span>
          </div>
          <ol className="process-grid" data-reveal-group>
            {t.process.map(([title, body], index) => (
              <li
                className="process-stage"
                key={title}
                data-reveal="stage"
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <span className="process-stage__node">
                  <bdi>{String(index + 1).padStart(2, "0")}</bdi>
                </span>
                <span className="process-stage__label" aria-hidden="true">
                  {locale === "ar" ? "المرحلة" : "PHASE"} {String(index + 1).padStart(2, "0")}
                </span>
                <div className="process-stage__content">
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
                <span className="process-stage__rule" aria-hidden="true" />
              </li>
            ))}
          </ol>
          <div className="process-panel__footer" aria-hidden="true">
            <span>{locale === "ar" ? "نطاق واضح" : "CLEAR SCOPE"}</span>
            <span>{locale === "ar" ? "توثيق ومتابعة" : "DOCUMENTED CONTROL"}</span>
            <span>{locale === "ar" ? "تسليم منظم" : "ORDERED HANDOVER"}</span>
          </div>
        </div>
      </Section>

      {/* ============ 05 // METHOD ============ */}
      <section className="method-section" id="why" aria-labelledby="method-title">
        <div className="container method-inner">
          <div className="method-head" data-reveal="up">
            <p className="ui-section__eyebrow">
              {locale === "ar" ? "05 // منهجية العمل" : "05 // WORKING METHOD"}
            </p>
            <h2 id="method-title">{t.home.whyTitle}</h2>
            <p className="method-lead">{t.home.whyLead}</p>
          </div>
          <div className="method-rows" data-reveal-group>
            {t.why.map(([title, body], index) => (
              <div className="method-row" key={title} data-reveal="up">
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

      {/* ============ 06 // PRINCIPLES ============ */}
      <Section
        className="principles-section"
        eyebrow={locale === "ar" ? "06 // قواعد العمل" : "06 // WORKING PRINCIPLES"}
        title={t.home.principlesTitle}
      >
        <ol className="principles-rail" data-reveal-group>
          {t.principles.map(([title, tag], index) => (
            <li className="principles-item" key={tag} data-reveal="up">
              <span className="principles-item__num" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <strong>{title}</strong>
              <span className="principles-item__tag" aria-hidden="true">{tag}</span>
            </li>
          ))}
        </ol>
      </Section>

      {/* ============ 07 // FAQ ============ */}
      <section className="faq-section" id="faq" aria-labelledby="faq-title">
        <div className="container faq-inner">
          <div className="faq-head" data-reveal="up">
            <p className="ui-section__eyebrow">
              {locale === "ar" ? "07 // الأسئلة الشائعة" : "07 // FAQ"}
            </p>
            <h2 id="faq-title">{t.home.faqTitle}</h2>
            <p>{t.home.faqLead}</p>
          </div>
          <div className="faq-list" data-reveal-group>
            {t.faq.map(([question, answer], index) => (
              <article className="faq-item" data-reveal="up" key={question}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h3>{question}</h3>
                <p>{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 08 // CONTACT + FOOTER ============ */}
      <div className="closing">
        <div className="closing__media" aria-hidden="true">
          <Image
            src="/marketing/contact-crane.webp"
            alt=""
            fill
            loading="lazy"
            sizes="100vw"
          />
        </div>
        <section className="contact-section" id="contact" aria-labelledby="contact-title">
          <div className="container">
            <div className="contact-inner">
              <div className="contact-copy" data-reveal="up">
                <p className="ui-section__eyebrow">
                  {locale === "ar" ? "08 // تواصل" : "08 // CONTACT"}
                </p>
                <h2 id="contact-title">{t.home.contactTitle}</h2>
                <p className="contact-lead">{t.home.contactLead}</p>
              </div>
              <div className="contact-conversion" data-reveal="up">
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
                  <a className="contact-channel contact-channel--wide contact-channel--whatsapp" href={whatsapp} target="_blank" rel="noreferrer">
                    <MessageCircle aria-hidden="true" size={17} />
                    <span className="contact-channel__label">WHATSAPP</span>
                    <bdi>{t.home.whatsappCta}</bdi>
                  </a>
                </div>
                <div className="contact-actions">
                  <Button href={`tel:${t.contact.phone.replace(/[^\d+]/g, "")}`} variant="accent" className="hero-cta">
                    {t.home.primaryCta} {arrow}
                  </Button>
                  <Button href={whatsapp} target="_blank" rel="noreferrer" variant="primary" className="hero-cta contact-whatsapp">
                    <MessageCircle size={16} /> {t.home.whatsappCta}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

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
              <a href={`tel:${t.contact.phone.replace(/[^\d+]/g, "")}`}><bdi dir="ltr">{t.contact.phone}</bdi></a>
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
      </div>
    </main>
  );
}
