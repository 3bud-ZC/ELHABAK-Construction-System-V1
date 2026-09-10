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
      aboutTitle: "عن الحباك",
      aboutLead:
        "ELHABAK CONSTRUCTION شركة هندسية في سوهاج تقدم خدمات التصميم والتنفيذ والتشطيبات والمقاولات العامة والتأثيث للعملاء الذين يحتاجون إلى متابعة منظمة وقرارات واضحة.",
      servicesTitle: "الخدمات",
      servicesLead: "الأنشطة المعتمدة للشركة كما وردت في نطاق المشروع.",
      processTitle: "آلية العمل",
      processLead: "مسار مختصر يساعد العميل والفريق على فهم مراحل المشروع بدون تضخيم أو وعود غير موثقة.",
      whyTitle: "لماذا الحباك",
      whyLead: "قيمة العمل مبنية على وضوح النطاق والمتابعة المهنية وحفظ القرارات والملفات.",
      contactTitle: "تواصل مع الحباك",
      contactLead: "للاستفسار عن خدمات التصميم أو التنفيذ أو التشطيب، استخدم بيانات التواصل الرسمية.",
      footerText: "ELHABAK CONSTRUCTION — الحباك للاستشارات الهندسية"
    },
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
      "نطاق خدمات واضح من التصميم حتى التأثيث.",
      "لغة عمل مناسبة للعميل والفريق بالعربية والإنجليزية.",
      "أساس تقني جاهز لاحقا لإدارة المشاريع والملفات والتقارير.",
      "هوية بصرية مهنية مرتبطة بأصول الشركة الأصلية."
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
      aboutTitle: "About ELHABAK",
      aboutLead:
        "ELHABAK CONSTRUCTION is an engineering company in Sohag providing design, construction, finishing, general contracting, and furnishing services for clients who need organized follow-up and clear decisions.",
      servicesTitle: "Services",
      servicesLead: "Approved company activities from the project context.",
      processTitle: "Work process",
      processLead: "A simplified workflow that keeps the client and team aligned without unsupported claims.",
      whyTitle: "Why ELHABAK",
      whyLead: "The company value is grounded in clear scope, professional follow-up, and organized files and decisions.",
      contactTitle: "Contact ELHABAK",
      contactLead: "For design, construction, or finishing inquiries, use the official contact details.",
      footerText: "ELHABAK CONSTRUCTION — الحباك للاستشارات الهندسية"
    },
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
      "Clear service scope from design through furnishing.",
      "Arabic and English working language for clients and internal teams.",
      "Technical foundation ready for project, file, and report management later.",
      "Professional visual identity based on the company's supplied assets."
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
