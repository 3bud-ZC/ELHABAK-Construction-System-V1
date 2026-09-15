import Image from "next/image";
import { ArrowLeft, ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { Button, Section } from "@elhabak/ui";
import { dictionary, resolveLocale, textDirections } from "../i18n/translations";
import { HeroScene } from "./hero-scene";
import { AboutVisual } from "./about-visual";
import { VisionScene } from "./vision-scene";
import { ContactScene } from "./contact-scene";

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
            <a href="#platform">{t.nav.platform}</a>
            <a href="#contact">{t.nav.contact}</a>
          </nav>
          <div className="header-actions">
            <a className="lang-link" href={langHref(alternate)}>
              {t.nav.language}
            </a>
            <Button href={langHref(locale, "/login")} variant="secondary" className="header-login">
              {t.nav.login}
            </Button>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero__scene" aria-hidden="true">
          <HeroScene />
        </div>

        {/* technical annotations — kept outside the flipped scene so text never mirrors */}
        <span className="hero-tag hero-tag--design" aria-hidden="true">
          {locale === "ar" ? "مخطط التصميم" : "DESIGN LAYER"}
        </span>
        <span className="hero-tag hero-tag--axis" aria-hidden="true">AXIS A—A</span>
        <span className="hero-tag hero-tag--ffl" aria-hidden="true">FFL ±0.00</span>

        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="hero-eyebrow">
              <span className="hero-eyebrow__bar" aria-hidden="true" />
              ELHABAK CONSTRUCTION
            </span>
            <h1>
              {locale === "ar" ? (
                <>
                  <span>الحباك</span>
                  <span>للاستشارات</span>
                  <span>الهندسية</span>
                </>
              ) : (
                <>
                  <span>ELHABAK</span>
                  <span>CONSTRUCTION</span>
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
        </div>

        <aside className="hero-scope">
          <span className="hero-scope__tag">
            {locale === "ar" ? "نطاق العمل" : "WORK SCOPE"}
          </span>
          <strong>{t.home.heroPanelTitle}</strong>
          <p>{t.home.heroPanelText}</p>
        </aside>

        <div className="hero-marker" aria-hidden="true">
          <span className="hero-marker__line" />
          <span className="hero-marker__text">
            {locale === "ar" ? "نبني أفكارك لواقع أجمل" : "ENGINEERING A BETTER TOMORROW"}
          </span>
          <span className="hero-marker__line" />
        </div>

        <div className="hero-rail" aria-hidden="true">
          <div className="container hero-rail__inner">
            <span>DESIGN</span>
            <span>EXECUTION</span>
            <span>FINISHING</span>
            <span>CONTRACTING</span>
            <span>FIT-OUT</span>
            <i className="hero-rail__sep" />
            <span className="hero-rail__end">
              {locale === "ar" ? "من الرؤية إلى الواقع" : "FROM VISION TO REALITY"}
            </span>
          </div>
        </div>
      </section>

      {/* ============ 01 // ABOUT ============ */}
      <Section
        id="about"
        className="about-section"
        eyebrow={locale === "ar" ? "٠١ // عن الشركة" : "01 // ABOUT ELHABAK"}
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
            <AboutVisual />
            <figcaption className="sr-only">
              {locale === "ar"
                ? "رسم فني يوضح انتقال الفكرة من المخطط إلى الكتلة المعمارية"
                : "Technical drawing showing an idea moving from plan to architectural massing"}
            </figcaption>
          </figure>
        </div>
      </Section>

      {/* ============ 02 // SERVICES ============ */}
      <Section
        id="services"
        className="services-section"
        eyebrow={locale === "ar" ? "٠٢ // نطاق الخدمات" : "02 // SCOPE OF SERVICES"}
        title={t.home.servicesTitle}
        lead={t.home.servicesLead}
      >
        <div className="services-layout">
          {t.services.map(([title, body], index) => (
            <article className={`service-module ${index === 0 ? "service-module--feature" : ""}`} key={title}>
              <header className="service-module__head">
                <span className="service-module__index">{String(index + 1).padStart(2, "0")}</span>
                <span className="service-module__icon" aria-hidden="true">
                  <ServiceIcon index={index} />
                </span>
              </header>
              <h3>{title}</h3>
              <p>{body}</p>
              <span className="service-module__mark" aria-hidden="true" />
            </article>
          ))}
        </div>
      </Section>

      {/* ============ 03 // FROM VISION TO REALITY ============ */}
      <section className="vision-section" id="vision" aria-labelledby="vision-title">
        <div className="container vision-head">
          <p className="ui-section__eyebrow">
            {locale === "ar" ? "٠٣ // من الفكرة إلى البناء" : "03 // FROM IDEA TO BUILD"}
          </p>
          <h2 id="vision-title">{t.home.visionTitle}</h2>
          <p className="vision-lead">{t.home.visionLead}</p>
        </div>
        <div className="vision-stage" aria-hidden="true" dir="ltr">
          <VisionScene />
        </div>
        <div className="vision-stages" aria-hidden="true">
          <div className="container vision-stages__inner">
            {t.visionStages.map((stage, index) => (
              <span className="vision-stages__item" key={stage}>
                <i>{String(index + 1).padStart(2, "0")}</i>
                {stage}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 04 // DELIVERY PROCESS ============ */}
      <Section
        id="process"
        className="process-section"
        eyebrow={locale === "ar" ? "٠٤ // مسار التسليم" : "04 // DELIVERY SEQUENCE"}
        title={t.home.processTitle}
        lead={t.home.processLead}
      >
        <ol className="process-rail">
          {t.process.map(([title, body], index) => (
            <li className="process-phase" key={title}>
              <div className="process-phase__rail" aria-hidden="true">
                <span className="process-phase__tick" />
                <span className="process-phase__node">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="process-phase__body">
                <span className="process-phase__label" aria-hidden="true">
                  PHASE {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* ============ 05 // METHOD ============ */}
      <section className="method-section" id="why" aria-labelledby="method-title">
        <div className="container method-inner">
          <div className="method-head">
            <p className="ui-section__eyebrow">
              {locale === "ar" ? "٠٥ // منهجية العمل" : "05 // WORKING METHOD"}
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

      {/* ============ 06 // DIGITAL EXPERIENCE ============ */}
      <section className="digital-section" id="platform" aria-labelledby="digital-title">
        <div className="container digital-inner">
          <div className="digital-copy">
            <p className="ui-section__eyebrow">
              {locale === "ar" ? "٠٦ // التجربة الرقمية" : "06 // DIGITAL EXPERIENCE"}
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

      {/* ============ 07 // PRINCIPLES ============ */}
      <Section
        className="principles-section"
        eyebrow={locale === "ar" ? "٠٧ // قواعد العمل" : "07 // WORKING PRINCIPLES"}
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

      {/* ============ 08 // CONTACT ============ */}
      <section className="contact-section" id="contact" aria-labelledby="contact-title">
        <div className="contact-scene" aria-hidden="true" dir="ltr">
          <ContactScene />
        </div>
        <div className="container">
          <div className="contact-inner">
            <p className="ui-section__eyebrow">
              {locale === "ar" ? "٠٨ // تواصل" : "08 // CONTACT"}
            </p>
            <h2 id="contact-title">{t.home.contactTitle}</h2>
            <p className="contact-lead">{t.home.contactLead}</p>
          <div className="contact-channels">
            <a className="contact-channel" href={`tel:${t.contact.phone.replace(/[^\d+]/g, "")}`}>
              <Phone aria-hidden="true" size={17} />
              <span className="contact-channel__label">{locale === "ar" ? "الهاتف" : "PHONE"}</span>
              <bdi>{t.contact.phone}</bdi>
            </a>
            <a className="contact-channel" href={`mailto:${t.contact.email}`}>
              <Mail aria-hidden="true" size={17} />
              <span className="contact-channel__label">{locale === "ar" ? "البريد" : "EMAIL"}</span>
              <bdi>{t.contact.email}</bdi>
            </a>
            <div className="contact-channel contact-channel--static">
              <MapPin aria-hidden="true" size={17} />
              <span className="contact-channel__label">{locale === "ar" ? "العنوان" : "ADDRESS"}</span>
              <bdi>{t.contact.address}</bdi>
            </div>
          </div>
            <div className="contact-actions">
              <Button href={`tel:${t.contact.phone.replace(/[^\d+]/g, "")}`} variant="accent" className="hero-cta">
                {t.home.primaryCta} {dir === "rtl" ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </Button>
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
            <span className="footer-brand__axis" aria-hidden="true">ELHABAK — {locale === "ar" ? "سوهاج" : "SOHAG"}</span>
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

/** Thin technical line icons for the service modules — one drafting language. */
function ServiceIcon({ index }: { index: number }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };
  const paths = [
    // Design — drafting compass over a plan square
    <>
      <rect x="3" y="3" width="18" height="18" strokeDasharray="3 2.4" />
      <path d="M12 5 L8.5 15 M12 5 L15.5 15" />
      <path d="M9.6 12.2 A4.4 4.4 0 0 1 14.4 12.2" />
      <circle cx="12" cy="5" r="1.3" />
    </>,
    // Construction — structural frame with nodes
    <>
      <path d="M4 20 V8 h16 v12" />
      <path d="M4 14 h16 M10 8 v12 M16 8 v12" />
      <circle cx="10" cy="14" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="14" r="1.2" fill="currentColor" stroke="none" />
    </>,
    // Finishing — layered surfaces with roller
    <>
      <path d="M4 18 h16 M4 13.5 h10" />
      <rect x="14" y="6" width="7" height="4.5" rx="0.6" />
      <path d="M17.5 10.5 v2 a1.5 1.5 0 0 1 -1.5 1.5 h-4" />
      <path d="M9 14 v4" />
    </>,
    // General contracting — crane lifting a beam
    <>
      <path d="M5 21 V5 M5 5 h13 M5 9.5 L13 5" />
      <path d="M14 5 v4.5" />
      <rect x="11" y="9.5" width="6" height="3.6" />
      <path d="M5 21 h7" strokeDasharray="3 2.4" />
    </>,
    // Furniture — interior plan with chair outline
    <>
      <rect x="3.5" y="3.5" width="17" height="17" strokeDasharray="3 2.4" />
      <path d="M8 16 v-5 a2.4 2.4 0 0 1 2.4 -2.4 h3.2 a2.4 2.4 0 0 1 2.4 2.4 v5" />
      <path d="M8 13.4 h8 M8 16 v1.8 M16 16 v1.8" />
    </>
  ];
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" {...common}>
      {paths[index % paths.length]}
    </svg>
  );
}
