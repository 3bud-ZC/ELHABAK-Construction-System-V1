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
        "استشارات هندسية وتنفيذ منظم للمشروعات السكنية والتجارية — من دراسة الموقع والمخططات إلى التشطيب والتسليم.",
      primaryCta: "ابدأ التواصل",
      secondaryCta: "استعرض الخدمات",
      heroPanelTitle: "نطاق أعمال واضح",
      heroPanelText:
        "تصميم، إنشاء، تشطيب، مقاولات عامة، وتأثيث بمسار هندسي واحد من المعاينة إلى التسليم.",
      aboutTitle: "شركة هندسية تجمع التصميم والتنفيذ تحت سقف واحد",
      aboutLead:
        "الحباك للاستشارات الهندسية شركة مقرها سوهاج، تقدم التصميم والتنفيذ والتشطيبات والمقاولات العامة والتأثيث لعملاء يحتاجون قرارات واضحة، متابعة منظمة، وتسليم موثق.",
      servicesTitle: "نطاق الخدمات",
      servicesLead: "خدمات مترابطة تغطي القرار الهندسي، التنفيذ، التشطيب، وإغلاق المشروع بدون تضخيم أو وعود غير موثقة.",
      processTitle: "مسار التسليم الهندسي",
      processLead: "ست مراحل واضحة تضبط نطاق العمل وتربط العميل والفريق من المعاينة حتى التسليم النهائي.",
      whyTitle: "منهجية قبل الوعود",
      whyLead: "نعمل بنطاق واضح، متابعة موثقة، وقرارات محفوظة. هذا هو أساس المشروع الجيد.",
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
      ["التصميم", "مخططات معمارية وهندسية تضبط الفكرة قبل التنفيذ."],
      ["الإنشاء", "تنفيذ إنشائي بمتابعة مراحل الموقع واعتمادات العمل."],
      ["التشطيبات", "تشطيب داخلي وخارجي بتفاصيل واضحة ومراجعات منتظمة."],
      ["المقاولات العامة", "تنسيق وتنفيذ نطاق المقاولات حسب متطلبات المشروع."],
      ["التأثيث والفرش", "اختيارات فرش مرتبطة بالمساحة والتصميم والاستخدام."]
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
      ["نطاق واحد", "التصميم والتنفيذ والتشطيب ضمن إدارة هندسية مترابطة."],
      ["تواصل مهني", "لغة واضحة بالعربية والإنجليزية للعميل وفريق العمل."],
      ["توثيق رقمي", "منصة الشركة تنظم المشاريع والملفات والتقارير."],
      ["هوية موثقة", "عرض مهني مبني على أصول الشركة لا على قوالب جاهزة."]
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
        "Engineering consultancy and organized project delivery for residential and commercial work — from site study and drawings to finishing and handover.",
      primaryCta: "Contact ELHABAK",
      secondaryCta: "View services",
      heroPanelTitle: "Clear work scope",
      heroPanelText:
        "Design, construction, finishing, general contracting, and furnishing through one engineered path from inspection to handover.",
      aboutTitle: "One engineering house for design and delivery",
      aboutLead:
        "ELHABAK CONSTRUCTION is an engineering company based in Sohag delivering design, construction, finishing, general contracting, and furnishing for clients who need clear decisions, organized follow-up, and documented handover.",
      servicesTitle: "Scope of services",
      servicesLead: "Connected services covering engineering decisions, execution, finishing, and project closeout without inflated claims.",
      processTitle: "Engineering delivery sequence",
      processLead: "Six clear stages align scope, client decisions, and site execution from inspection to final handover.",
      whyTitle: "Method before promises",
      whyLead: "Clear scope, documented follow-up, and preserved decisions. That is the operating base for good delivery.",
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
      ["Design", "Architectural and engineering drawings that settle the idea before work starts."],
      ["Construction", "Structural execution with site-stage follow-up and work approvals."],
      ["Finishing", "Interior and exterior finishing with clear details and regular review."],
      ["General Contracting", "Coordinated contracting work delivered according to the agreed scope."],
      ["Furniture / Furnishing", "Furniture and furnishing choices aligned with space, design, and use."]
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
      ["One scope", "Design, execution, and finishing managed as connected engineering work."],
      ["Professional communication", "Clear Arabic and English working language for client and team."],
      ["Digital documentation", "The company platform organizes projects, files, and reports."],
      ["Documented identity", "A professional presence built on company assets, not templates."]
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
