import Image from "next/image";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Button } from "@elhabak/ui";
import { companyContact, telHref, whatsappHref } from "@elhabak/contracts";
import type { Locale } from "../i18n/translations";
import { dictionary, textDirections } from "../i18n/translations";
import { siteUrl } from "../lib/site";
import { PublicHeader } from "./public-header";
import { PublicMotion } from "./public-motion";

export function langHref(locale: Locale, path = "/") {
  return locale === "ar" ? path : `${path}?lang=en`;
}

type SeoMetaInput = {
  title: string;
  description: string;
  keywords?: string[];
};

/** Builds per-page bilingual metadata: canonical, hreflang pair, OG, and Twitter tags. */
export function seoMetadata(path: string, locale: Locale, meta: SeoMetaInput): Metadata {
  const canonical = langHref(locale, path);
  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: {
      canonical,
      languages: {
        ar: path,
        en: `${path}?lang=en`
      }
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: canonical,
      siteName: "ELHABAK Construction",
      locale: locale === "ar" ? "ar_EG" : "en_US",
      type: "website",
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
      title: meta.title,
      description: meta.description,
      images: ["/marketing/hero-delivery.webp"]
    }
  };
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function breadcrumbLd(locale: Locale, path: string, name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: locale === "ar" ? "الرئيسية" : "Home",
        item: `${siteUrl}${langHref(locale)}`
      },
      {
        "@type": "ListItem",
        position: 2,
        name,
        item: `${siteUrl}${langHref(locale, path)}`
      }
    ]
  };
}

export function serviceLd(locale: Locale, path: string, name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url: `${siteUrl}${langHref(locale, path)}`,
    provider: { "@type": "Organization", "@id": `${siteUrl}/#organization` },
    areaServed: [{ "@type": "Country", name: "Egypt" }]
  };
}

/** Public site navigation shared by the homepage and standalone pages. */
export function publicNavItems(locale: Locale, labels: { about: string; services: string; process: string; platform: string; contact: string }) {
  return [
    { href: langHref(locale, "/about"), label: labels.about },
    { href: langHref(locale, "/services"), label: labels.services },
    { href: `${langHref(locale)}#process`, label: labels.process },
    { href: langHref(locale, "/platform"), label: labels.platform },
    { href: langHref(locale, "/contact"), label: labels.contact }
  ];
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = dictionary[locale];
  const links = [
    { href: langHref(locale, "/about"), label: t.nav.about },
    { href: langHref(locale, "/services"), label: t.nav.services },
    { href: `${langHref(locale)}#process`, label: t.nav.process },
    { href: langHref(locale, "/platform"), label: t.nav.platform },
    { href: `${langHref(locale)}#faq`, label: t.home.faqEyebrow },
    { href: langHref(locale, "/contact"), label: t.nav.contact }
  ];
  return (
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
            <p className="footer-entity">
              <bdi>{t.home.footerText}</bdi>
              <span aria-hidden="true"> · </span>
              <bdi>{locale === "ar" ? "ELHABAK Construction" : "الحباك للمقاولات والاستشارات الهندسية"}</bdi>
            </p>
          </div>
          <nav className="footer-nav" aria-label={t.home.footerNav}>
            {links.map((link) => (
              <a href={link.href} className="footer-nav__link" key={link.href}>
                {link.label}
              </a>
            ))}
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
  );
}

export function CtaBand({ locale }: { locale: Locale }) {
  const t = dictionary[locale];
  const dir = textDirections[locale];
  const arrow = dir === "rtl" ? <ArrowLeft size={18} /> : <ArrowRight size={18} />;
  const whatsapp = whatsappHref(companyContact, t.home.whatsappMessage);
  return (
    <section className="cta-banner-section" aria-labelledby="lp-cta-title">
      <div className="cta-banner-bg" aria-hidden="true">
        <Image src="/marketing/cta-skyline.webp" alt="" fill sizes="100vw" className="cta-banner-bg__img" />
        <div className="cta-banner-overlay" />
      </div>
      <div className="container cta-banner-inner" data-reveal="up">
        <div className="cta-banner-header">
          <h2 id="lp-cta-title" className="cta-banner-title">{t.home.ctaTitle}</h2>
          <p className="cta-banner-subtitle">{t.home.ctaSubtitle}</p>
        </div>
        <div className="cta-banner-actions">
          <Button href={whatsapp} target="_blank" rel="noreferrer" variant="secondary" className="cta-banner-btn">
            <MessageCircle size={18} />
            <span>{t.home.ctaButton}</span>
            {arrow}
          </Button>
          <a href={telHref(companyContact)} className="cta-banner-phone">
            <Phone size={18} />
            <bdi dir="ltr">{companyContact.phone}</bdi>
          </a>
        </div>
        <div className="cta-banner-meta">
          <div className="cta-meta-item">
            <MapPin size={16} className="cta-meta-item__icon" />
            <span>{companyContact.address}</span>
          </div>
          <div className="cta-meta-item">
            <Mail size={16} className="cta-meta-item__icon" />
            <a href={`mailto:${companyContact.email}`}>{companyContact.email}</a>
          </div>
        </div>
      </div>
    </section>
  );
}

export type SeoSection = {
  heading: string;
  lead?: string;
  paragraphs?: string[];
  bullets?: string[];
  cards?: { title: string; text: string; href?: string }[];
  steps?: { title: string; text: string }[];
};

