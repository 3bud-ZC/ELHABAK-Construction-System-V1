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
        "تصميم وتنفيذ وتشطيب للمشروعات السكنية والتجارية بإدارة هندسية واضحة، من أول معاينة حتى التسليم.",
      primaryCta: "ابدأ التواصل",
      secondaryCta: "استعرض الخدمات",
      heroPanelTitle: "نطاق واحد للمشروع",
      heroPanelText:
        "تصميم، إنشاء، تشطيب، مقاولات عامة، وتأثيث ضمن مسار عمل منظم.",
      aboutTitle: "شركة هندسية تقود المشروع من القرار إلى التسليم",
      aboutLead:
        "الحباك للاستشارات الهندسية شركة مقرها سوهاج، تقدم خدمات التصميم والتنفيذ والتشطيبات والمقاولات العامة والتأثيث لعملاء يحتاجون وضوحًا في النطاق ومتابعة جادة في الموقع.",
      servicesTitle: "نطاق الخدمات",
      servicesLead: "خدمات مترابطة تغطي القرار الهندسي، تنفيذ الموقع، التشطيب، وتجهيز المساحة للاستخدام.",
      processTitle: "مسار التسليم الهندسي",
      processLead: "ست مراحل عملية تضبط نطاق المشروع وتُبقي العميل والفريق على مسار واحد حتى التسليم.",
      whyTitle: "وضوح قبل التنفيذ",
      whyLead: "قيمة المشروع تبدأ من نطاق واضح، متابعة منظمة، وقرارات محفوظة في وقتها.",
      digitalTitle: "مشروعك متابَع رقمياً",
      digitalLead:
        "تدير الحباك مشاريعها عبر نظام إدارة خاص يتيح للعملاء المصرح لهم الاطلاع على ما يخص مشروعهم بشكل منظم.",
      digitalNote: "الوصول للمنصة بحساب معتمد من الشركة.",
      digitalCta: "دخول النظام",
      principlesTitle: "قواعد العمل",
      contactTitle: "ابدأ مشروعك بخطوة هندسية واضحة",
      contactLead: "للاستفسار عن التصميم أو التنفيذ أو التشطيب، تواصل معنا عبر القنوات الرسمية.",
      footerText: "الحباك للاستشارات الهندسية",
      footerTagline: "شركة هندسية في سوهاج للتصميم والتنفيذ والتشطيب والمقاولات العامة والتأثيث.",
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
      ["التصميم", "مخططات معمارية وهندسية تحوّل الاحتياج إلى قرار قابل للتنفيذ."],
      ["الإنشاء", "تنفيذ إنشائي ومتابعة موقع ضمن مراحل واضحة واعتمادات عمل."],
      ["التشطيبات", "تشطيب داخلي وخارجي بتفاصيل معتمدة ومراجعات منتظمة."],
      ["المقاولات العامة", "تنسيق وتنفيذ نطاق المقاولات وفق متطلبات المشروع."],
      ["التأثيث والفرش", "فرش وتأثيث متوافق مع المساحة والتصميم وطريقة الاستخدام."]
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
      contact: "Contact",
      login: "Login",
      language: "العربية"
    },
    home: {
      heroTitle: "ELHABAK Construction",
      heroSubtitle:
        "Design, construction, and finishing for residential and commercial projects with clear engineering management from first inspection to handover.",
      primaryCta: "Contact ELHABAK",
      secondaryCta: "View services",
      heroPanelTitle: "One project scope",
      heroPanelText:
        "Design, construction, finishing, general contracting, and furnishing through one organized path.",
      aboutTitle: "Engineering leadership from decision to handover",
      aboutLead:
        "ELHABAK CONSTRUCTION is an engineering company based in Sohag, delivering design, construction, finishing, general contracting, and furnishing for clients who need clear scope and serious site follow-up.",
      servicesTitle: "Scope of services",
      servicesLead: "Connected services covering engineering decisions, site execution, finishing, and preparing the space for use.",
      processTitle: "Engineering delivery sequence",
      processLead: "Six practical stages keep the project scope, client decisions, and delivery team moving in one direction.",
      whyTitle: "Clarity before execution",
      whyLead: "A good project starts with clear scope, organized follow-up, and decisions captured at the right time.",
      digitalTitle: "Your project, tracked digitally",
      digitalLead:
        "ELHABAK manages its projects through a dedicated platform that lets authorized clients follow what concerns their project in an organized way.",
      digitalNote: "Platform access requires a company-approved account.",
      digitalCta: "System login",
      principlesTitle: "Working principles",
      contactTitle: "Start with a clear engineering step",
      contactLead: "For design, construction, or finishing inquiries, contact us through the official channels.",
      footerText: "ELHABAK Engineering Consultancy",
      footerTagline: "An engineering company in Sohag for design, construction, finishing, general contracting, and furnishing.",
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
      ["Design", "Architectural and engineering drawings that turn requirements into buildable decisions."],
      ["Construction", "Structural execution with clear site stages and work approvals."],
      ["Finishing", "Interior and exterior finishing with approved details and regular review."],
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
