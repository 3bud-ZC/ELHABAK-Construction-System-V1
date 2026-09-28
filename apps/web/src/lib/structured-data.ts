export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://elhabak.com"
).replace(/\/+$/, "");

export type Locale = "ar" | "en";

export const CANONICAL_ORG_ID = `${siteUrl}/#organization`;
export const CANONICAL_WEBSITE_ID = `${siteUrl}/#website`;

export const CANONICAL_COMPANY_DESCRIPTIONS = {
  ar: "الحباك للمقاولات والاستشارات الهندسية (ELHABAK Construction) هي شركة مصرية تقدم خدمات المقاولات والاستشارات الهندسية، وتشمل التصميم المعماري والهندسي، إدارة والإشراف على المشروعات، أعمال التنفيذ والتشطيبات، ومتابعة دورة المشروع من مراحل التصميم وحتى التنفيذ والتسليم.",
  en: "ELHABAK Construction is an Egyptian contracting and engineering consultancy company providing architectural and engineering design, project management and supervision, construction and finishing services, with project delivery support from design through execution and handover."
} as const;

export const CANONICAL_COMPANY_NAMES = {
  en: "ELHABAK Construction",
  ar: "الحباك للمقاولات والاستشارات الهندسية",
  alternates: [
    "الحباك للمقاولات والاستشارات الهندسية",
    "ELHABAK",
    "الحباك",
    "الحباك للمقاولات",
    "الحباك للاستشارات الهندسية"
  ]
} as const;

export function buildCanonicalOrganization(locale: Locale = "ar") {
  return {
    "@type": ["Organization", "ProfessionalService", "GeneralContractor"],
    "@id": CANONICAL_ORG_ID,
    name: CANONICAL_COMPANY_NAMES.en,
    legalName: CANONICAL_COMPANY_NAMES.ar,
    alternateName: [...CANONICAL_COMPANY_NAMES.alternates],
    url: `${siteUrl}/`,
    logo: `${siteUrl}/brand/logo-horizontal.png`,
    image: `${siteUrl}/marketing/hero-delivery.webp`,
    telephone: "+201130666726",
    email: "elhabakconstruction.eg@gmail.com",
    description: CANONICAL_COMPANY_DESCRIPTIONS[locale],
    sameAs: ["https://maps.app.goo.gl/apBRMCmUquZ6XYXv7"],
    hasMap: "https://maps.app.goo.gl/apBRMCmUquZ6XYXv7",
    areaServed: [{ "@type": "Country", name: "Egypt" }],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: "+201130666726",
        email: "elhabakconstruction.eg@gmail.com",
        availableLanguage: ["ar", "en"]
      }
    ]
  };
}

export function buildCanonicalWebSite() {
  return {
    "@type": "WebSite",
    "@id": CANONICAL_WEBSITE_ID,
    url: `${siteUrl}/`,
    name: CANONICAL_COMPANY_NAMES.en,
    alternateName: [
      CANONICAL_COMPANY_NAMES.ar,
      "ELHABAK",
      "الحباك"
    ],
    publisher: { "@id": CANONICAL_ORG_ID },
    inLanguage: ["ar", "en"]
  };
}

export function buildAboutPageSchema(locale: Locale) {
  const pagePath = locale === "ar" ? "/about" : "/about?lang=en";
  return {
    "@type": "AboutPage",
    "@id": `${siteUrl}${pagePath}#webpage`,
    url: `${siteUrl}${pagePath}`,
    name:
      locale === "ar"
        ? "من نحن | ELHABAK Construction — الحباك للمقاولات والاستشارات الهندسية"
        : "About Us | ELHABAK Construction — Contracting & Engineering Consultancy",
    description: CANONICAL_COMPANY_DESCRIPTIONS[locale],
    inLanguage: locale,
    isPartOf: { "@id": CANONICAL_WEBSITE_ID },
    about: { "@id": CANONICAL_ORG_ID },
    mainEntity: { "@id": CANONICAL_ORG_ID }
  };
}

export function buildContactPageSchema(locale: Locale) {
  const pagePath = locale === "ar" ? "/contact" : "/contact?lang=en";
  return {
    "@type": "ContactPage",
    "@id": `${siteUrl}${pagePath}#webpage`,
    url: `${siteUrl}${pagePath}`,
    name:
      locale === "ar"
        ? "تواصل معنا | ELHABAK Construction — الحباك للمقاولات والاستشارات الهندسية"
        : "Contact Us | ELHABAK Construction — Contracting & Engineering Consultancy",
    description:
      locale === "ar"
        ? "تواصل مع شركة الحباك للمقاولات والاستشارات الهندسية (ELHABAK Construction) في مصر: هاتف 01130666726، واتساب 201130666726، بريد إلكتروني، واستشارة هندسية لمشروعك."
        : "Contact ELHABAK Construction in Egypt: phone 01130666726, WhatsApp 201130666726, email, and specialized engineering consultation for your project.",
    inLanguage: locale,
    isPartOf: { "@id": CANONICAL_WEBSITE_ID },
    about: { "@id": CANONICAL_ORG_ID },
    mainEntity: { "@id": CANONICAL_ORG_ID }
  };
}

export function buildServiceSchema(
  locale: Locale,
  path: string,
  name: string,
  description: string
) {
  const pagePath = locale === "ar" ? path : `${path}?lang=en`;
  return {
    "@type": "Service",
    name,
    description,
    url: `${siteUrl}${pagePath}`,
    provider: { "@id": CANONICAL_ORG_ID },
    areaServed: [{ "@type": "Country", name: "Egypt" }]
  };
}

export function buildBreadcrumbSchema(locale: Locale, path: string, name: string) {
  const homePath = locale === "ar" ? "/" : "/?lang=en";
  const pagePath = locale === "ar" ? path : `${path}?lang=en`;
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: locale === "ar" ? "الرئيسية" : "Home",
        item: `${siteUrl}${homePath}`
      },
      {
        "@type": "ListItem",
        position: 2,
        name,
        item: `${siteUrl}${pagePath}`
      }
    ]
  };
}

export function buildFaqSchema(
  locale: Locale,
  items: readonly (readonly [string, string])[]
) {
  const homePath = locale === "ar" ? "/" : "/?lang=en";
  return {
    "@type": "FAQPage",
    "@id": `${siteUrl}${homePath}#faq`,
    inLanguage: locale,
    mainEntity: items.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer
      }
    }))
  };
}