export type SeoContent = {
  meta: SeoMetaInput;
  eyebrow: string;
  title: string;
  lead: string;
  image?: { src: string; alt: string };
  sections: SeoSection[];
  linksTitle?: string;
  links?: { href: string; label: string; text: string }[];
};

/** Renders a standalone public landing page: hero, structured sections, related links. */
export function SeoPage({
  locale,
  path,
  content,
  extraLd
}: {
  locale: Locale;
  path: string;
  content: SeoContent;
  extraLd?: Record<string, unknown>;
}) {
  const dir = textDirections[locale];
  const arrow = dir === "rtl" ? <ArrowLeft size={15} /> : <ArrowRight size={15} />;
  return (
    <SeoPageShell locale={locale} path={path}>
      <JsonLd data={breadcrumbLd(locale, path, content.title)} />
      {extraLd ? <JsonLd data={extraLd} /> : null}

      <section className="lp-hero" aria-labelledby="lp-title">
        <div className="container lp-hero__inner">
          <div className="lp-hero__text" data-reveal="up">
            <span className="section-eyebrow-tag">{content.eyebrow}</span>
            <h1 id="lp-title">{content.title}</h1>
            <p className="lp-hero__lead">{content.lead}</p>
          </div>
          {content.image ? (
            <div className="lp-hero__media" data-reveal="mask">
              <Image
                src={content.image.src}
                alt={content.image.alt}
                fill
                sizes="(max-width: 980px) 100vw, 42vw"
                className="lp-hero__img"
              />
            </div>
          ) : null}
        </div>
      </section>

      {content.sections.map((section) => (
        <section className="lp-section" key={section.heading} aria-labelledby={`lp-${content.sections.indexOf(section)}`}>
          <div className="container">
            <div className="lp-section__head" data-reveal="up">
              <h2 id={`lp-${content.sections.indexOf(section)}`}>{section.heading}</h2>
              {section.lead ? <p className="lp-section__lead">{section.lead}</p> : null}
            </div>
            {section.paragraphs?.map((paragraph) => (
              <p className="lp-paragraph" key={paragraph.slice(0, 40)} data-reveal="up">
                {paragraph}
              </p>
            ))}
            {section.bullets ? (
              <ul className="lp-bullet-grid" data-reveal-group>
                {section.bullets.map((bullet) => (
                  <li key={bullet.slice(0, 40)} data-reveal="up">
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
            {section.cards ? (
              <div className="lp-card-grid" data-reveal-group>
                {section.cards.map((card) => {
                  const body = (
                    <>
                      <h3>{card.title}</h3>
                      <p>{card.text}</p>
                      {card.href ? <span className="lp-card__action">{arrow}</span> : null}
                    </>
                  );
                  return card.href ? (
                    <a
                      className="lp-card lp-card--link"
                      href={card.href.startsWith("/") ? langHref(locale, card.href) : card.href}
                      key={card.title}
                      data-reveal="up"
                      {...(card.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                    >
                      {body}
                    </a>
                  ) : (
                    <article className="lp-card" key={card.title} data-reveal="up">
                      {body}
                    </article>
                  );
                })}
              </div>
            ) : null}
            {section.steps ? (
              <ol className="lp-steps" data-reveal-group>
                {section.steps.map((step, index) => (
                  <li className="lp-step" key={step.title} data-reveal="up">
                    <span className="lp-step__index mono"><bdi>{String(index + 1).padStart(2, "0")}</bdi></span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        </section>
      ))}

      {content.links && content.links.length > 0 ? (
        <section className="lp-section lp-section--links" aria-labelledby="lp-related">
          <div className="container">
            <div className="lp-section__head" data-reveal="up">
              <h2 id="lp-related">{content.linksTitle ?? (locale === "ar" ? "صفحات ذات صلة" : "Related pages")}</h2>
            </div>
            <div className="lp-link-grid" data-reveal-group>
              {content.links.map((link) => (
                <a className="lp-link-tile" href={langHref(locale, link.href)} key={link.href} data-reveal="up">
                  <strong>{link.label}</strong>
                  <span>{link.text}</span>
                  <span className="lp-link-tile__arrow" aria-hidden="true">{arrow}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </SeoPageShell>
  );
}

type SeoPageProps = {
  locale: Locale;
  path: string;
  children: ReactNode;
};

/** Shared chrome for standalone public pages: motion, header, then caller content. */
export function SeoPageShell({ locale, path, children }: SeoPageProps) {
  const t = dictionary[locale];
  const alternate: Locale = locale === "ar" ? "en" : "ar";
  const dir = textDirections[locale];
  const whatsapp = whatsappHref(companyContact, t.home.whatsappMessage);
  return (
    <main className="site-shell" lang={locale} dir={dir}>
      <PublicMotion />
      <PublicHeader
        locale={locale}
        alternate={alternate}
        dir={dir}
        labels={{
          about: t.nav.about,
          services: t.nav.services,
          process: t.nav.process,
          platform: t.nav.platform,
          contact: t.nav.contact,
          login: t.nav.login,
          language: t.nav.language
        }}
        navItems={publicNavItems(locale, t.nav)}
        whatsappUrl={whatsapp}
        loginHref={langHref(locale, "/login")}
        homeHref={langHref(locale)}
        alternateHref={langHref(alternate, path)}
      />
      {children}
      <CtaBand locale={locale} />
      <SiteFooter locale={locale} />
    </main>
  );
}
