import Image from "next/image";
import type { Metadata } from "next";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  Building2,
  ClipboardCheck,
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
import { BlueprintPlan } from "./blueprint-art";
import { ProcessRoute } from "./process-route";
import { MobileContactBar, publicNavItems, SiteFooter } from "./seo-page";
import { SocialLinks } from "./social-links";

type PageProps = {
  searchParams?: Promise<{ lang?: string }>;
};

function langHref(locale: "ar" | "en", path = "/") {
  return locale === "ar" ? path : `${path}?lang=en`;
}

/** Isolates Arabic runs inside English copy so brackets and line wraps keep their order. */
function isolateArabic(text: string) {
  return text.split(/([\u0600-\u06FF][\u0600-\u06FF\s]*[\u0600-\u06FF])/).map((part, index) =>
    index % 2 === 1 ? <bdi lang="ar" dir="rtl" key={index}>{part}</bdi> : part
  );
}

import {
  buildCanonicalOrganization,
  buildCanonicalWebSite,
  buildBreadcrumbSchema
} from "../lib/structured-data";

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const locale = resolveLocale(params?.lang);

  if (locale === "en") {
    return {
      title: "ELHABAK Construction | Contracting & Engineering Consultancy",
      description:
        "ELHABAK Construction is an Egyptian contracting and engineering consultancy company providing design, supervision, project management, construction and finishing services.",
      keywords: [
        "ELHABAK Construction",
        "Elhabak",
        "engineering consultancy",
        "construction management",
        "project tracking platform",
        "engineering project management system",
        "site supervision",
        "design and execution"
      ],
      alternates: {
        canonical: "/?lang=en",
        languages: {
          ar: "/",
          en: "/?lang=en",
          "x-default": "/"
        }
      },
      openGraph: {
        title: "ELHABAK Construction | Contracting & Engineering Consultancy",
        description:
          "ELHABAK Construction is an Egyptian contracting and engineering consultancy company providing design, supervision, project management, construction and finishing services.",
        url: "/?lang=en",
        siteName: "ELHABAK Construction",
        locale: "en_US",
        images: [
          {
            url: "/marketing/hero-delivery.webp",
            width: 1536,
            height: 866,
            alt: "ELHABAK Construction completed building"
          }
        ]
      },
      twitter: {
        card: "summary_large_image",
        title: "ELHABAK Construction | Contracting & Engineering Consultancy",
        description:
          "ELHABAK Construction is an Egyptian contracting and engineering consultancy company providing design, supervision, project management, construction and finishing services.",
        images: ["/marketing/hero-delivery.webp"]
      }
    };
  }

  return {
    title: "ELHABAK Construction | الحباك للمقاولات والاستشارات الهندسية",
    description:
      "الحباك للمقاولات والاستشارات الهندسية — خدمات التصميم والاستشارات الهندسية، إدارة والإشراف على المشروعات، المقاولات والتنفيذ والتشطيبات في مصر.",
    keywords: [
      "الحباك للمقاولات والاستشارات الهندسية",
      "الحباك للمقاولات",
      "الحباك للاستشارات الهندسية",
      "ELHABAK Construction",
      "مقاولات سوهاج",
      "إدارة المشاريع الهندسية",
      "متابعة مواقع التنفيذ",
      "منصة متابعة المشاريع"
    ],
    alternates: {
      canonical: "/",
      languages: {
        ar: "/",
        en: "/?lang=en",
        "x-default": "/"
      }
    },
    openGraph: {
      title: "ELHABAK Construction | الحباك للمقاولات والاستشارات الهندسية",
      description:
        "الحباك للمقاولات والاستشارات الهندسية — خدمات التصميم والاستشارات الهندسية، إدارة والإشراف على المشروعات، المقاولات والتنفيذ والتشطيبات في مصر.",
      url: "/",
      siteName: "ELHABAK Construction",
      locale: "ar_EG",
      images: [
        {
          url: "/marketing/hero-delivery.webp",
          width: 1536,
          height: 866,
          alt: "ELHABAK Construction completed building"
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: "ELHABAK Construction | الحباك للمقاولات والاستشارات الهندسية",
      description:
        "الحباك للمقاولات والاستشارات الهندسية — خدمات التصميم والاستشارات الهندسية، إدارة والإشراف على المشروعات، المقاولات والتنفيذ والتشطيبات في مصر.",
      images: ["/marketing/hero-delivery.webp"]
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
    [langHref(locale, "/about"), t.nav.about],
    [langHref(locale, "/services"), t.nav.services],
    [`${langHref(locale)}#process`, t.nav.process],
    [langHref(locale, "/platform"), t.nav.platform],
    [`${langHref(locale)}#faq`, t.home.faqEyebrow],
    [langHref(locale, "/contact"), t.nav.contact]
  ] as const;

  // Canonical entity schema: Organization, ProfessionalService, GeneralContractor
  const organizationLd = {
    ...buildCanonicalOrganization(locale),
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
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      organizationLd,
      buildCanonicalWebSite(),
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}${langHref(locale)}#faq`,
        inLanguage: locale,
        mainEntity: t.faq.map(([question, answer]) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: {
            "@type": "Answer",
            text: answer
          }
        }))
      },
      buildBreadcrumbSchema(locale, "/", locale === "ar" ? "الرئيسية" : "Home")
    ]
  };

  // One building, three readings of it: the drawing, the half-built frame, the handover.
  const heroStates = [
    { key: "design" as const, label: locale === "ar" ? "التصميم" : "Design" },
    { key: "execution" as const, label: locale === "ar" ? "التنفيذ" : "Execution" },
    { key: "delivery" as const, label: locale === "ar" ? "التسليم" : "Delivery" }
  ];

  // 5 Canonical Services configuration
  const serviceIcons = [Compass, ClipboardCheck, HardHat, Building2, PaintBucket];
  const serviceImages = [
    "/marketing/service-design.webp",
    "/marketing/hero-engineers-site.webp",
    "/marketing/hero-execution.webp",
    "/marketing/service-contracting.webp",
    "/marketing/service-finishing.webp"
  ];
  const serviceHrefs = [
    "/architectural-design",
    "/construction-management",
    "/services",
    "/services",
    "/services"
  ];
  const serviceDetails = locale === "ar" ? "تفاصيل الخدمة" : "Service details";

  // What the delivery drawing gains at each of the six stages.
  const processLayers =
    locale === "ar"
      ? [
          "الرفع المساحي ومحاور الموقع",
          "خطوط التصميم المعماري والإنشائي",
          "الأبعاد وحصر الكميات",
          "الهيكل الإنشائي دوراً بدور",
          "إغلاق الواجهات ونقاط الفحص",
          "اعتماد نهائي ومستندات المشروع"
        ]
      : [
          "Site survey and setting-out axes",
          "Architectural and structural linework",
          "Dimensions and quantity take-off",
          "Structure rising floor by floor",
          "Envelope closed, inspection points",
          "Final approval and project documents"
        ];

  // How project information travels: from the site to the client's reports.
  const platformPipeline = [
    { key: "site", label: locale === "ar" ? "الموقع" : "Site" },
    { key: "documentation", label: locale === "ar" ? "التوثيق" : "Documentation" },
    { key: "approval", label: locale === "ar" ? "الاعتماد" : "Approval" },
    { key: "platform", label: locale === "ar" ? "المنصة" : "Platform" },
    { key: "reports", label: locale === "ar" ? "التقارير" : "Reports" }
  ];
  const platformChannelNodes = ["site", "approval", "reports", "platform"];

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
        navItems={publicNavItems(locale, t.nav)}
      />

      {/* ============ 01 // HERO EXPERIENCE ============ */}
      <PublicHero
        image="/marketing/hero-delivery.webp"
        states={heroStates}
        capabilities={t.home.capabilities}
        stepperLabel={locale === "ar" ? "من المخطط إلى المبنى" : "From drawing to building"}
        alt={
          locale === "ar"
            ? "واجهة مبنى سكني مكتمل تظهر تدريجياً فوق مخططه الهندسي"
            : "A completed residential building resolving out of its engineering elevation drawing"
        }
      >
        <div className="hero-eyebrow">
          <span className="hero-eyebrow__mark" aria-hidden="true" />
          <span className="hero-eyebrow__text">{t.home.heroTag}</span>
          <span className="hero-eyebrow__brand" dir="ltr">ELHABAK Construction</span>
        </div>
        <h1 aria-label={t.home.heroTitle}>
          {locale === "ar" ? (
            <>
              <span className="hero-title__brand">الحباك</span>{" "}
              <span className="hero-title__line">للمقاولات والاستشارات الهندسية</span>
            </>
          ) : (
            <>
              <span className="hero-title__brand">ELHABAK</span>{" "}
              <span className="hero-title__line hero-title__line--en">Construction</span>
            </>
          )}
        </h1>
        <p className="hero-subtitle">{locale === "en" ? isolateArabic(t.home.heroSubtitle) : t.home.heroSubtitle}</p>
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
          <Button href={langHref(locale, "/services")} variant="ghost" className="hero-cta hero-cta--ghost">
            {t.home.secondaryCta} {arrow}
          </Button>
        </div>
        <a className="hero-system-note" href={`${langHref(locale)}#platform`}>
          <span className="hero-system-note__signal" aria-hidden="true"><Activity size={16} /></span>
          <span className="hero-system-note__text">
            <strong>{locale === "ar" ? "منصة تشغيل المشروع" : "Project operations platform"}</strong>
            <span>{locale === "ar" ? "متابعة التصميم والتنفيذ والمالية من مساحة عمل واحدة." : "Design, execution, finance, and client visibility in one workspace."}</span>
          </span>
        </a>
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
                <Button href={langHref(locale, "/services")} variant="ghost" className="about-cta-btn">
                  {t.home.aboutCta} {arrow}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 02B // BLUEPRINT TO REALITY BRIDGE ============ */}
      <section className="blueprint-reality" aria-labelledby="blueprint-reality-title">
        <div className="container blueprint-reality__inner">
          <div className="blueprint-reality__copy" data-reveal="up">
            <span className="section-eyebrow-tag">
              {locale === "ar" ? "من الرسم إلى التنفيذ" : "BLUEPRINT TO REALITY"}
            </span>
            <h2 id="blueprint-reality-title" className="blueprint-reality__title">
              {locale === "ar"
                ? "نربط القرار الهندسي بالموقع والمنصة"
                : "Engineering decisions connected to site and platform"}
            </h2>
            <p className="blueprint-reality__lead">
              {locale === "ar"
                ? "كل مرحلة تبدأ بمخطط واضح، ثم تتحول إلى تنفيذ موثق وقرارات متابعة يمكن الرجوع إليها داخل مساحة المشروع."
                : "Each stage begins with a clear drawing, then becomes documented execution and traceable project-control decisions."}
            </p>
          </div>
          <figure className="blueprint-reality__visual" data-reveal="mask">
            <div className="blueprint-reality__frame">
              <div className="blueprint-reality__image">
                <Image
                  src="/marketing/about-site.webp"
                  alt={locale === "ar" ? "موقع تنفيذ تحت المتابعة الهندسية" : "Construction site under engineering supervision"}
                  fill
                  sizes="(max-width: 980px) 100vw, 46vw"
                  className="blueprint-reality__img"
                />
              </div>
              <div className="blueprint-reality__drawing" aria-hidden="true">
                <BlueprintPlan className="blueprint-reality__plan" />
              </div>
              <span className="blueprint-reality__cut" aria-hidden="true" />
            </div>
            <figcaption className="blueprint-reality__caption">
              <span>{locale === "ar" ? "المخطط المعتمد" : "Approved drawing"}</span>
              <i aria-hidden="true" />
              <span>{locale === "ar" ? "التنفيذ في الموقع" : "Execution on site"}</span>
            </figcaption>
          </figure>
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

          <div className="services-showcase service-register" data-reveal-group>
            {/* Featured Primary Service: Design */}
            {t.services.length > 0 && (
              <article className="service-card service-card--featured" data-reveal="up">
                <div className="service-card__thumb">
                  <Image
                    src={serviceImages[0] ?? "/marketing/service-design.webp"}
                    alt={t.services[0][0]}
                    fill
                    sizes="(max-width: 980px) 100vw, 50vw"
                    className="service-card__img"
                  />
                  <div className="service-card__badge-tag">
                    <Compass size={18} />
                    <span>{t.home.servicesFeaturedBadge}</span>
                  </div>
                </div>
                <div className="service-card__body">
                  <span className="service-card__idx">01</span>
                  <h3 className="service-card__title">{t.services[0][0]}</h3>
                  <p className="service-card__desc">{t.services[0][1]}</p>
                  <a
                    href={langHref(locale, serviceHrefs[0] ?? "/services")}
                    className="service-card__action"
                    aria-label={`${t.services[0][0]} - ${serviceDetails}`}
                  >
                    <span>{serviceDetails}</span>
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
                        href={langHref(locale, serviceHrefs[index] ?? "/services")}
                        className="service-card__link"
                        aria-label={`${title} - ${serviceDetails}`}
                      >
                        <span>{serviceDetails}</span>
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
        <div className="container">
          <ProcessRoute
            stages={t.process}
            layers={processLayers}
            stageWord={locale === "ar" ? "المرحلة" : "Stage"}
            boardLabel={locale === "ar" ? "مشروع واحد عبر ست مراحل" : "One project across six stages"}
          >
            <div className="process-head" data-reveal="up">
              <span className="section-eyebrow-tag section-eyebrow-tag--light">
                {t.home.processEyebrow}
              </span>
              <h2 id="process-title" className="process-head__title">{t.home.processTitle}</h2>
              <p className="process-head__lead">{t.home.processLead}</p>
            </div>
          </ProcessRoute>
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

              {/* One primary control layer, then the three supporting channels. */}
              <ul className="platform-channels">
                {t.home.digitalFeatures.map((feat, idx) => {
                  const IconComponent = [Activity, FileText, BarChart3, MessageSquare][idx] ?? Activity;
                  return (
                    <li
                      className={`platform-channel${idx === 0 ? " platform-channel--primary" : ""}`}
                      key={feat.title}
                      data-node={platformChannelNodes[idx]}
                    >
                      <span className="platform-channel__icon" aria-hidden="true">
                        <IconComponent size={idx === 0 ? 22 : 18} />
                      </span>
                      <div className="platform-channel__text">
                        <strong>{feat.title}</strong>
                        <p>{feat.desc}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="platform-actions">
                <Button
                  href={langHref(locale, "/platform")}
                  variant="primary"
                  className="platform-cta-btn"
                >
                  {t.home.digitalCta} {arrow}
                </Button>
                <p className="platform-note">{t.home.digitalNote}</p>
              </div>
            </div>

            <div className="platform-showcase" data-reveal="mask">
              <div className="platform-stage">
                <div className="platform-stage__floor" aria-hidden="true" />
                <div className="platform-device platform-device--desktop">
                  <div className="platform-device__frame">
                    <Image
                      src="/marketing/platform-desktop.webp"
                      alt={locale === "ar" ? "لوحة التحكم في منصة الحباك على سطح المكتب" : "ELHABAK platform dashboard on desktop"}
                      width={720}
                      height={450}
                      sizes="(max-width: 980px) 100vw, 64vw"
                      className="platform-device__img"
                    />
                  </div>
                </div>
                <div className="platform-device platform-device--mobile">
                  <div className="platform-device__phone-frame">
                    <Image
                      src="/marketing/platform-mobile.webp"
                      alt={locale === "ar" ? "متابعة المشروع من الهاتف على منصة الحباك" : "ELHABAK project tracking on mobile"}
                      width={220}
                      height={476}
                      sizes="(max-width: 640px) 34vw, 200px"
                      className="platform-device__phone-img"
                    />
                  </div>
                </div>
              </div>
              <ol
                className="platform-pipeline"
                aria-label={locale === "ar" ? "مسار معلومات المشروع" : "Project information flow"}
              >
                {platformPipeline.map((node) => (
                  <li className="platform-pipeline__node" key={node.key} data-node={node.key}>
                    <i className="platform-pipeline__dot" aria-hidden="true" />
                    <span>{node.label}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 06 // FAQ, CONTACT BANNER & FOOTER ============ */}
      <section id="faq" className="faq-section" aria-labelledby="faq-title">
        <div className="container">
          <div className="faq-layout faq-register">
            <div className="faq-content" data-reveal="up">
              <span className="section-eyebrow-tag">{t.home.faqEyebrow}</span>
              <h2 id="faq-title" className="faq-title">{t.home.faqTitle}</h2>
              <p className="faq-lead">{t.home.faqLead}</p>

              <div className="faq-items-wrap">
                <FaqAccordion items={t.faq} />
              </div>
            </div>

            <aside className="faq-visual" data-reveal="mask">
              <div className="faq-technical-card faq-technical-card--plan" aria-hidden="true">
                <BlueprintPlan className="faq-technical-plan" />
              </div>
              <div className="faq-direct-action">
                <p className="faq-direct-action__lead">{t.home.contactLead}</p>
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
            </aside>
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
          <SocialLinks locale={locale} variant="contact" title={locale === "ar" ? "تابع أعمالنا" : "Follow our work"} />
        </div>
      </section>

      <SiteFooter locale={locale} />
      <MobileContactBar locale={locale} />
    </main>
  );
}
