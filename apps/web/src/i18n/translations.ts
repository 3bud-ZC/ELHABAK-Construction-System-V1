import { companyContact, defaultLocale, supportedLocales, textDirections } from "@elhabak/contracts";
import type { Locale } from "@elhabak/contracts";

export { defaultLocale, supportedLocales, textDirections };
export type { Locale };

export function resolveLocale(value?: string | string[]): Locale {
  const candidate = Array.isArray(value) ? value[0] : value;
  return supportedLocales.includes(candidate as Locale) ? (candidate as Locale) : defaultLocale;
}

export const dictionary = {
  ar: {
    nav: {
      about: "عن الحباك",
      services: "الخدمات",
      process: "آلية العمل",
      platform: "المنصة",
      contact: "تواصل معنا",
      login: "دخول النظام",
      language: "English"
    },
    home: {
      heroTag: "هندسة تصنع فرقاً",
      heroTitle: "الحباك للمقاولات والاستشارات الهندسية",
      heroSubtitle:
        "تصميم وتنفيذ وتشطيب للمشروعات السكنية والتجارية بإدارة هندسية متكاملة ومتابعة رقمية دقيقة من المعاينة حتى التسليم.",
      primaryCta: "ابدأ مشروعك معنا",
      requestInspection: "طلب معاينة",
      secondaryCta: "استعرض خدماتنا",
      explorePlatformCta: "اكتشف المنصة",
      whatsappCta: "ابدأ مشروعك معنا",
      whatsappMessage: "مرحبًا، أرغب في الاستفسار عن خدمات الحباك الهندسية والبدء في مشروع.",
      heroRailText: "هندسة لمستقبل أفضل",
      capabilities: [
        {
          title: "تصميم هندسي متكامل",
          desc: "مخططات معمارية وإنشائية وكهروميكانيكية معتمدة"
        },
        {
          title: "إشراف وتنفيذ ميداني",
          desc: "مطابقة صارمة للمواصفات ومتابعة يومية مستمرة"
        },
        {
          title: "متابعة رقمية للمشروع",
          desc: "منظومة إلكترونية شفافة للمالك من المعاينة حتى التسليم"
        }
      ],
      aboutEyebrow: "عن الحباك",
      aboutTitle: "شريكك الهندسي من الفكرة إلى الواقع",
      aboutLead:
        "الحباك للمقاولات والاستشارات الهندسية (ELHABAK Construction) تقدم خدمات التصميم والتنفيذ والتشطيب بإدارة احترافية، نلتزم بالجودة والشفافية، ونبني شراكات طويلة الأمد مع عملائنا.",
      aboutCta: "استعرض خدماتنا",
      aboutBadgeTitle: "هندسة تبني مجتمعات أفضل",
      aboutBadgeSubtitle: "ENGINEERING STRONGER COMMUNITIES",
      aboutPillars: [
        { title: "دقة التخطيط", desc: "مخططات هندسية تفصيلية ومقايسات واضحة قبل البدء في التنفيذ." },
        { title: "جودة التنفيذ", desc: "إشراف ميداني مستمر ومطابقة صارمة لأعلى المعايير القياسية." },
        { title: "شفافية المتابعة", desc: "توثيق رقمي وتقارير دورية لكافة مراحل المشروع لحظة بلحظة." }
      ],
      servicesEyebrow: "نطاق الخدمات",
      servicesTitle: "حلول هندسية متكاملة",
      servicesLead: "من التخطيط والدراسة حتى التسليم النهائي، خدمات متصلة تضمن أعلى درجات الانضباط والجودة.",
      servicesFeaturedBadge: "الخدمة المميزة",
      processEyebrow: "منهجية التنفيذ",
      processTitle: "مسار العمل الهندسي: من المعاينة حتى التسليم",
      processLead: "ست مراحل واضحة تضمن انضباط الجدول الزمني والمواصفات وجودة التنفيذ في كل خطوة.",
      processWatermark: "ENGINEERING DELIVERY SEQUENCE",
      digitalEyebrow: "نظام المتابعة الرقمي",
      digitalTitle: "منظومة رقمية تضع مشروعك بين يديك",
      digitalLead:
        "انفراد مهني يتيح لكل عميل متابعة يومية حية لموقع البناء، المستندات، والاعتمادات بكل شفافية ومن أي مكان.",
      digitalNote: "الوصول متاح للعملاء وأطراف المشروع المعتمدة عبر حساب مؤمن.",
      digitalCta: "دخول منصة المشاريع",
      digitalFeatures: [
        {
          title: "متابعة حية للموقع",
          desc: "صور وفيديوهات وتقارير يومية موثقة من المهندس المشرف في الموقع."
        },
        {
          title: "مخططات واعتمادات معمارية",
          desc: "استعراض كافة اللوحات الهندسية واعتماد التعديلات بلمسة واحدة."
        },
        {
          title: "مستندات وتقارير دورية",
          desc: "تقارير إنجاز أسبوعية، جداول كميات، وتوثيق فني منظم للمشروع."
        },
        {
          title: "قنوات تواصل مباشرة",
          desc: "قناة محادثة فورية وملاحظات صوتية مع إدارة المشروع والمهندس المسؤول."
        }
      ],
      faqEyebrow: "الأسئلة الشائعة",
      faqTitle: "إجابات سريعة لأهم استفساراتك",
      faqLead: "كل ما تحتاج معرفته عن بدء مشروعك وآلية العمل والمتابعة.",
      ctaTitle: "لنبدأ مشروعك القادم",
      ctaSubtitle: "تواصل معنا الآن لمناقشة تفاصيل مشروعك والحصول على استشارة هندسية متخصصة من أول معاينة حتى التسليم.",
      ctaButton: "تواصل معنا عبر واتساب",
      ctaCallButton: "اتصل بنا مباشرة",
      contactTitle: "بيانات التواصل",
      contactLead: "فريقنا الهندسي جاهز لاستقبال استفساراتك وزيارة موقعك.",
      contactPhoneLabel: "الهاتف المباشر",
      contactEmailLabel: "البريد الإلكتروني",
      contactAddressLabel: "المقر الرئيسي",
      footerText: "الحباك للمقاولات والاستشارات الهندسية",
      footerTagline: "نبني اليوم ... لمستقبل أفضل",
      footerNav: "أقسام الموقع",
      footerRights: "جميع الحقوق محفوظة © 2026 الحباك للمقاولات والاستشارات الهندسية"
    },
    faq: [
      [
        "هل يمكن طلب معاينة قبل التعاقد؟",
        "نعم، نوفر جلسة معاينة أولية للموقع لفحص طبيعة المكان ومطابقة الأبعاد وتحديد الاحتياجات الفنية بدقة قبل اعتماد نطاق العمل."
      ],
      [
        "هل تقدمون التصميم والتنفيذ معاً؟",
        "نعم، نتميز بإدارة هندسية متكاملة تربط التصميم المعماري بالتنفيذ الإنشائي والتشطيبات لضمان أعلى مستويات الدقة والمطابقة."
      ],
      [
        "كيف يمكنني متابعة مشروعي عبر المنصة الرقمية؟",
        "يحصل كل عميل على حساب مخصص للوصول إلى لوحة تحكم مشروعه لمتابعة التقارير اليومية، الصور الميدانية الموثقة، المخططات، والجدول الزمني بشفافية تامة."
      ]
    ],
    services: [
      [
        "التصميم",
        "تصميم معماري وإنشائي تفصيلي يحول الرؤية إلى مخططات تنفيذية معتمدة ومطابقة للكود."
      ],
      [
        "التنفيذ الإنشائي",
        "تنفيذ الأعمال الإنشائية والخرسانية بإشراف هندسي صارم ومطابقة دقيقة للمواصفات الفنية."
      ],
      [
        "التشطيبات المعمارية",
        "تشطيبات داخلية وخارجية راقية بأعلى معايير الجودة واعتماد دقيق للعينات والمواد."
      ],
      [
        "المقاولات العامة",
        "إدارة وتنفيذ شامل لكافة بنود المقاولات والتنسيق الميداني المتكامل حتى التسليم."
      ],
      [
        "التأثيث والفرش",
        "حلول تأثيث وتصميم داخلي متكاملة تتناغم مع المساحة والوظيفة والطابع المعماري."
      ]
    ],
    process: [
      ["المعاينة", "زيارة ميدانية لفحص طبيعة الموقع، مطابقة الأبعاد، وتوثيق المتطلبات الفنية."],
      ["التصميم", "إعداد المخططات المعمارية والإنشائية والتنفيذية واعتماد كافة التفاصيل."],
      ["المقايسة التقريبية", "إعداد جداول الكميات (BOQ) ودراسة التكاليف والمواصفات بدقة وشفافية."],
      ["التنفيذ", "بدء الأعمال الميدانية بإشراف هندسي مستمر وتوثيق يومي للمراحل والتقدم."],
      ["التسليم الابتدائي", "فحص ومراجعة كافة الأعمال المنفذة ومعالجة أي ملاحظات وفق أعلى المعايير."],
      ["التسليم النهائي", "اعتماد المشروع نهائياً وتسليم كافة الوثائق والمستندات والضمانات للعميل."]
    ],
    contact: companyContact,
    login: {
      title: "دخول النظام",
      subtitle: "سجل الدخول بحسابك المعتمد للوصول إلى نظام إدارة الحباك.",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      submit: "تسجيل الدخول",
      invalid: "بيانات الدخول غير صحيحة.",
      server: "تعذر الاتصال بالخادم. حاول مرة أخرى.",
      required: "أدخل البريد الإلكتروني وكلمة المرور.",
      showPassword: "إظهار كلمة المرور",
      hidePassword: "إخفاء كلمة المرور",
      back: "العودة للموقع",
      language: "English"
    }
  },
  en: {
    nav: {
      about: "About",
      services: "Services",
      process: "Process",
      platform: "Platform",
      contact: "Contact",
      login: "Login",
      language: "العربية"
    },
    home: {
      heroTag: "Engineering That Makes a Difference",
      heroTitle: "ELHABAK Construction",
      heroSubtitle:
        "Design, construction, and finishing for residential and commercial projects with integrated engineering management and precise digital follow-up from inspection to handover.",
      primaryCta: "Start Your Project",
      requestInspection: "Request Inspection",
      secondaryCta: "Explore Our Services",
      explorePlatformCta: "Explore Platform",
      whatsappCta: "Start Your Project",
      whatsappMessage: "Hello, I would like to inquire about ELHABAK engineering services and start a project.",
      heroRailText: "Engineering for a Better Tomorrow",
      capabilities: [
        {
          title: "Integrated Engineering Design",
          desc: "Approved architectural, structural, and MEP working drawings"
        },
        {
          title: "Field Execution Management",
          desc: "Strict site quality control, daily supervision, and code compliance"
        },
        {
          title: "Digital Project Tracking",
          desc: "Transparent client portal from site inspection to final handover"
        }
      ],
      aboutEyebrow: "About ELHABAK",
      aboutTitle: "Your Engineering Partner from Idea to Reality",
      aboutLead:
        "ELHABAK Construction (الحباك للمقاولات والاستشارات الهندسية) delivers design, execution, and finishing with professional management, committing to quality, transparency, and long-term client partnerships.",
      aboutCta: "Explore Our Services",
      aboutBadgeTitle: "Engineering Stronger Communities",
      aboutBadgeSubtitle: "ENGINEERING STRONGER COMMUNITIES",
      aboutPillars: [
        { title: "Planning Precision", desc: "Detailed engineering drawings and transparent bill of quantities before site work begins." },
        { title: "Execution Quality", desc: "Continuous on-site supervision and uncompromising adherence to engineering standards." },
        { title: "Tracking Transparency", desc: "Real-time digital documentation and periodic progress reports at every milestone." }
      ],
      servicesEyebrow: "Scope of Services",
      servicesTitle: "Integrated Engineering Solutions",
      servicesLead: "From initial study to final handover, connected services ensuring discipline, quality, and precision.",
      servicesFeaturedBadge: "Featured Discipline",
      processEyebrow: "Delivery Sequence",
      processTitle: "Engineering Lifecycle: From Inspection to Handover",
      processLead: "Six structured stages maintaining schedule discipline, technical compliance, and build quality.",
      processWatermark: "ENGINEERING DELIVERY SEQUENCE",
      digitalEyebrow: "Digital Management Platform",
      digitalTitle: "A Digital Platform That Puts Your Project in Your Hands",
      digitalLead:
        "A proprietary digital platform enabling real-time site monitoring, drawings, documents, and approvals with complete transparency.",
      digitalNote: "Access is reserved for approved clients and authorized project parties.",
      digitalCta: "Access Project Platform",
      digitalFeatures: [
        {
          title: "Live Site Monitoring",
          desc: "Verified daily photos, videos, and field progress logs direct from the site engineer."
        },
        {
          title: "Drawings & Approvals",
          desc: "Review engineering blueprints, submit feedback, and sign off revisions with one click."
        },
        {
          title: "Documents & Reports",
          desc: "Weekly milestones, bill of quantities, contracts, and structured project archives."
        },
        {
          title: "Direct Communication",
          desc: "Real-time chat and voice notes directly with the project manager and lead engineer."
        }
      ],
      faqEyebrow: "FAQ",
      faqTitle: "Quick Answers to Your Inquiries",
      faqLead: "Everything you need to know about starting your project, workflow, and tracking.",
      ctaTitle: "Let's Start Your Next Project",
      ctaSubtitle: "Contact us today to discuss your project requirements and receive specialized engineering consultation from inspection to handover.",
      ctaButton: "Contact via WhatsApp",
      ctaCallButton: "Call Us Directly",
      contactTitle: "Contact Information",
      contactLead: "Our engineering team is ready to evaluate your requirements and schedule a site visit.",
      contactPhoneLabel: "Direct Phone",
      contactEmailLabel: "Email Address",
      contactAddressLabel: "Main Office",
      footerText: "ELHABAK Construction",
      footerTagline: "Building Today ... For a Better Tomorrow",
      footerNav: "Site Navigation",
      footerRights: "All rights reserved © 2026 ELHABAK Construction"
    },
    faq: [
      [
        "Can we request a site inspection before contracting?",
        "Yes, we provide an initial site visit to assess location conditions, verify dimensions, and identify technical requirements before finalizing scope."
      ],
      [
        "Do you provide both design and execution together?",
        "Yes, our integrated engineering delivery ensures designs and architectural plans are flawlessly executed on site under unified supervision."
      ],
      [
        "How can I follow my project through the digital platform?",
        "Clients receive dedicated portal access to view daily site logs, verified field photos, blueprints, milestone reports, and timelines with total transparency."
      ]
    ],
    services: [
      [
        "Design",
        "Detailed architectural and engineering drawings that turn vision into buildable, approved specifications."
      ],
      [
        "Construction",
        "Structural and reinforced concrete execution under rigorous engineering supervision and code compliance."
      ],
      [
        "Finishing",
        "Premium interior and exterior architectural finishing with sample approvals and exacting quality control."
      ],
      [
        "General Contracting",
        "Coordinated contracting execution across all civil, MEP, and site trades until final closeout."
      ],
      [
        "Furniture & Fit-Out",
        "Tailored furnishing and interior fit-out harmonized with spatial flow, function, and aesthetics."
      ]
    ],
    process: [
      ["Site Inspection", "Field assessment to evaluate site conditions, verify dimensions, and establish technical baselines."],
      ["Design", "Comprehensive architectural, structural, and working drawings with full detail approvals."],
      ["Preliminary Estimation", "Precise Bill of Quantities (BOQ), specification reviews, and transparent cost baseline."],
      ["Execution", "On-site construction with continuous engineering supervision and daily milestone tracking."],
      ["Initial Handover", "Rigorous walkthrough, snagging list resolution, and initial milestone inspection."],
      ["Final Handover", "Final sign-off, closeout documentation, warranties, and complete handover to the client."]
    ],
    contact: companyContact,
    login: {
      title: "System login",
      subtitle: "Sign in with an approved account to access the ELHABAK management system.",
      email: "Email address",
      password: "Password",
      submit: "Login",
      invalid: "Invalid login details.",
      server: "Server connection failed. Try again.",
      required: "Enter email and password.",
      showPassword: "Show password",
      hidePassword: "Hide password",
      back: "Back to website",
      language: "العربية"
    }
  }
} as const;
