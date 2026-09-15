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
      contact: "تواصل معنا",
      login: "دخول النظام",
      language: "English"
    },
    home: {
      heroTitle: "الحباك للاستشارات الهندسية",
      heroSubtitle:
        "منصة وهوية رقمية لشركة إنشاءات تجمع التصميم والتنفيذ والتشطيبات والمقاولات العامة والتأثيث ضمن تجربة مهنية واضحة.",
      primaryCta: "ابدأ التواصل",
      secondaryCta: "استعرض الخدمات",
      heroPanelTitle: "نطاق أعمال واضح",
      heroPanelText:
        "تصميم، إنشاء، تشطيب، مقاولات عامة، وتأثيث بمسار عمل منظم من المعاينة حتى التسليم.",
      aboutTitle: "شركة هندسية تجمع التصميم والتنفيذ تحت سقف واحد",
      aboutLead:
        "الحباك للاستشارات الهندسية شركة مقرها سوهاج، تقدم التصميم والتنفيذ والتشطيبات والمقاولات العامة والتأثيث لعملاء يحتاجون متابعة منظمة وقرارات واضحة — من المعاينة الأولى حتى التسليم النهائي.",
      servicesTitle: "نطاق الخدمات",
      servicesLead: "الأنشطة المعتمدة للشركة كما وردت في نطاق المشروع — من الفكرة المعمارية إلى الفرش النهائي.",
      visionTitle: "من الرؤية إلى الواقع",
      visionLead: "كل مشروع يبدأ فكرة على الورق، يمر بالتصميم والهندسة، ويُبنى تحت إشراف منظم.",
      processTitle: "مسار التسليم الهندسي",
      processLead: "ست مراحل مرتبة تساعد العميل والفريق على فهم المشروع بدون تضخيم أو وعود غير موثقة.",
      whyTitle: "منهجية قبل الوعود",
      whyLead: "قيمة العمل عندنا مبنية على وضوح النطاق والمتابعة المهنية وحفظ القرارات والملفات — لا على شعارات.",
      digitalTitle: "مشروعك متابَع رقمياً",
      digitalLead:
        "تدير الحباك مشاريعها عبر نظام إدارة خاص يتيح للعملاء المصرح لهم الاطلاع على ما يخص مشروعهم بشكل منظم.",
      digitalNote: "الوصول للمنصة بحساب معتمد من الشركة.",
      digitalCta: "دخول النظام",
      principlesTitle: "قواعد نعمل بها",
      contactTitle: "ابدأ مشروعك برؤية هندسية واضحة",
      contactLead: "للاستفسار عن خدمات التصميم أو التنفيذ أو التشطيب، استخدم بيانات التواصل الرسمية.",
      footerText: "الحباك للاستشارات الهندسية",
      footerTagline: "شركة هندسية في سوهاج — تصميم، تنفيذ، تشطيب، مقاولات عامة، وتأثيث.",
      footerNav: "أقسام الموقع",
      footerServices: "نطاق الخدمات",
      footerContact: "بيانات التواصل",
      footerPlatform: "المنصة",
      footerRights: "جميع الحقوق محفوظة"
    },
    aboutPrinciples: [
      ["تصميم", "DESIGN"],
      ["تخطيط", "PLANNING"],
      ["تنفيذ", "EXECUTION"],
      ["إشراف", "SUPERVISION"]
    ],
    visionStages: ["الفكرة", "التصميم", "الهندسة", "البناء"],
    digitalPoints: [
      "متابعة تقدم المشروع ومراحله المعتمدة",
      "مراجعة التصاميم والاعتمادات",
      "الوصول إلى مستندات وملفات المشروع",
      "تحديثات الموقع والتواصل مع فريق العمل"
    ],
    principles: [
      ["نطاق موثق قبل التنفيذ", "SCOPE FIRST"],
      ["متابعة منظمة لكل مرحلة", "TRACKED PHASES"],
      ["قرارات وملفات محفوظة", "DOCUMENTED"],
      ["استمرارية من التصميم إلى التسليم", "DESIGN TO DELIVERY"]
    ],
    services: [
      ["Design", "تصميم معماري وهندسي مناسب لطبيعة المشروع واحتياجات العميل."],
      ["Construction", "تنفيذ أعمال الإنشاء ضمن متابعة منظمة ومراحل واضحة."],
      ["Finishing", "تشطيبات داخلية وخارجية مع ضبط التفاصيل والاعتمادات."],
      ["General Contracting", "إدارة وتنفيذ أعمال المقاولات العامة حسب نطاق المشروع."],
      ["Furniture / Furnishing", "تأثيث وفرش مرتبط باحتياجات المساحة والتصميم."]
    ],
    process: [
      ["المعاينة", "فهم الموقع واحتياجات العميل ومطابقة الأبعاد قبل تثبيت نطاق العمل."],
      ["التصميم", "إعداد ومراجعة المخططات الهندسية والمعمارية ونماذج التشطيب."],
      ["المقايسة التقريبية", "حصر البنود والمواصفات وحساب التكلفة التقديرية وجداول الكميات."],
      ["التنفيذ", "الإشراف الميداني وضبط الجودة وتوثيق تقدم الأعمال وتحديثات الموقع."],
      ["التسليم الابتدائي", "فحص ومطابقة الأعمال المنجزة وإعداد قوائم الملاحظات والمعالجة."],
      ["التسليم النهائي", "الاعتماد النهائي للأعمال وإغلاق المشروع وتسليم المخرجات للعميل."]
    ],
    why: [
      ["نطاق متكامل", "من التصميم حتى التأثيث — جميع مراحل المشروع تحت إدارة هندسية واحدة."],
      ["تواصل مزدوج اللغة", "لغة عمل مهنية بالعربية والإنجليزية للعميل والفريق."],
      ["نظام إدارة حقيقي", "منصة رقمية خاصة بالشركة لتنظيم المشاريع والملفات والتقارير."],
      ["هوية مهنية موثقة", "هوية بصرية مبنية على أصول الشركة الأصلية، لا قوالب جاهزة."]
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
      contact: "Contact",
      login: "Login",
      language: "العربية"
    },
    home: {
      heroTitle: "ELHABAK Construction",
      heroSubtitle:
        "A professional construction and engineering presence for design, construction, finishing, general contracting, and furnishing work.",
      primaryCta: "Contact ELHABAK",
      secondaryCta: "View services",
      heroPanelTitle: "Clear work scope",
      heroPanelText:
        "Design, construction, finishing, general contracting, and furnishing through an organized path from site inspection to handover.",
      aboutTitle: "One engineering house for design and delivery",
      aboutLead:
        "ELHABAK CONSTRUCTION is an engineering company based in Sohag delivering design, construction, finishing, general contracting, and furnishing for clients who need organized follow-up and clear decisions — from first site inspection to final handover.",
      servicesTitle: "Scope of services",
      servicesLead: "The company's approved activities — from architectural concept to final furnishing.",
      visionTitle: "From vision to reality",
      visionLead: "Every project begins as an idea on paper, passes through design and engineering, and is built under organized supervision.",
      processTitle: "Engineering delivery sequence",
      processLead: "Six ordered stages that keep the client and the team aligned without inflated claims.",
      whyTitle: "Method before promises",
      whyLead: "Our value is grounded in clear scope, professional follow-up, and documented decisions — not slogans.",
      digitalTitle: "Your project, tracked digitally",
      digitalLead:
        "ELHABAK manages its projects through a dedicated platform that lets authorized clients follow what concerns their project in an organized way.",
      digitalNote: "Platform access requires a company-approved account.",
      digitalCta: "System login",
      principlesTitle: "Principles we work by",
      contactTitle: "Start your project with a clear engineering vision",
      contactLead: "For design, construction, or finishing inquiries, use the official contact details.",
      footerText: "ELHABAK Engineering Consultancy",
      footerTagline: "An engineering company in Sohag — design, construction, finishing, general contracting, and furnishing.",
      footerNav: "Site sections",
      footerServices: "Services",
      footerContact: "Contact",
      footerPlatform: "Platform",
      footerRights: "All rights reserved"
    },
    aboutPrinciples: [
      ["Design", "تصميم"],
      ["Planning", "تخطيط"],
      ["Execution", "تنفيذ"],
      ["Supervision", "إشراف"]
    ],
    visionStages: ["CONCEPT", "DESIGN", "ENGINEERING", "BUILD"],
    digitalPoints: [
      "Project progress and approved phase tracking",
      "Design review and approvals",
      "Access to project documents and files",
      "Site updates and direct team communication"
    ],
    principles: [
      ["Scope documented before execution", "SCOPE FIRST"],
      ["Every phase followed in order", "TRACKED PHASES"],
      ["Decisions and files preserved", "DOCUMENTED"],
      ["Continuity from design to delivery", "DESIGN TO DELIVERY"]
    ],
    services: [
      ["Design", "Architectural and engineering design shaped around project needs."],
      ["Construction", "Construction execution with organized follow-up and clear phases."],
      ["Finishing", "Interior and exterior finishing with attention to approvals and detail."],
      ["General Contracting", "General contracting work managed according to the project scope."],
      ["Furniture / Furnishing", "Furniture and furnishing aligned with the space and design direction."]
    ],
    process: [
      ["Site Inspection", "Field assessment and site verification before confirming the project scope."],
      ["Design", "Engineering and architectural drawings, structural plans, and finishing schemes."],
      ["Preliminary Estimation", "Detailed bill of quantities (BOQ), specification checks, and cost baseline."],
      ["Execution", "On-site engineering supervision, quality control, and milestone verification."],
      ["Initial Handover", "Snagging, inspection of executed works, and resolution of punch-list items."],
      ["Final Handover", "Final sign-off, project closeout, and documentation handover to the client."]
    ],
    why: [
      ["Integrated scope", "From design through furnishing — every project phase under one engineering roof."],
      ["Bilingual workflow", "Professional working language in Arabic and English for client and team."],
      ["A real management system", "The company's own digital platform for organizing projects, files, and reports."],
      ["Documented identity", "A professional visual identity built on the company's original assets, not templates."]
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
