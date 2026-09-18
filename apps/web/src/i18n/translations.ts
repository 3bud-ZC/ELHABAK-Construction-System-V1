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
      why: "لماذا الحباك",
      platform: "المنصة",
      faq: "الأسئلة الشائعة",
      contact: "تواصل معنا",
      login: "دخول النظام",
      language: "English"
    },
    home: {
      heroTag: "هندسة تصنع فرقاً",
      heroTitle: "الحباك للاستشارات الهندسية",
      heroSubtitle:
        "تصميم وتنفيذ وتشطيب للمشروعات السكنية والتجارية بإدارة هندسية واضحة ومتابعة دقيقة حتى التسليم.",
      primaryCta: "ابدأ مشروعك معنا",
      requestInspection: "طلب معاينة",
      secondaryCta: "استعرض خدماتنا",
      whatsappCta: "ابدأ مشروعك معنا",
      whatsappMessage: "مرحبًا، أرغب في الاستفسار عن خدمات الحباك والبدء في مشروع.",
      heroStats: [
        { value: "+100", label: "مشروع منجز" },
        { value: "+15", label: "سنة خبرة" },
        { value: "98%", label: "رضا العملاء" }
      ],
      heroRailText: "هندسة لمستقبل أفضل",
      mobilePlatform: "المنصة",
      mobileFaq: "الأسئلة الشائعة",
      heroPanelTitle: "نطاق واحد للمشروع",
      heroPanelText:
        "تصميم، إنشاء، تشطيب، مقاولات عامة، وتأثيث ضمن مسار عمل منظم.",
      aboutEyebrow: "عن الحباك",
      aboutTitle: "شريكك الهندسي من الفكرة إلى الواقع",
      aboutLead:
        "الحباك للاستشارات الهندسية تقدم خدمات التصميم والتنفيذ والتشطيب بإدارة احترافية، نلتزم بالجودة والشفافية، ونبني شراكات طويلة الأمد مع عملائنا.",
      aboutCta: "مزيد عن الشركة",
      aboutBadgeTitle: "هندسة تبني مجتمعات أفضل",
      aboutBadgeSubtitle: "ENGINEERING STRONGER COMMUNITIES",
      aboutMobileTitle: "شركة هندسية تقود المشروع من الفكرة إلى التسليم",
      aboutMobilePoints: ["نتائج ملموسة", "خبرة عملية", "رؤية واضحة"],
      servicesEyebrow: "خدماتنا",
      servicesTitle: "حلول هندسية متكاملة",
      servicesLead: "من التخطيط إلى التسليم، نوفر كل ما يحتاجه مشروعك.",
      processEyebrow: "آلية العمل",
      processTitle: "من خطة واضحة إلى تسليم ناجح",
      processLead: "تخاطب كل مرحلة بإدارة دقيقة وتواصل مستمر مع العميل.",
      processWatermark: "FROM VISION TO REALITY",
      whyTitle: "لماذا الحباك",
      whyLead: "قيمة المشروع تبدأ من نطاق واضح، متابعة منظمة، وقرارات محفوظة في وقتها.",
      digitalEyebrow: "منصتنا الرقمية",
      digitalTitle: "تابع مشروعك في كل خطوة",
      digitalLead:
        "منصة مخصصة تتيح لك متابعة الموقع، المستندات، التصاميم، والاعتمادات في مكان واحد وبشفافية تامة.",
      digitalNote: "الوصول للمنصة بحساب معتمد من الشركة.",
      digitalCta: "اكتشف المنصة",
      digitalFeatures: [
        "متابعة مباشرة",
        "مستندات ومرفقات",
        "تقارير دورية",
        "تواصل مع فريق العمل"
      ],
      principlesTitle: "قواعد العمل",
      faqEyebrow: "الأسئلة الشائعة",
      faqTitle: "إجابات سريعة لأهم استفساراتك",
      faqLead: "كل ما تحتاج معرفته قبل البدء في مشروعك.",
      faqCta: "عرض جميع الأسئلة",
      ctaTitle: "لنبدأ مشروعك القادم",
      ctaSubtitle: "تواصل معنا الآن وكن خطوة أقرب إلى تحويل رؤيتك إلى واقع.",
      ctaButton: "تواصل معنا",
      contactTitle: "تواصل معنا",
      contactLead: "تواصل معنا الآن لمناقشة مشروعك والحصول على استشارة هندسية متخصصة من أول معاينة حتى التسليم.",
      footerText: "الحباك للاستشارات الهندسية",
      footerTagline: "نبني اليوم ... لمستقبل أفضل",
      footerNav: "أقسام الموقع",
      footerServices: "نطاق الخدمات",
      footerContact: "بيانات التواصل",
      footerPlatform: "المنصة",
      footerRights: "جميع الحقوق محفوظة © 2026 الحباك للاستشارات الهندسية",
      footerPrivacy: "سياسة الخصوصية"
    },
    aboutPrinciples: [
      ["تصميم", "DESIGN"],
      ["تخطيط", "PLANNING"],
      ["تنفيذ", "EXECUTION"],
      ["إشراف", "SUPERVISION"]
    ],
    digitalPoints: [
      "متابعة تقدم المشروع ومراحله المعتمدة",
      "مراجعة التصاميم والاعتمادات",
      "الوصول إلى مستندات وملفات المشروع",
      "تحديثات الموقع والتواصل مع فريق العمل"
    ],
    faq: [
      ["هل يمكن طلب معاينة قبل التعاقد؟", "نعم، نوفر جلسة معاينة أولية للموقع لفحص طبيعة المكان ومطابقة الأبعاد وتحديد الاحتياجات قبل اعتماد نطاق العمل."],
      ["هل تقدمون التصميم والتنفيذ معاً؟", "نعم، نقدم إدارة هندسية متكاملة تضمن تطبيق المخططات المعمارية والتنفيذية بدقة متناهية على أرض الواقع."],
      ["ما هي المتابعة الرقمية المتاحة لكل عميل؟", "يحصل العميل على حساب معتمد في منصتنا الرقمية لمتابعة التقارير اليومية والصور الميدانية والمخططات والدفعات لحظة بلحظة."]
    ],
    principles: [
      ["نطاق موثق قبل التنفيذ", "SCOPE FIRST"],
      ["متابعة منظمة لكل مرحلة", "TRACKED PHASES"],
      ["قرارات وملفات محفوظة", "DOCUMENTED"],
      ["استمرارية من التصميم إلى التسليم", "DESIGN TO DELIVERY"]
    ],
    services: [
      ["التصميم", "تصميم معماري وهندسي يحقق رؤيتك ويعكس احتياجاتك."],
      ["التنفيذ والتشطيب", "تنفيذ دقيق بجودة عالية ومتابعة مستمرة في جميع المراحل."],
      ["المقاولات العامة", "تنسيق وتنفيذ نطاق المقاولات وفق متطلبات المشروع."],
      ["التأثيث والفرش", "فرش وتأثيث متوافق مع المساحة وطريقة الاستخدام."]
    ],
    process: [
      ["دراسة المتطلبات", "دراسة المتطلبات وفهم نطاق العمل بدقة."],
      ["التصميم والتخطيط", "التصميم والتخطيط الهندسي بشكل تفصيلي."],
      ["التنفيذ والمتابعة", "التنفيذ والمتابعة الميدانية وفق الجدول الزمني."],
      ["التسليم ودعم ما بعد التنفيذ", "التسليم النهائي ودعم ما بعد التنفيذ."]
    ],
    why: [
      ["نطاق واحد", "التصميم والتنفيذ والتشطيب تُدار كعمل هندسي مترابط."],
      ["تواصل مهني", "لغة واضحة بالعربية والإنجليزية للعميل وفريق العمل."],
      ["توثيق رقمي", "منصة الشركة تنظم المشروع والملفات والتقارير."],
      ["هوية موثقة", "حضور مهني مبني على أصول الشركة لا على قوالب عامة."]
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
      why: "Why ELHABAK",
      platform: "Platform",
      faq: "FAQ",
      contact: "Contact",
      login: "Login",
      language: "العربية"
    },
    home: {
      heroTag: "Engineering That Makes a Difference",
      heroTitle: "ELHABAK Construction",
      heroSubtitle:
        "Design, construction, and finishing for residential and commercial projects with clear engineering management and precise follow-up until handover.",
      primaryCta: "Start Your Project",
      requestInspection: "Inspection request",
      secondaryCta: "Explore Our Services",
      whatsappCta: "Start Your Project",
      whatsappMessage: "Hello, I would like to inquire about ELHABAK engineering services and start a project.",
      heroStats: [
        { value: "+100", label: "Completed Projects" },
        { value: "+15", label: "Years Experience" },
        { value: "98%", label: "Client Satisfaction" }
      ],
      heroRailText: "Engineering for a Better Tomorrow",
      mobilePlatform: "Platform",
      mobileFaq: "FAQ",
      heroPanelTitle: "One project scope",
      heroPanelText:
        "Design, construction, finishing, general contracting, and furnishing through one organized path.",
      aboutEyebrow: "About ELHABAK",
      aboutTitle: "Your Engineering Partner from Idea to Reality",
      aboutLead:
        "ELHABAK Engineering Consulting delivers design, execution, and finishing with professional management, committing to quality, transparency, and long-term client partnerships.",
      aboutCta: "More About Company",
      aboutBadgeTitle: "Engineering Stronger Communities",
      aboutBadgeSubtitle: "ENGINEERING STRONGER COMMUNITIES",
      aboutMobileTitle: "An engineering firm leading your project from concept to delivery",
      aboutMobilePoints: ["Tangible Results", "Hands-on Experience", "Clear Vision"],
      servicesEyebrow: "Our Services",
      servicesTitle: "Integrated Engineering Solutions",
      servicesLead: "From planning to handover, we provide everything your project requires.",
      processEyebrow: "Our Process",
      processTitle: "From Clear Plan to Successful Handover",
      processLead: "Every stage is managed with precise engineering control and ongoing client communication.",
      processWatermark: "FROM VISION TO REALITY",
      whyTitle: "Why ELHABAK",
      whyLead: "A good project starts with clear scope, organized follow-up, and decisions captured at the right time.",
      digitalEyebrow: "Digital Platform",
      digitalTitle: "Track Your Project at Every Step",
      digitalLead:
        "A dedicated platform enabling site monitoring, documents, designs, and approvals in one place with complete transparency.",
      digitalNote: "Platform access requires a company-approved account.",
      digitalCta: "Explore Platform",
      digitalFeatures: [
        "Live Updates",
        "Documents & Files",
        "Periodic Reports",
        "Team Communication"
      ],
      principlesTitle: "Working principles",
      faqEyebrow: "FAQ",
      faqTitle: "Quick Answers to Your Inquiries",
      faqLead: "Everything you need to know before starting your project.",
      faqCta: "View All Questions",
      ctaTitle: "Let's Start Your Next Project",
      ctaSubtitle: "Contact us now and take the next step toward turning your vision into reality.",
      ctaButton: "Contact Us",
      contactTitle: "Contact Us",
      contactLead: "Reach out to discuss your project and receive dedicated engineering consultation from initial inspection to delivery.",
      footerText: "ELHABAK Engineering Consultancy",
      footerTagline: "Building Today ... For a Better Tomorrow",
      footerNav: "Site sections",
      footerServices: "Services",
      footerContact: "Contact",
      footerPlatform: "Platform",
      footerRights: "All rights reserved © 2026 ELHABAK Construction",
      footerPrivacy: "Privacy Policy"
    },
    aboutPrinciples: [
      ["Design", "تصميم"],
      ["Planning", "تخطيط"],
      ["Execution", "تنفيذ"],
      ["Supervision", "إشراف"]
    ],
    digitalPoints: [
      "Project progress and approved phase tracking",
      "Design review and approvals",
      "Access to project documents and files",
      "Site updates and direct team communication"
    ],
    faq: [
      ["Can we request a site inspection before contracting?", "Yes, we provide an initial site visit to assess location conditions, verify dimensions, and identify requirements before finalizing scope."],
      ["Do you provide both design and execution together?", "Yes, our integrated engineering delivery ensures designs and architectural plans are flawlessly executed on site."],
      ["What digital tracking is available for each client?", "Clients receive dedicated access to our digital platform to view daily site logs, verified photos, blueprints, and milestone payments in real time."]
    ],
    principles: [
      ["Scope documented before execution", "SCOPE FIRST"],
      ["Every phase followed in order", "TRACKED PHASES"],
      ["Decisions and files preserved", "DOCUMENTED"],
      ["Continuity from design to delivery", "DESIGN TO DELIVERY"]
    ],
    services: [
      ["Design", "Architectural and engineering drawings that turn requirements into buildable decisions."],
      ["Execution & Finishing", "Structural execution and interior finishing with approved details and regular review."],
      ["General Contracting", "Coordinated contracting work delivered according to the agreed scope."],
      ["Furnishing & Fit-Out", "Furniture and interior fit-out tailored to spatial harmony and usage."]
    ],
    process: [
      ["Requirements Study", "Requirements study and detailed scope understanding."],
      ["Design & Planning", "Comprehensive architectural and engineering design."],
      ["Execution & Follow-up", "On-site execution and schedule-based follow-up."],
      ["Handover & Support", "Final project handover and post-execution support."]
    ],
    why: [
      ["One scope", "Design, execution, and finishing managed as connected engineering work."],
      ["Professional communication", "Clear Arabic and English working language for client and team."],
      ["Digital documentation", "The company platform organizes projects, files, and reports."],
      ["Documented identity", "A professional presence built on company assets, not generic templates."]
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
