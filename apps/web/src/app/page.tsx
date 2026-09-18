import Image from "next/image";
import type { Metadata } from "next";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  Building2,
  Compass,
  Eye,
  FileText,
  HardHat,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  PaintBucket,
  Phone,
  Sofa,
  Target
} from "lucide-react";
import { Button } from "@elhabak/ui";
import { telHref, whatsappHref } from "@elhabak/contracts";
import { dictionary, resolveLocale, textDirections } from "../i18n/translations";
import { siteUrl } from "../lib/site";
import { PublicHeader } from "./public-header";
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
        "ELHABAK Construction delivers architectural design, structural execution, finishing, general contracting, and furnishing in Sohag with organized digital project follow-up.",
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

  // Quick nav configuration kept for consistency and tests
  const mobileQuickNav = [
    ["#about", t.nav.about],
    ["#services", t.nav.services],
    ["#process", t.nav.process],
    ["#platform", t.nav.platform],
    ["#faq", t.home.faqEyebrow],
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

  // 5 Canonical Services configuration
  const serviceIcons = [Compass, HardHat, PaintBucket, Building2, Sofa];
  const serviceImages = [
    "/marketing/services-feature.webp",
    "/marketing/about-site.webp",
    "/marketing/service-finishing.webp",
    "/marketing/service-contracting.webp",
    "/marketing/service-furnishing.webp"
  ];

  const headerNavLabels = {
    about: t.nav.about,
    services: t.nav.services,
    process: t.nav.process,
    platform: t.nav.platform,
    contact: t.nav.contact,
    login: t.nav.login,
    language: t.nav.language
  };

  return (
    <main className="site-shell" lang={locale} dir={dir}>
      <PublicMotion />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      {/* Screen-reader accessible quick navigation landmarks */}
      <nav className="mobile-quick-nav" aria-label={locale === "ar" ? "تنقل سريع" : "Quick navigation"}>
        {mobileQuickNav.map(([href, label]) => (
          <a href={href} key={href}>{label}</a>
        ))}
      </nav>

      {/* ============ NAVIGATION HEADER ============ */}
      <PublicHeader
        locale={locale}
        alternate={alternate}
        dir={dir}
        labels={headerNavLabels}
        whatsappUrl={whatsapp}
        loginHref={langHref(locale, "/login")}
        homeHref={langHref(locale)}
        alternateHref={langHref(alternate)}
      />

      {/* ============ 01 // HERO EXPERIENCE ============ */}
      <PublicHero
        states={heroStates}
        tag={t.home.heroTag}
        sideLabel={t.home.heroRailText}
        signals={t.home.capabilities}
        railEnd={
          locale === "ar"
            ? "قرار هندسي واضح من أول مقابلة حتى التسليم"
            : "Clear engineering decisions from first meeting to handover"
        }
        scopeIndex={locale === "ar" ? "نطاق متكامل" : "INTEGRATED SCOPE"}
        scopeTitle={locale === "ar" ? "تصميم وتنفيذ متصل" : "Connected Design & Execution"}
        scopeText={
          locale === "ar"
            ? "من المخطط الأول حتى تسليم المفتاح"
            : "From initial concept to turnkey delivery"
        }
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
          <Button
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            variant="accent"
            className="hero-cta hero-cta--whatsapp"
          >
            <MessageCircle size={16} /> {t.home.primaryCta}
          </Button>
          <Button href="#services" variant="ghost" className="hero-cta hero-cta--ghost">
            {t.home.secondaryCta} {arrow}
          </Button>
        </div>
      </PublicHero>

      {/* ============ 02 // ABOUT & ENGINEERING POSITION ============ */}
      <section id="about" className="about-section" aria-labelledby="about-title">
        <div className="container">
          <div className="about-layout">
            <div className="about-visual" data-reveal="mask">
              <div className="about-photo-frame">
                <Image
                  src="/marketing/about-building.webp"
                  alt="ELHABAK Architecture"
                  fill
                  priority
                  sizes="(max-width: 980px) 100vw, 48vw"
                  className="about-photo-img"
                />
                <div className="about-badge">
                  <strong>{t.home.aboutBadgeTitle}</strong>
                  <span>{t.home.aboutBadgeSubtitle}</span>
                </div>
              </div>
            </div>

            <div className="about-content" data-reveal="up">
              <span className="section-eyebrow-tag">{t.home.aboutEyebrow}</span>
              <h2 id="about-title" className="about-title">{t.home.aboutTitle}</h2>
              <p className="about-lead">{t.home.aboutLead}</p>

              <div className="about-pillars">
                {t.home.aboutPillars.map((pillar, idx) => {
                  const IconComponent = [Target, Award, Eye][idx] ?? Target;
                  return (
                    <div className="about-pillar-item" key={pillar.title}>
                      <div className="about-pillar-icon">
                        <IconComponent size={20} />
                      </div>
                      <div className="about-pillar-text">
                        <strong>{pillar.title}</strong>
                        <p>{pillar.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="about-actions">
                <Button href="#services" variant="ghost" className="about-cta-btn">
                  {t.home.aboutCta} {arrow}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 03 // 5 CANONICAL SERVICES ============ */}
      <section id="services" className="services-section" aria-labelledby="services-title">
        <div className="container">
          <div className="services-head" data-reveal="up">
            <span className="section-eyebrow-tag">{t.home.servicesEyebrow}</span>
            <h2 id="services-title" className="services-head__title">{t.home.servicesTitle}</h2>
            <p className="services-head__lead">{t.home.servicesLead}</p>
          </div>

          <div className="services-showcase" data-reveal-group>
            {/* Featured Primary Service: Design */}
            {t.services.length > 0 && (
              <article className="service-card service-card--featured" data-reveal="up">
                <div className="service-card__thumb">
                  <Image
                    src={serviceImages[0] ?? "/marketing/services-feature.webp"}
                    alt={t.services[0][0]}
                    fill
                    sizes="(max-width: 980px) 100vw, 50vw"
                    className="service-card__img"
                  />
                  <div className="service-card__badge-tag">
                    <Compass size={18} />
                    <span>{locale === "ar" ? "خدمة رئيسية" : "FEATURED"}</span>
                  </div>
                </div>
                <div className="service-card__body">
                  <span className="service-card__idx">01</span>
                  <h3 className="service-card__title">{t.services[0][0]}</h3>
                  <p className="service-card__desc">{t.services[0][1]}</p>
                  <a
                    href="#contact"
                    className="service-card__action"
                    aria-label={`${t.services[0][0]} - ${t.home.primaryCta}`}
                  >
                    <span>{t.home.primaryCta}</span>
                    {arrow}
                  </a>
                </div>
              </article>
            )}

            {/* Complementary Services: Construction, Finishing, Contracting, Furnishing */}
            <div className="services-complementary-grid">
              {t.services.slice(1).map(([title, body], sliceIdx) => {
                const index = sliceIdx + 1;
                const IconComponent = serviceIcons[index] ?? HardHat;
                const imgUrl = serviceImages[index] ?? "/marketing/service-finishing.webp";

                return (
                  <article className="service-card service-card--compact" key={title} data-reveal="up">
                    <div className="service-card__thumb">
                      <Image
                        src={imgUrl}
                        alt={title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        className="service-card__img"
                      />
                      <span className="service-card__icon-badge" aria-hidden="true">
                        <IconComponent size={18} />
                      </span>
                    </div>
                    <div className="service-card__body">
                      <span className="service-card__idx">{String(index + 1).padStart(2, "0")}</span>
                      <h3 className="service-card__title">{title}</h3>
                      <p className="service-card__desc">{body}</p>
                      <a
                        href="#contact"
                        className="service-card__link"
                        aria-label={`${title} - ${t.home.primaryCta}`}
                      >
                        <span>{locale === "ar" ? "طلب استشارة" : "Consult"}</span>
                        {arrow}
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ============ 04 // 6-STAGE ENGINEERING DELIVERY PROCESS ============ */}
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
            <span className="section-eyebrow-tag section-eyebrow-tag--light">
              {t.home.processEyebrow}
            </span>
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

      {/* ============ 05 // DIGITAL PROJECT PLATFORM ============ */}
      <section id="platform" className="platform-section" aria-labelledby="platform-title">
        <div className="container">
          <div className="platform-layout">
            <div className="platform-info" data-reveal="up">
              <span className="section-eyebrow-tag">{t.home.digitalEyebrow}</span>
              <h2 id="platform-title" className="platform-title">{t.home.digitalTitle}</h2>
              <p className="platform-lead">{t.home.digitalLead}</p>

              <div className="platform-features-list">
                {t.home.digitalFeatures.map((feat, idx) => {
                  const IconComponent = [Activity, FileText, BarChart3, MessageSquare][idx] ?? Activity;
                  return (
                    <div className="platform-feature-card" key={feat.title}>
                      <div className="platform-feature-card__icon">
                        <IconComponent size={20} />
                      </div>
                      <div className="platform-feature-card__text">
                        <strong>{feat.title}</strong>
                        <p>{feat.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="platform-actions">
                <Button
                  href={langHref(locale, "/login")}
                  variant="primary"
                  className="platform-cta-btn"
                >
                  {t.home.digitalCta} {arrow}
                </Button>
              </div>
            </div>

            <div className="platform-showcase" data-reveal="mask">
              <div className="platform-device platform-device--desktop">
                <div className="platform-device__frame">
                  <Image
                    src="/marketing/platform-desktop.webp"
                    alt="ELHABAK Dashboard Desktop"
                    width={720}
                    height={450}
                    className="platform-device__img"
                  />
                </div>
              </div>
              <div className="platform-device platform-device--mobile">
                <div className="platform-device__phone-frame">
                  <Image
                    src="/marketing/platform-mobile.webp"
                    alt="ELHABAK Project Tracking Mobile"
                    width={220}
                    height={460}
                    className="platform-device__phone-img"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 06 // FAQ, CONTACT BANNER & FOOTER ============ */}
      <section id="faq" className="faq-section" aria-labelledby="faq-title">
        <div className="container">
          <div className="faq-layout">
            <div className="faq-content" data-reveal="up">
              <span className="section-eyebrow-tag">{t.home.faqEyebrow}</span>
              <h2 id="faq-title" className="faq-title">{t.home.faqTitle}</h2>
              <p className="faq-lead">{t.home.faqLead}</p>

              <div className="faq-items-wrap">
                <FaqAccordion items={t.faq} />
              </div>

              <div className="faq-direct-action">
                <Button
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  variant="ghost"
                  className="faq-action-btn"
                >
                  <MessageCircle size={16} />
                  <span>{t.home.whatsappCta}</span>
                  {arrow}
                </Button>
              </div>
            </div>

            <div className="faq-visual" data-reveal="mask">
              <div className="faq-technical-card">
                <Image
                  src="/marketing/faq-blueprint.webp"
                  alt="Architectural Technical Elevation"
                  fill
                  sizes="(max-width: 980px) 100vw, 36vw"
                  className="faq-technical-img"
                />
                <div className="faq-technical-overlay">
                  <span className="faq-technical-tag">
                    {locale === "ar" ? "مخطط قطاع هندسي معتمد" : "ENGINEERING ELEVATION"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA Banner */}
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
          <div className="cta-banner-header">
            <h2 id="contact-title" className="cta-banner-title">{t.home.ctaTitle}</h2>
            <p className="cta-banner-subtitle">{t.home.ctaSubtitle}</p>
          </div>

          <div className="cta-banner-actions">
            <Button
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              variant="secondary"
              className="cta-banner-btn"
            >
              <MessageCircle size={18} />
              <span>{t.home.ctaButton}</span>
              {arrow}
            </Button>
            <a href={tel} className="cta-banner-phone">
              <Phone size={18} />
              <bdi dir="ltr">{t.contact.phone}</bdi>
            </a>
          </div>

          <div className="cta-banner-meta">
            <div className="cta-meta-item">
              <MapPin size={16} className="cta-meta-item__icon" />
              <span>{t.contact.address}</span>
            </div>
            <div className="cta-meta-item">
              <Mail size={16} className="cta-meta-item__icon" />
              <a href={`mailto:${t.contact.email}`}>{t.contact.email}</a>
            </div>
          </div>
        </div>
      </section>

      {/* Deep Architectural Footer */}
      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-top">
            <div className="footer-brand-col">
              <Image
                src="/brand/logo-horizontal.png"
                alt="ELHABAK Construction"
                width={190}
                height={80}
                className="footer-logo"
              />
              <p className="footer-slogan">{t.home.footerTagline}</p>
            </div>

            <nav className="footer-nav" aria-label={t.home.footerNav}>
              <a href="#about" className="footer-nav__link">{t.nav.about}</a>
              <a href="#services" className="footer-nav__link">{t.nav.services}</a>
              <a href="#process" className="footer-nav__link">{t.nav.process}</a>
              <a href="#platform" className="footer-nav__link">{t.nav.platform}</a>
              <a href="#faq" className="footer-nav__link">{t.home.faqEyebrow}</a>
              <a href="#contact" className="footer-nav__link">{t.nav.contact}</a>
            </nav>
          </div>

          <div className="footer-bottom">
            <p className="footer-copyright">{t.home.footerRights}</p>
            <p className="footer-location">
              {locale === "ar" ? "سوهاج — جمهورية مصر العربية" : "Sohag — Arab Republic of Egypt"}
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
