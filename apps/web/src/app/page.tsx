import Image from "next/image";
import type { Metadata } from "next";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  Compass,
  Eye,
  FileText,
  HardHat,
  Linkedin,
  Instagram,
  MessageCircle,
  MessageSquare,
  Phone,
  Sofa,
  Target,
  Users,
  Youtube
} from "lucide-react";
import { Button } from "@elhabak/ui";
import { telHref, whatsappHref } from "@elhabak/contracts";
import { dictionary, resolveLocale, textDirections } from "../i18n/translations";
import { siteUrl } from "../lib/site";
import { PublicHero } from "./public-hero";
import { PublicMotion } from "./public-motion";
import { FaqAccordion } from "./faq-accordion";

type PageProps = {
  searchParams?: Promise<{ lang?: string }>;
};

function langHref(locale: "ar" | "en", path = "/") {
  return locale === "ar" ? path : `${path}?lang=en`;
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
  const whatsapp = whatsappHref(t.contact, t.home.whatsappMessage);
  const tel = telHref(t.contact);
  const mobileQuickNav = [
    ["#services", t.nav.services],
    ["#process", t.nav.process],
    ["#platform", t.home.mobilePlatform],
    ["#faq", t.home.mobileFaq],
    ["#contact", t.nav.contact]
  ] as const;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "ProfessionalService"],
        "@id": `${siteUrl}/#organization`,
        name: "ELHABAK Construction",
        alternateName: "الحباك للاستشارات الهندسية",
        url: `${siteUrl}/`,
        description: t.home.aboutLead,
        email: t.contact.email,
        telephone: t.contact.phoneE164,
        logo: `${siteUrl}/brand/logo-horizontal.png`,
        image: `${siteUrl}/marketing/hero-delivery.webp`,
        address: {
          "@type": "PostalAddress",
          streetAddress: "Uptown Mall",
          addressLocality: "New Sohag City",
          addressRegion: "Sohag",
          addressCountry: "EG"
        },
        areaServed: [
          { "@type": "City", name: "Sohag" },
          { "@type": "Country", name: "Egypt" }
        ],
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer service",
            telephone: t.contact.phoneE164,
            email: t.contact.email,
            availableLanguage: ["ar", "en"]
          }
        ],
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: locale === "ar" ? "نطاق الخدمات" : "Scope of services",
          itemListElement: t.services.map(([title, body], index) => ({
            "@type": "Offer",
            position: index + 1,
            itemOffered: {
              "@type": "Service",
              name: title,
              description: body
            }
          }))
        }
      }
    ]
  };

  const heroStates = [
    {
      key: "execution" as const,
      image: "/marketing/hero-engineers-site.webp",
      label: locale === "ar" ? "التنفيذ" : "EXECUTION"
    },
    {
      key: "design" as const,
      image: "/marketing/hero-design.webp",
      label: locale === "ar" ? "التصميم" : "DESIGN"
    },
    {
      key: "delivery" as const,
      image: "/marketing/hero-delivery.webp",
      label: locale === "ar" ? "التسليم" : "DELIVERY"
    }
  ];

  const serviceIcons = [Compass, HardHat, Users, Sofa];
  const serviceImages = [
    "/marketing/service-design.webp",
    "/marketing/service-finishing.webp",
    "/marketing/service-contracting.webp",
    "/marketing/service-furnishing.webp"
  ];

  return (
    <main className="site-shell" lang={locale} dir={dir}>
      <PublicMotion />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      {/* ============ HEADER ============ */}
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand-link" href={langHref(locale)} aria-label="ELHABAK Construction">
            <Image
              src="/brand/logo-horizontal.png"
              alt="ELHABAK Construction"
              width={220}
              height={92}
              priority
            />
          </a>
          <nav className="header-nav" aria-label={locale === "ar" ? "التنقل الرئيسي" : "Main navigation"}>
            <a href="#about">{t.nav.about}</a>
            <a href="#services">{t.nav.services}</a>
            <a href="#process">{t.nav.process}</a>
            <a href="#why">{t.nav.why}</a>
            <a href="#faq">{t.nav.faq}</a>
            <a href="#contact">{t.nav.contact}</a>
          </nav>
          <div className="header-actions">
            <a className="lang-link" href={langHref(alternate)}>
              {t.nav.language}
            </a>
            <Button href={langHref(locale, "/login")} variant="primary" className="header-login header-login--solid">
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

      {/* ============ HERO SECTION ============ */}
      <PublicHero
        states={heroStates}
        tag={t.home.heroTag}
        sideLabel={t.home.heroRailText}
        stats={t.home.heroStats}
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
            ? "مهندسون في موقع البناء يراجعون المخططات الهندسية وقت الغروب"
            : "Engineers reviewing architectural blueprints on a construction site at sunset"
        }
      >
        <div className="hero-eyebrow">
          <span className="hero-eyebrow__index" aria-hidden="true">
            {locale === "ar" ? "الهندسة والمقاولات" : "ENGINEERING & CONSTRUCTION"}
          </span>
          <span className="hero-eyebrow__brand">ELHABAK CONSTRUCTION</span>
        </div>
        <h1 aria-label={t.home.heroTitle}>
          {locale === "ar" ? (
            <>
              <span className="hero-title__brand">الحباك</span>
              <span className="hero-title__line">للاستشارات الهندسية</span>
            </>
          ) : (
            <>
              <span className="hero-title__brand">ELHABAK</span>
              <span className="hero-title__line hero-title__line--en">CONSTRUCTION</span>
            </>
          )}
        </h1>
        <p className="hero-subtitle">{t.home.heroSubtitle}</p>
        <div className="hero-actions">
          <Button href={whatsapp} target="_blank" rel="noreferrer" variant="accent" className="hero-cta hero-cta--whatsapp">
            <MessageCircle size={16} /> {t.home.primaryCta}
          </Button>
          <Button href="#services" variant="ghost" className="hero-cta hero-cta--ghost">
            {t.home.secondaryCta} {arrow}
          </Button>
        </div>
      </PublicHero>

      {/* ============ 01 // ABOUT ============ */}
      <section id="about" className="about-section" aria-labelledby="about-title">
        <div className="container">
          <div className="about-mockup-layout">
            <div className="about-photo-card" data-reveal="mask">
              <Image
                src="/marketing/about-building.webp"
                alt="ELHABAK Architecture"
                fill
                priority
                sizes="(max-width: 980px) 100vw, 48vw"
                className="about-photo-card__img"
              />
              <div className="about-photo-card__badge">
                <strong>{t.home.aboutBadgeTitle}</strong>
                <span>{t.home.aboutBadgeSubtitle}</span>
              </div>
            </div>
            <div className="about-text-card" data-reveal="up">
              <span className="section-eyebrow-tag">{t.home.aboutEyebrow}</span>
              <h2 id="about-title" className="about-text-card__title">{t.home.aboutTitle}</h2>
              <p className="about-text-card__lead">{t.home.aboutLead}</p>
              <div className="about-text-card__actions">
                <Button href="#services" variant="ghost" className="about-action-btn">
                  {t.home.aboutCta} {arrow}
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Values Section (matching iPhone mockup) */}
          <div className="about-mobile-values" data-reveal="up">
            <span className="section-eyebrow-tag">{t.home.aboutEyebrow}</span>
            <h3 className="about-mobile-values__title">{t.home.aboutMobileTitle}</h3>
            <div className="about-mobile-values__grid">
              <div className="about-value-pill">
                <Target size={18} className="about-value-pill__icon" />
                <span>{t.home.aboutMobilePoints[0]}</span>
              </div>
              <div className="about-value-pill">
                <Award size={18} className="about-value-pill__icon" />
                <span>{t.home.aboutMobilePoints[1]}</span>
              </div>
              <div className="about-value-pill">
                <Eye size={18} className="about-value-pill__icon" />
                <span>{t.home.aboutMobilePoints[2]}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 02 // SERVICES ============ */}
      <section id="services" className="services-section" aria-labelledby="services-title">
        <div className="container">
          <div className="services-head" data-reveal="up">
            <span className="section-eyebrow-tag">{t.home.servicesEyebrow}</span>
            <h2 id="services-title" className="services-head__title">{t.home.servicesTitle}</h2>
            <p className="services-head__lead">{t.home.servicesLead}</p>
          </div>
          <div className="services-grid-cards" data-reveal-group>
            {t.services.map(([title, body], index) => {
              const IconComponent = serviceIcons[index] ?? Compass;
              const imgUrl = serviceImages[index] ?? "/marketing/service-design.webp";

              return (
                <article className="service-mockup-card" key={title} data-reveal="up">
                  <div className="service-mockup-card__thumb">
                    <Image
                      src={imgUrl}
                      alt={title}
                      fill
                      sizes="(max-width: 768px) 100vw, 25vw"
                      className="service-mockup-card__img"
                    />
                    <span className="service-mockup-card__icon-badge" aria-hidden="true">
                      <IconComponent size={20} />
                    </span>
                  </div>
                  <div className="service-mockup-card__body">
                    <h3 className="service-mockup-card__title">{title}</h3>
                    <p className="service-mockup-card__text">{body}</p>
                    <div className="service-mockup-card__footer">
                      <a
                        href="#contact"
                        className="service-mockup-card__arrow-btn"
                        aria-label={`${title} - ${t.home.primaryCta}`}
                      >
                        {arrow}
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Anchor for Why section narrative check */}
      <div id="why" className="why-anchor" aria-hidden="true" />

      {/* ============ 03 // PROCESS / STEPPER ============ */}
      <section id="process" className="process-section" aria-labelledby="process-title">
        <div className="process-bg-media" aria-hidden="true">
          <Image
            src="/marketing/process-blueprint.webp"
            alt=""
            fill
            sizes="100vw"
            className="process-bg-media__img"
          />
          <div className="process-bg-overlay" />
          <span className="process-watermark">{t.home.processWatermark}</span>
        </div>
        <div className="container process-content-wrap">
          <div className="process-head" data-reveal="up">
            <span className="section-eyebrow-tag section-eyebrow-tag--light">{t.home.processEyebrow}</span>
            <h2 id="process-title" className="process-head__title">{t.home.processTitle}</h2>
            <p className="process-head__lead">{t.home.processLead}</p>
          </div>

          <div className="process-panel" data-reveal="up">
            <ol className="process-grid" data-reveal-group>
              {t.process.map(([title, body], index) => (
                <li className="process-stage" key={title} data-reveal="stage">
                  <div className="process-stage__connector" aria-hidden="true">
                    <span className="process-stage__dot" />
                    <span className="process-stage__line" />
                  </div>
                  <span className="process-stage__node">
                    <bdi>{String(index + 1).padStart(2, "0")}</bdi>
                  </span>
                  <div className="process-stage__content">
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ============ 04 // DIGITAL PLATFORM ============ */}
      <section id="platform" className="platform-section" aria-labelledby="platform-title">
        <div className="container">
          <div className="platform-mockup-layout">
            <div className="platform-copy" data-reveal="up">
              <span className="section-eyebrow-tag">{t.home.digitalEyebrow}</span>
              <h2 id="platform-title" className="platform-title">{t.home.digitalTitle}</h2>
              <p className="platform-lead">{t.home.digitalLead}</p>
              <div className="platform-actions">
                <Button href={langHref(locale, "/login")} variant="primary" className="platform-cta-btn">
                  {t.home.digitalCta} {arrow}
                </Button>
              </div>
            </div>

            <div className="platform-visuals-wrap" data-reveal="mask">
              <div className="platform-device platform-device--laptop">
                <Image
                  src="/marketing/platform-desktop.webp"
                  alt="ELHABAK Dashboard Desktop"
                  width={680}
                  height={425}
                  className="platform-device__img"
                />
              </div>
              <div className="platform-device platform-device--phone">
                <Image
                  src="/marketing/platform-mobile.webp"
                  alt="ELHABAK Dashboard Mobile"
                  width={220}
                  height={476}
                  className="platform-device__img"
                />
              </div>
            </div>

            <div className="platform-features-col" data-reveal="up">
              <div className="platform-feature-pill">
                <Activity size={18} className="platform-feature-pill__icon" />
                <span>{t.home.digitalFeatures[0]}</span>
              </div>
              <div className="platform-feature-pill">
                <FileText size={18} className="platform-feature-pill__icon" />
                <span>{t.home.digitalFeatures[1]}</span>
              </div>
              <div className="platform-feature-pill">
                <BarChart3 size={18} className="platform-feature-pill__icon" />
                <span>{t.home.digitalFeatures[2]}</span>
              </div>
              <div className="platform-feature-pill">
                <MessageSquare size={18} className="platform-feature-pill__icon" />
                <span>{t.home.digitalFeatures[3]}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 05 // FAQ ============ */}
      <section id="faq" className="faq-section" aria-labelledby="faq-title">
        <div className="container">
          <div className="faq-mockup-layout">
            <div className="faq-accordion-side" data-reveal="up">
              <FaqAccordion items={t.faq} />
            </div>

            <div className="faq-drawing-info" data-reveal="up">
              <span className="section-eyebrow-tag">{t.home.faqEyebrow}</span>
              <h2 id="faq-title" className="faq-drawing-title">{t.home.faqTitle}</h2>
              <p className="faq-drawing-lead">{t.home.faqLead}</p>
              <Button href={whatsapp} target="_blank" rel="noreferrer" variant="ghost" className="faq-action-btn">
                {t.home.faqCta} {arrow}
              </Button>
            </div>

            <div className="faq-drawing-side" data-reveal="mask">
              <div className="faq-drawing-frame">
                <Image
                  src="/marketing/faq-blueprint.webp"
                  alt="Architectural Technical Elevation"
                  fill
                  sizes="(max-width: 980px) 100vw, 32vw"
                  className="faq-drawing-img"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 06 // CTA BANNER ============ */}
      <section id="contact" className="cta-banner-section" aria-labelledby="contact-title">
        <div className="cta-banner-bg" aria-hidden="true">
          <Image
            src="/marketing/cta-skyline.webp"
            alt=""
            fill
            sizes="100vw"
            className="cta-banner-bg__img"
          />
          <div className="cta-banner-overlay" />
        </div>
        <div className="container cta-banner-inner" data-reveal="up">
          <h2 id="contact-title" className="cta-banner-title">{t.home.ctaTitle}</h2>
          <p className="cta-banner-subtitle">{t.home.ctaSubtitle}</p>
          <div className="cta-banner-actions">
            <Button
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              variant="secondary"
              className="cta-banner-btn"
            >
              {t.home.ctaButton} {arrow}
            </Button>
            <a href={tel} className="cta-banner-phone">
              <Phone size={16} />
              <bdi dir="ltr">{t.contact.phone}</bdi>
            </a>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="site-footer site-footer--mockup">
        <div className="container footer-mockup-inner">
          <div className="footer-mockup-socials">
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn"><Linkedin size={18} /></a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={18} /></a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube"><Youtube size={18} /></a>
          </div>

          <nav className="footer-mockup-links" aria-label={t.home.footerNav}>
            <a href="#faq">{t.home.mobileFaq}</a>
            <span className="footer-mockup-sep">|</span>
            <a href="#contact">{t.nav.contact}</a>
            <span className="footer-mockup-sep">|</span>
            <a href="#about">{t.home.footerPrivacy}</a>
          </nav>

          <div className="footer-mockup-brand">
            <Image
              src="/brand/logo-horizontal.png"
              alt="ELHABAK Construction"
              width={180}
              height={75}
            />
          </div>

          <div className="footer-mockup-copy">
            <span>{t.home.footerRights}</span>
          </div>

          <div className="footer-mockup-slogan">
            <span>{t.home.footerTagline}</span>
            <i className="footer-mockup-slogan__bar" aria-hidden="true" />
          </div>
        </div>
      </footer>
    </main>
  );
}
