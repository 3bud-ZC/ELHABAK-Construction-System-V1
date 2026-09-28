import { companyContact, telHref, whatsappHref } from "@elhabak/contracts";
import { dictionary, type Locale } from "./translations";
import type { SeoContent } from "../app/seo-page";

type SeoPageKey =
  | "services"
  | "engineeringConsultancy"
  | "constructionManagement"
  | "architecturalDesign"
  | "siteSupervision"
  | "projectManagement"
  | "platform"
  | "about"
  | "contact";

export const seoPages: Record<SeoPageKey, Record<Locale, SeoContent>> = {
  services: {
    ar: {
      meta: {
        title: "الخدمات الهندسية والمقاولات | الحباك",
        description:
          "خدمات الحباك الهندسية في سوهاج: استشارات هندسية، تصميم معماري، تنفيذ وتشطيبات، إدارة مشاريع، إشراف ميداني، مقاولات عامة وتأثيث — بمتابعة رقمية موثقة.",
        keywords: ["خدمات هندسية سوهاج", "مقاولات عامة", "تصميم معماري", "إشراف هندسي"]
      },
      eyebrow: "خدماتنا",
      title: "خدمات هندسية متكاملة من الفكرة إلى التسليم",
      lead: "تقدم الحباك منظومة خدمات متصلة تغطي دورة المشروع كاملة: الاستشارة والتصميم، التنفيذ والإشراف، الإدارة والمتابعة — تحت مسؤولية هندسية واحدة.",
      image: { src: "/marketing/services-feature.webp", alt: "أعمال هندسية وتشطيبات في أحد مشاريع الحباك" },
      sections: [
        {
          heading: "نطاق الخدمات",
          lead: "كل خدمة تُدار ضمن دورة مشروع موثقة — لا تعمل أي مرحلة بمعزل عن باقي المشروع.",
          cards: [
            { title: "الاستشارات الهندسية", text: "مراجعة فنية، دراسة جدوى مبدئية، ودعم قرارات التصميم والتنفيذ.", href: "/engineering-consultancy" },
            { title: "التصميم المعماري", text: "مخططات مفاهيمية وتنفيذية مع مراجعات منظمة مع العميل.", href: "/architectural-design" },
            { title: "التنفيذ والإنشاءات", text: "أعمال إنشائية وخرسانية تحت إشراف هندسي مباشر ومواصفات واضحة.", href: "/site-supervision" },
            { title: "إدارة الإنشاءات", text: "ضبط الجدول والتكلفة وتنسيق المقاولين والتوريدات.", href: "/construction-management" },
            { title: "إدارة المشاريع الهندسية", text: "إدارة دورة المشروع كاملة من المعاينة حتى التسليم النهائي.", href: "/project-management" },
            { title: "التشطيبات المعمارية", text: "تشطيبات داخلية وخارجية باعتماد عينات ومواد قبل التنفيذ." },
            { title: "المقاولات العامة", text: "تنفيذ شامل لبنود الأعمال المدنية والكهروميكانيكية والميدانية." },
            { title: "التأثيث والفرش", text: "حلول تأثيث متوافقة مع التصميم المعماري ووظيفة المساحة." },
            { title: "منصة متابعة المشروع", text: "متابعة رقمية للتقدم والمستندات والتصاميم والمحادثات.", href: "/platform" }
          ]
        },
        {
          heading: "لماذا نموذج الخدمة المتصلة؟",
          paragraphs: [
            "عندما تتولى جهة واحدة التصميم والتنفيذ والمتابعة، تختفي فجوات التواصل بين المخطط والموقع. القرار الهندسي يُتخذ في ضوء واقع الموقع، والتعديل يُوثق قبل تنفيذه، والعميل يرى كل خطوة في مساحة عمل واحدة.",
            "هذا النموذج يقلل إعادة العمل ويحافظ على انضباط الجدول الزمني والتكلفة — وهو أساس طريقة عمل الحباك في كل مشروع."
          ]
        }
      ],
      linksTitle: "تفاصيل كل خدمة",
      links: [
        { href: "/engineering-consultancy", label: "الاستشارات الهندسية", text: "الدعم الفني واتخاذ القرار الهندسي" },
        { href: "/construction-management", label: "إدارة الإنشاءات", text: "الجدول والتكلفة وتنسيق التنفيذ" },
        { href: "/platform", label: "منصة المشاريع", text: "متابعة رقمية شفافة لكل مرحلة" },
        { href: "/contact", label: "تواصل معنا", text: "ابدأ مشروعك أو اطلب معاينة" }
      ]
    },
    en: {
      meta: {
        title: "Engineering & Construction Services | ELHABAK Construction",
        description:
          "ELHABAK services in Sohag, Egypt: engineering consultancy, architectural design, construction execution, construction management, site supervision, general contracting, and digital project tracking.",
        keywords: ["engineering services Egypt", "construction services Sohag", "architectural design", "site supervision"]
      },
      eyebrow: "Our Services",
      title: "Integrated Engineering Services from Concept to Handover",
      lead: "ELHABAK delivers a connected scope covering the full project lifecycle — consultancy and design, execution and supervision, management and reporting — under a single accountable engineering team.",
      image: { src: "/marketing/services-feature.webp", alt: "Engineering and finishing works on an ELHABAK project" },
      sections: [
        {
          heading: "Scope of Services",
          lead: "Every service runs inside a documented project lifecycle — no stage operates in isolation.",
          cards: [
            { title: "Engineering Consultancy", text: "Technical review, feasibility input, and design/execution decision support.", href: "/engineering-consultancy" },
            { title: "Architectural Design", text: "Concept and working drawings with structured client review cycles.", href: "/architectural-design" },
            { title: "Construction & Execution", text: "Structural and concrete works under direct engineering supervision.", href: "/site-supervision" },
            { title: "Construction Management", text: "Schedule, cost, contractor, and procurement coordination.", href: "/construction-management" },
            { title: "Engineering Project Management", text: "Full lifecycle control from site inspection to final handover.", href: "/project-management" },
            { title: "Interior Fit-out & Finishing", text: "Interior and exterior finishing with approved samples and materials." },
            { title: "General Contracting", text: "Coordinated civil, MEP, and site works through closeout." },
            { title: "Furniture & Furnishing", text: "Furnishing solutions aligned with the architectural design and function." },
            { title: "Project Tracking Platform", text: "Digital visibility into progress, documents, designs, and chat.", href: "/platform" }
          ]
        },
        {
          heading: "Why a Connected Delivery Model?",
          paragraphs: [
            "When one team owns design, execution, and follow-up, the gaps between drawings and site reality disappear. Decisions are made with field context, changes are documented before they are built, and the client sees every step in one workspace.",
            "This model reduces rework and protects schedule and cost discipline — the basis of how ELHABAK runs every project."
          ]
        }
      ],
      linksTitle: "Service details",
      links: [
        { href: "/engineering-consultancy", label: "Engineering Consultancy", text: "Technical support and engineering decisions" },
        { href: "/construction-management", label: "Construction Management", text: "Schedule, cost, and execution coordination" },
        { href: "/platform", label: "Project Platform", text: "Transparent digital tracking for every stage" },
        { href: "/contact", label: "Contact Us", text: "Start a project or request a site visit" }
      ]
    }
  },

  engineeringConsultancy: {
    ar: {
      meta: {
        title: "استشارات هندسية في مصر | الحباك",
        description:
          "استشارات هندسية متخصصة في سوهاج: مراجعة فنية، دعم قرارات التصميم والتنفيذ، تنسيق المخططات، وتخطيط المشروع قبل وأثناء التنفيذ.",
        keywords: ["استشارات هندسية", "استشاري هندسي سوهاج", "مراجعة مخططات", "استشارة مشروع"]
      },
      eyebrow: "الاستشارات الهندسية",
      title: "استشارات هندسية تدعم قرارك قبل وأثناء التنفيذ",
      lead: "القرار الهندسي الصحيح في وقت مبكر يوفّر تكلفة إعادة العمل لاحقاً. تقدم الحباك استشارات فنية واضحة مبنية على فحص واقعي للموقع والمخططات والاحتياجات.",
      image: { src: "/marketing/about-site.webp", alt: "مهندسو الحباك يراجعون مخططات المشروع في الموقع" },
      sections: [
        {
          heading: "ماذا تغطي الاستشارة؟",
          bullets: [
            "مراجعة فنية للمخططات والمواصفات قبل بدء التنفيذ",
            "دراسة أولية لجدوى نطاق العمل والتكلفة التقريبية",
            "تنسيق المخططات المعمارية والإنشائية والكهروميكانيكية",
            "دعم قرارات المواد وأساليب التنفيذ والبدائل الفنية",
            "تخطيط مراحل المشروع وتسلسل الأعمال",
            "متابعة فنية أثناء التنفيذ لضمان مطابقة القرار المعتمد"
          ]
        },
        {
          heading: "كيف نعمل معك",
          steps: [
            { title: "الاستماع والمعاينة", text: "نبدأ بفهم هدفك وفحص الموقع أو المخططات المتاحة." },
            { title: "المراجعة الفنية", text: "نراجع المدخلات ونحدد المخاطر والبدائل ونقاط القرار." },
            { title: "التوصية الموثقة", text: "تحصل على توصية هندسية واضحة قابلة للتنفيذ وليس ملاحظات عامة." },
            { title: "المتابعة", text: "عند التنفيذ مع الحباك تتحول التوصيات إلى بنود متابعة داخل منظومة المشروع." }
          ]
        },
        {
          heading: "استشارة تتصل بالتنفيذ",
          paragraphs: [
            "لأن الحباك تصمم وتنفذ وتتابع رقمياً، لا تبقى الاستشارة وثيقة نظرية: توصيات التصميم تتحول إلى مخططات، وقرارات التنفيذ تُوثق في سجل المشروع، والعميل يرى أثر كل قرار على الجدول والتقدم."
          ]
        }
      ],
      linksTitle: "خدمات مرتبطة",
      links: [
        { href: "/architectural-design", label: "التصميم المعماري", text: "من المفهوم إلى المخططات التنفيذية" },
        { href: "/construction-management", label: "إدارة الإنشاءات", text: "ضبط التنفيذ والجدول والتكلفة" },
        { href: "/contact", label: "اطلب استشارة", text: "ناقش مشروعك مع فريقنا الهندسي" }
      ]
    },
    en: {
      meta: {
        title: "Engineering Consultancy in Egypt | ELHABAK Construction",
        description:
          "Engineering consultancy in Sohag, Egypt: technical review, design coordination, feasibility input, engineering decision support, and project planning before and during execution.",
        keywords: ["engineering consultancy Egypt", "engineering consultant Sohag", "design review", "project planning"]
      },
      eyebrow: "Engineering Consultancy",
      title: "Engineering Consultancy That Supports Decisions Before and During Execution",
      lead: "The right engineering decision early saves rework cost later. ELHABAK provides clear technical consultation grounded in real site conditions, drawings, and requirements.",
      image: { src: "/marketing/about-site.webp", alt: "ELHABAK engineers reviewing project drawings on site" },
      sections: [
        {
          heading: "What the Consultancy Covers",
          bullets: [
            "Technical review of drawings and specifications before execution",
            "Preliminary feasibility input on scope and approximate cost",
            "Coordination across architectural, structural, and MEP drawings",
            "Support for material, method, and technical alternative decisions",
            "Project stage planning and work sequencing",
            "Technical follow-up during execution to protect approved decisions"
          ]
        },
        {
          heading: "How We Work With You",
          steps: [
            { title: "Listen & Inspect", text: "We start from your objective and inspect the site or available drawings." },
            { title: "Technical Review", text: "We assess inputs, identify risks, alternatives, and decision points." },
            { title: "Documented Recommendation", text: "You receive a clear, actionable engineering recommendation — not generic notes." },
            { title: "Follow-through", text: "When execution runs with ELHABAK, recommendations become tracked items inside the project workspace." }
          ]
        },
        {
          heading: "Consultation Connected to Execution",
          paragraphs: [
            "Because ELHABAK designs, builds, and tracks digitally, consultation never stays theoretical: design recommendations become drawings, execution decisions are logged in the project record, and the client sees each decision's effect on schedule and progress."
          ]
        }
      ],
      linksTitle: "Related services",
      links: [
        { href: "/architectural-design", label: "Architectural Design", text: "From concept to working drawings" },
        { href: "/construction-management", label: "Construction Management", text: "Execution, schedule, and cost control" },
        { href: "/contact", label: "Request Consultation", text: "Discuss your project with our engineers" }
      ]
    }
  },

  constructionManagement: {
    ar: {
      meta: {
        title: "إدارة الإنشاءات في مصر | الحباك",
        description:
          "إدارة إنشاءات احترافية في سوهاج: تخطيط المشروع، ضبط الجدول الزمني والتكلفة، تنسيق المقاولين، ومتابعة التقدم بتوثيق رقمي واضح للعميل.",
        keywords: ["إدارة إنشاءات", "إدارة مشروعات بناء مصر", "ضبط تكلفة المشروع", "جدول زمني للتنفيذ"]
      },
      eyebrow: "إدارة الإنشاءات",
      title: "إدارة إنشاءات تضبط الجدول والتكلفة والتنفيذ",
      lead: "إدارة الإنشاءات في الحباك تعني أن كل بند له مسؤول وجدول وتكلفة موثقة — وأن العميل يرى حالة التنفيذ أولاً بأول بدلاً من انتظار التقارير الورقية.",
      image: { src: "/marketing/hero-execution.webp", alt: "أعمال تنفيذ إنشائية تحت إدارة الحباك الهندسية" },
      sections: [
        {
          heading: "محاور الإدارة",
          bullets: [
            "تخطيط مراحل التنفيذ وتسلسل الأعمال قبل بدء الموقع",
            "متابعة التكلفة مقابل المقايسة والبنود المعتمدة",
            "ضبط الجدول الزمني ورصد الانحرافات مبكراً",
            "تنسيق المقاولين والتوريدات وأعمال الموقع المتداخلة",
            "توثيق التقدم بصور وتقارير ميدانية دورية",
            "إتاحة حالة المشروع للعميل عبر منصة المتابعة الرقمية"
          ]
        },
        {
          heading: "الميزة الرقمية في إدارة الموقع",
          paragraphs: [
            "تعمل إدارة الإنشاءات داخل منظومة الحباك الرقمية: كل تحديث ميداني موثق بالصور، وكل مستند مرتبط بالمشروع، ونسبة الإنجاز تُحدّث من واقع الموقع — لا من اجتهاد التقارير.",
            "هذا يحوّل متابعة المشروع من اتصالات متفرقة إلى سجل تشغيل واحد يمكن الرجوع إليه في أي وقت."
          ]
        }
      ],
      linksTitle: "صفحات ذات صلة",
      links: [
        { href: "/site-supervision", label: "الإشراف الهندسي", text: "متابعة التنفيذ والجودة داخل الموقع" },
        { href: "/project-management", label: "إدارة المشاريع", text: "إدارة دورة المشروع كاملة" },
        { href: "/platform", label: "منصة المتابعة", text: "كيف يرى العميل مشروعه رقمياً" },
        { href: "/contact", label: "ناقش مشروعك", text: "احصل على خطة إدارة لمشروعك" }
      ]
    },
    en: {
      meta: {
        title: "Construction Management in Egypt | ELHABAK Construction",
        description:
          "Construction management in Sohag, Egypt: project planning, cost tracking, schedule control, contractor coordination, progress monitoring, and documented client visibility.",
        keywords: ["construction management Egypt", "construction project management", "cost control", "schedule control"]
      },
      eyebrow: "Construction Management",
      title: "Construction Management That Controls Schedule, Cost, and Execution",
      lead: "Construction management at ELHABAK means every work item has an owner, a schedule, and a documented cost — and the client sees execution status as it happens, not weeks later.",
      image: { src: "/marketing/hero-execution.webp", alt: "Structural execution works managed by ELHABAK engineers" },
      sections: [
        {
          heading: "What We Manage",
          bullets: [
            "Execution stage planning and work sequencing before site mobilization",
            "Cost tracking against the approved bill of quantities",
            "Schedule control with early visibility into deviations",
            "Coordination of contractors, suppliers, and overlapping site trades",
            "Progress documentation through periodic field photos and reports",
            "Live project status for the client through the digital tracking platform"
          ]
        },
        {
          heading: "The Digital Advantage on Site",
          paragraphs: [
            "Construction management runs inside ELHABAK's digital system: every field update is documented with photos, every document is attached to the project, and progress reflects the site — not manual reporting.",
            "This turns project follow-up from scattered calls into a single operating record the client can revisit at any time."
          ]
        }
      ],
      linksTitle: "Related pages",
      links: [
        { href: "/site-supervision", label: "Site Supervision", text: "On-site execution and quality follow-up" },
        { href: "/project-management", label: "Project Management", text: "Full project lifecycle control" },
        { href: "/platform", label: "Tracking Platform", text: "How clients see their project digitally" },
        { href: "/contact", label: "Discuss Your Project", text: "Get a management plan for your build" }
      ]
    }
  },

  architecturalDesign: {
    ar: {
      meta: {
        title: "تصميم معماري في مصر | الحباك",
        description:
          "خدمات تصميم معماري في سوهاج: التصميم المفاهيمي، المخططات التنفيذية، تطوير التصميم، والتنسيق مع الاشتراطات — بمراجعات منظمة مع العميل.",
        keywords: ["تصميم معماري", "مخططات معمارية سوهاج", "مكتب تصميم معماري", "تصميم مباني"]
      },
      eyebrow: "التصميم المعماري",
      title: "تصميم معماري يوازن الرؤية وقابلية التنفيذ",
      lead: "التصميم الجيد لا يقاس بالمظهر فقط بل بقدرته على التنفيذ بدقة. تصمم الحباك بمنهجية تربط المفهوم المعماري بقيود الموقع والميزانية ومتطلبات التنفيذ.",
      image: { src: "/marketing/hero-design.webp", alt: "مرحلة التصميم المعماري في مشاريع الحباك" },
      sections: [
        {
          heading: "مراحل العمل التصميمي",
          steps: [
            { title: "المفهوم المعماري", text: "دراسة الموقع والاحتياجات وصياغة فكرة التصميم الأولية." },
            { title: "التخطيط المعماري", text: "توزيع الفراغات والمحاور والواجهات بما يخدم الوظيفة." },
            { title: "تطوير التصميم", text: "تفصيل العناصر والمواد والأبعاد وربطها بالأنظمة الإنشائية." },
            { title: "المخططات التنفيذية", text: "لوحات تفصيلية قابلة للتنفيذ المباشر في الموقع." },
            { title: "المراجعة والاعتماد", text: "مراجعات منظمة مع العميل حتى اعتماد كل مرحلة." }
          ]
        },
        {
          heading: "مراجعة التصميم رقمياً",
          paragraphs: [
            "تُدار مراجعات التصميم داخل منصة الحباك: يراجع العميل اللوحات والمرئيات، يسجل ملاحظاته، وتُوثق كل نسخة معتمدة بترتيب واضح — فلا يضيع أي تعديل بين الاجتماعات والرسائل.",
            "عند اعتماد التصميم تنتقل نفس المخططات إلى مرحلة التنفيذ والإشراف ضمن نفس مساحة العمل."
          ]
        }
      ],
      linksTitle: "مراحل تكمل التصميم",
      links: [
        { href: "/site-supervision", label: "الإشراف الهندسي", text: "تنفيذ المخططات بمطابقة دقيقة" },
        { href: "/engineering-consultancy", label: "الاستشارات الهندسية", text: "مراجعة ودعم القرار التصميمي" },
        { href: "/contact", label: "ابدأ التصميم", text: "احجز جلسة مناقشة لمشروعك" }
      ]
    },
    en: {
      meta: {
        title: "Architectural Design in Egypt | ELHABAK Construction",
        description:
          "Architectural design services in Sohag, Egypt: concept design, architectural planning, design development, working drawings, coordination, and structured client review.",
        keywords: ["architectural design Egypt", "architectural design services", "working drawings", "design coordination"]
      },
      eyebrow: "Architectural Design",
      title: "Architectural Design That Balances Vision and Buildability",
      lead: "Good design is measured not only by appearance but by how precisely it can be built. ELHABAK designs with a method that ties the architectural concept to site constraints, budget, and execution requirements.",
      image: { src: "/marketing/hero-design.webp", alt: "Architectural design stage on an ELHABAK project" },
      sections: [
        {
          heading: "The Design Workflow",
          steps: [
            { title: "Concept Design", text: "Site study, requirements, and the initial design idea." },
            { title: "Architectural Planning", text: "Space planning, axes, and elevations serving function." },
            { title: "Design Development", text: "Detailing elements, materials, and dimensions with structural systems." },
            { title: "Working Drawings", text: "Detailed drawings ready for direct site execution." },
            { title: "Review & Approval", text: "Structured client reviews until each stage is approved." }
          ]
        },
        {
          heading: "Design Review, Digitally",
          paragraphs: [
            "Design reviews run inside the ELHABAK platform: the client reviews drawings and visuals, records feedback, and every approved revision is versioned in order — no change is lost between meetings and messages.",
            "Once approved, the same drawings move into execution and supervision inside the same workspace."
          ]
        }
      ],
      linksTitle: "What follows design",
      links: [
        { href: "/site-supervision", label: "Site Supervision", text: "Building the drawings with precision" },
        { href: "/engineering-consultancy", label: "Engineering Consultancy", text: "Design decision review and support" },
        { href: "/contact", label: "Start a Design", text: "Book a design discussion for your project" }
      ]
    }
  },

  siteSupervision: {
    ar: {
      meta: {
        title: "إشراف هندسي على المواقع في مصر | الحباك",
        description:
          "إشراف هندسي ميداني في سوهاج: معاينة ومتابعة تنفيذ، رصد تقدم الأعمال، ملاحظات جودة موثقة بالصور، وتوثيق يومي عبر منصة متابعة المشروع.",
        keywords: ["إشراف هندسي", "إشراف على التنفيذ سوهاج", "متابعة موقع البناء", "مهندس موقع"]
      },
      eyebrow: "الإشراف الهندسي",
      title: "إشراف ميداني يجعل التنفيذ مطابقاً للمخطط",
      lead: "الإشراف في الحباك ليس زيارات متقطعة بل متابعة موثقة: كل زيارة تُسجل، كل ملاحظة لها صورة ومرجع، وكل مرحلة تُقاس بالمخطط المعتمد لا بالانطباع.",
      image: { src: "/marketing/hero-engineers-site.webp", alt: "مهندسو الحباك أثناء الإشراف على أعمال التنفيذ في الموقع" },
      sections: [
        {
          heading: "ماذا يغطي الإشراف؟",
          bullets: [
            "معاينة الموقع وتقييم حالته قبل بدء الأعمال",
            "متابعة تنفيذ البنود وفق المخططات والمواصفات",
            "رصد نسب الإنجاز الفعلية مقابل الجدول الزمني",
            "توثيق ملاحظات الجودة والمخالفات بالصور",
            "رفع تقارير ميدانية دورية بحالة الموقع",
            "إتاحة كل ذلك للعميل عبر منصة المتابعة لحظة بلحظة"
          ]
        },
        {
          heading: "التوثيق قبل الانطباع",
          paragraphs: [
            "يعمل المهندس المشرف من خلال نظام الحباك الميداني: التحديثات تُرفع من الموقع بالصور والفيديو، وترتبط بمرحلة المشروع ونسبة الإنجاز، وتظهر للعميل في واجهة واحدة بدلاً من رسائل متفرقة.",
            "النتيجة: قرارات أسرع، مسؤولية واضحة، وسجل مشروع كامل يمكن مراجعته عند التسليم."
          ]
        }
      ],
      linksTitle: "خدمات مرتبطة",
      links: [
        { href: "/platform", label: "منصة المتابعة", text: "كيف تُوثق تحديثات الموقع رقمياً" },
        { href: "/construction-management", label: "إدارة الإنشاءات", text: "الجدول والتكلفة والتنسيق" },
        { href: "/contact", label: "اطلب إشرافاً", text: "رتّب معاينة لموقعك" }
      ]
    },
    en: {
      meta: {
        title: "Site Supervision in Egypt | ELHABAK Construction",
        description:
          "Construction site supervision in Sohag, Egypt: site inspection, execution follow-up, progress tracking, documented quality observations, and photo-verified field reporting.",
        keywords: ["site supervision Egypt", "construction site supervision", "site inspection", "progress tracking"]
      },
      eyebrow: "Site Supervision",
      title: "Site Supervision That Keeps Execution True to the Drawings",
      lead: "Supervision at ELHABAK is not occasional visits — it is documented follow-up: every visit is logged, every observation carries a photo and reference, and every stage is measured against the approved drawings.",
      image: { src: "/marketing/hero-engineers-site.webp", alt: "ELHABAK engineers supervising execution works on site" },
      sections: [
        {
          heading: "What Supervision Covers",
          bullets: [
            "Site inspection and condition assessment before works begin",
            "Follow-up on executed items against drawings and specifications",
            "Tracking actual progress percentages against the schedule",
            "Photo-documented quality observations and non-conformities",
            "Periodic field reports on site status",
            "All of it visible to the client through the tracking platform"
          ]
        },
        {
          heading: "Documentation Over Impression",
          paragraphs: [
            "The supervising engineer works through ELHABAK's field system: updates are uploaded from site with photos and video, linked to the project phase and progress figure, and surfaced to the client in one view instead of scattered messages.",
            "The result: faster decisions, clear accountability, and a complete project record to review at handover."
          ]
        }
      ],
      linksTitle: "Related services",
      links: [
        { href: "/platform", label: "Tracking Platform", text: "How site updates are documented digitally" },
        { href: "/construction-management", label: "Construction Management", text: "Schedule, cost, and coordination" },
        { href: "/contact", label: "Request Supervision", text: "Arrange an inspection for your site" }
      ]
    }
  },

  projectManagement: {
    ar: {
      meta: {
        title: "إدارة المشاريع الهندسية في مصر | الحباك",
        description:
          "إدارة مشاريع هندسية متكاملة في سوهاج: إدارة دورة المشروع كاملة من المعاينة إلى التسليم — المسؤوليات، الجدول، التكاليف، المستندات، والقرارات والتقارير.",
        keywords: ["إدارة مشاريع هندسية", "إدارة دورة المشروع", "تنسيق أطراف المشروع", "تقارير مشروع"]
      },
      eyebrow: "إدارة المشاريع الهندسية",
      title: "إدارة دورة المشروع كاملة — من المعاينة إلى التسليم",
      lead: "إدارة المشروع في الحباك تعنى بالصورة الكاملة: من يفعل ماذا ومتى، كم يكلف، ما الذي تقرر، وأين وصلنا — بسجل واحد يخدم المالك والفريق معاً.",
      image: { src: "/marketing/process-blueprint.webp", alt: "مخطط إدارة دورة مشروع هندسي في الحباك" },
      sections: [
        {
          heading: "نطاق الإدارة",
          bullets: [
            "تحديد نطاق المشروع ومراحله ومسؤوليات كل طرف",
            "إدارة الجدول الزمني ومراحل التسليم الست",
            "متابعة التكاليف والمدفوعات والمقايسات",
            "أرشفة المستندات والمخططات والاعتمادات",
            "توثيق القرارات والملاحظات بسجل قابل للمراجعة",
            "تقارير دورية وقنوات تواصل مباشرة مع العميل"
          ]
        },
        {
          heading: "إدارة المشروع مقابل إدارة الإنشاءات",
          paragraphs: [
            "إدارة الإنشاءات تركز على الموقع: التنفيذ والمقاولين والتقدم الميداني. إدارة المشروع أوسع: تبدأ قبل الموقع بالمعاينة والتصميم والمقايسة، وتستمر حتى التسليم النهائي والأرشفة — وتنسق بين العميل والمصمم والمنفذ في إطار واحد.",
            "في الحباك تعمل الطبقتان معاً داخل نظام واحد، فلا تنفصل معلومات الموقع عن قرارات الإدارة."
          ]
        }
      ],
      linksTitle: "صفحات ذات صلة",
      links: [
        { href: "/construction-management", label: "إدارة الإنشاءات", text: "التركيز الميداني للتنفيذ" },
        { href: "/platform", label: "منصة المشاريع", text: "النظام الذي تدير به الحباك مشاريعها" },
        { href: "/contact", label: "ابدأ مشروعك", text: "احصل على إطار إدارة واضح" }
      ]
    },
    en: {
      meta: {
        title: "Engineering Project Management in Egypt | ELHABAK Construction",
        description:
          "Engineering project management in Sohag, Egypt: full lifecycle control from inspection to handover — responsibilities, timeline, costs, documentation, decisions, and reporting.",
        keywords: ["engineering project management Egypt", "project lifecycle management", "construction project control"]
      },
      eyebrow: "Engineering Project Management",
      title: "Full Project Lifecycle Control — From Inspection to Handover",
      lead: "Project management at ELHABAK owns the whole picture: who does what and when, what it costs, what was decided, and where the project stands — in a single record serving owner and team alike.",
      image: { src: "/marketing/process-blueprint.webp", alt: "Engineering project lifecycle plan at ELHABAK" },
      sections: [
        {
          heading: "Scope of Management",
          bullets: [
            "Defining project scope, stages, and each party's responsibilities",
            "Managing the timeline across the six delivery phases",
            "Tracking costs, payments, and bills of quantities",
            "Archiving documents, drawings, and approvals",
            "Logging decisions and observations in a reviewable record",
            "Periodic reporting and direct communication channels with the client"
          ]
        },
        {
          heading: "Project Management vs. Construction Management",
          paragraphs: [
            "Construction management focuses on the site: execution, contractors, and field progress. Project management is broader: it starts before the site — with inspection, design, and estimation — and runs through final handover and archiving, coordinating owner, designer, and contractor in one frame.",
            "At ELHABAK both layers run inside one system, so site information never separates from management decisions."
          ]
        }
      ],
      linksTitle: "Related pages",
      links: [
        { href: "/construction-management", label: "Construction Management", text: "The field-focused execution layer" },
        { href: "/platform", label: "Project Platform", text: "The system ELHABAK manages projects with" },
        { href: "/contact", label: "Start Your Project", text: "Get a clear management framework" }
      ]
    }
  },

  platform: {
    ar: {
      meta: {
        title: "منصة إدارة ومتابعة المشاريع الهندسية | الحباك",
        description:
          "نظام الحباك لإدارة المشاريع الهندسية: تتبع دورة المشروع، تحديثات موقع بالصور، نسب إنجاز، مراجعة تصاميم، مستندات، محادثات، وتقارير — برؤية مباشرة للعميل.",
        keywords: ["منصة متابعة مشاريع", "نظام إدارة مشاريع هندسية", "متابعة مشروع البناء", "بوابة العميل"]
      },
      eyebrow: "منصة الحباك الرقمية",
      title: "نظام متابعة يضع مشروعك بين يديك",
      lead: "كل مشروع في الحباك له مساحة عمل رقمية: تحديثات الموقع بالصور، نسبة الإنجاز، التصاميم والاعتمادات، المستندات، والمحادثات — في مكان واحد بدل الرسائل المتفرقة.",
      image: { src: "/marketing/platform-desktop.webp", alt: "لوحة متابعة مشروع في نظام الحباك الرقمي" },
      sections: [
        {
          heading: "ماذا يرى العميل داخل النظام؟",
          cards: [
            { title: "مساحة عمل المشروع", text: "اسم المشروع وكوده والعميل والمهندس المسؤول والمرحلة الحالية ونسبة الإنجاز في شاشة واحدة." },
            { title: "تحديثات الموقع", text: "تقارير ميدانية بالصور والفيديو من المهندس المشرف، مرتبة زمنياً ومربوطة بالمرحلة." },
            { title: "مراجعة التصاميم", text: "استعراض اللوحات والمرئيات والرد على نسخ التصميم باعتماد أو ملاحظة." },
            { title: "المستندات والتقارير", text: "عقود ومقايسات ومستندات المشروع وتقاريره الدورية في أرشيف منظم." },
            { title: "الرؤية المالية", text: "ملخصات المصروفات والمدفوعات المعتمدة بما يناسب صلاحية العميل." },
            { title: "المحادثة والإشعارات", text: "قناة تواصل مباشرة مع فريق المشروع وتنبيهات عند كل مستجد مهم." }
          ]
        },
        {
          heading: "لماذا يغيّر النظام تجربة المشروع؟",
          paragraphs: [
            "الشفافية ليست وعداً تسويقياً بل بنية عمل: عندما تكون التحديثات موثقة بالصور ومربوطة بالمرحلة، يقل الخلاف حول ما تم وما لم يتم، وتُتخذ القرارات على معلومات لا على انطباعات.",
            "النظام مخصص لعملاء الحباك وأطراف مشاريعهم المعتمدين — الوصول بحساب مؤمّن وصلاحيات حسب الدور."
          ]
        }
      ],
      linksTitle: "تابع الاستكشاف",
      links: [
        { href: "/project-management", label: "إدارة المشاريع", text: "الإطار الذي يعمل داخله النظام" },
        { href: "/site-supervision", label: "الإشراف الهندسي", text: "مصدر تحديثات الموقع الموثقة" },
        { href: "/contact", label: "ابدأ مشروعك", text: "احصل على حساب متابعة لمشروعك" }
      ]
    },
    en: {
      meta: {
        title: "Project Tracking Platform | ELHABAK Construction",
        description:
          "The ELHABAK engineering project management system: project lifecycle tracking, photo site updates, progress, design review, documents, chat, and reports — with direct client visibility.",
        keywords: ["engineering project management system", "construction project tracking platform", "client project portal"]
      },
      eyebrow: "The ELHABAK Digital Platform",
      title: "A Tracking System That Puts Your Project in Your Hands",
      lead: "Every ELHABAK project runs in a digital workspace: photo site updates, progress percentage, design approvals, documents, and conversations — in one place instead of scattered messages.",
      image: { src: "/marketing/platform-desktop.webp", alt: "Project tracking dashboard in the ELHABAK digital system" },
      sections: [
        {
          heading: "What the Client Sees Inside",
          cards: [
            { title: "Project Workspace", text: "Project name, code, client, responsible engineer, current phase, and progress on one screen." },
            { title: "Site Updates", text: "Photo and video field reports from the supervising engineer, ordered chronologically and tied to the phase." },
            { title: "Design Review", text: "Review drawings and visuals, respond to design revisions with approval or comments." },
            { title: "Documents & Reports", text: "Contracts, bills of quantities, project documents, and periodic reports in an organized archive." },
            { title: "Financial Visibility", text: "Approved expense and payment summaries scoped to the client's access level." },
            { title: "Chat & Notifications", text: "A direct channel with the project team plus alerts on every important development." }
          ]
        },
        {
          heading: "Why the System Changes the Project Experience",
          paragraphs: [
            "Transparency is not a marketing promise — it is an operating structure. When updates are photo-documented and phase-linked, disputes over what was done shrink, and decisions are made on information rather than impressions.",
            "The system is reserved for ELHABAK clients and authorized project parties — access via a secured account with role-based permissions."
          ]
        }
      ],
      linksTitle: "Keep exploring",
      links: [
        { href: "/project-management", label: "Project Management", text: "The framework the system operates in" },
        { href: "/site-supervision", label: "Site Supervision", text: "The source of documented field updates" },
        { href: "/contact", label: "Start Your Project", text: "Get tracking access for your project" }
      ]
    }
  },

  about: {
    ar: {
      meta: {
        title: "من نحن | ELHABAK Construction — الحباك للمقاولات والاستشارات الهندسية",
        description:
          "الحباك للمقاولات والاستشارات الهندسية (ELHABAK Construction) هي شركة مصرية تقدم خدمات المقاولات والاستشارات الهندسية، وتشمل التصميم المعماري والهندسي، إدارة والإشراف على المشروعات، أعمال التنفيذ والتشطيبات، ومتابعة دورة المشروع من مراحل التصميم وحتى التنفيذ والتسليم.",
        keywords: [
          "الحباك للمقاولات والاستشارات الهندسية",
          "ELHABAK Construction",
          "من نحن الحباك",
          "شركة مقاولات مصر",
          "استشارات هندسية سوهاج",
          "تصميم معماري وإشراف"
        ]
      },
      eyebrow: "عن الشركة",
      title: "الحباك للمقاولات والاستشارات الهندسية | ELHABAK Construction",
      lead:
        "الحباك للمقاولات والاستشارات الهندسية (ELHABAK Construction) هي شركة مصرية تقدم خدمات المقاولات والاستشارات الهندسية، وتشمل التصميم المعماري والهندسي، إدارة والإشراف على المشروعات، أعمال التنفيذ والتشطيبات، ومتابعة دورة المشروع من مراحل التصميم وحتى التنفيذ والتسليم.",
      image: { src: "/marketing/about-building.webp", alt: "مبنى من مشروعات شركة الحباك للمقاولات والاستشارات الهندسية" },
      sections: [
        {
          heading: "ما هي شركة ELHABAK Construction؟ (من نحن)",
          paragraphs: [
            "الحباك للمقاولات والاستشارات الهندسية (ELHABAK Construction) هي شركة مصرية متخصصة تقدم حلولاً هندسية متكاملة في مجالات المقاولات العامة والاستشارات الهندسية والتصميم المعماري والإشراف على التنفيذ. تأسست الشركة لتقديم نموذج عمل هندسي موحد يربط الفكرة المعمارية والدراسات الإنشائية بالتنفيذ الميداني الفعلي، مما يضمن أعلى معايير الجودة والسلامة الإنشائية والالتزام بالجداول الزمنية والميزانيات المعتمدة.",
            "يقع المقر الرئيسي للشركة في محافظة سوهاج بجمهورية مصر العربية، وتخدم عملاءها في المشروعات السكنية والتجارية والاستثمارية. يرتكز عملنا على إدارة هندسية متخصصة تشرف على دورة حياة المشروع كاملة، من أول معاينة للموقع وحتى التسليم النهائي، مدعومة بمنظومة رقمية متطورة تتيح المتابعة الشفافة واللحظية لكافة بنود الأعمال."
          ]
        },
        {
          heading: "الملف التعريفي والبيانات الأساسية للشركة",
          lead: "بيانات الهوية الرسمية لشركة الحباك للمقاولات والاستشارات الهندسية (ELHABAK Construction):",
          facts: [
            { label: "الاسم التجاري", value: "الحباك للمقاولات والاستشارات الهندسية" },
            { label: "الاسم بالإنجليزية", value: "ELHABAK Construction", isLtr: true },
            { label: "الموقع الرسمي", value: "elhabak.com", isLtr: true, href: "https://elhabak.com/" },
            { label: "الدولة", value: "مصر" },
            { label: "مجال العمل", value: "المقاولات والاستشارات الهندسية" },
            { label: "الهاتف الرسمي", value: "01130666726", isLtr: true, href: "tel:+201130666726" },
            { label: "واتساب", value: "201130666726", isLtr: true, href: "https://wa.me/201130666726" },
            { label: "البريد الإلكتروني", value: "elhabakconstruction.eg@gmail.com", isLtr: true, href: "mailto:elhabakconstruction.eg@gmail.com" },
            { label: "المقر الرئيسي", value: "أب تاون مول، مدينة سوهاج الجديدة، سوهاج" }
          ]
        },
        {
          heading: "نطاق الخدمات والمسؤولية الهندسية",
          lead: "تغطي خدمات الحباك كافة مراحل المشروع الهندسي تحت مسؤولية وإشراف فريق عمل واحد:",
          cards: [
            { title: "التصميم المعماري والهندسي", text: "إعداد المخططات المعمارية والإنشائية والكهروميكانيكية المتكاملة والمطابقة للأكواد الهندسية.", href: "/architectural-design" },
            { title: "الاستشارات الهندسية", text: "تقديم الدراسات الفنية، مراجعة واعتماد المخططات، وتقديم الدعم الهندسي لاتخاذ القرارات السليمة.", href: "/engineering-consultancy" },
            { title: "إدارة المشروعات", text: "إدارة شاملة لدورة المشروع، وضبط الجدول الزمني والتكاليف وتنسيق الموارد من البداية وحتى التسليم.", href: "/project-management" },
            { title: "الإشراف على التنفيذ", text: "إشراف هندسي ميداني يومي ومطابقة دقيقة لمواصفات البناء وجودة المواد المعتمدة.", href: "/site-supervision" },
            { title: "المقاولات العامة والتنفيذ", text: "تنفيذ الأعمال الإنشائية والخرسانية وأعمال البناء المتكاملة بأعلى درجات الكفاءة.", href: "/construction-management" },
            { title: "أعمال التشطيبات", text: "تنفيذ التشطيبات المعمارية الداخلية والخارجية الراقية باعتماد العينات والمواد القياسية.", href: "/services" }
          ]
        },
        {
          heading: "دورة تسليم المشروع (من المعاينة حتى التسليم)",
          lead: "منهجية العمل المعتمدة في شركة الحباك لضمان أعلى درجات الانضباط والجودة:",
          steps: [
            { title: "المعاينة الميدانية", text: "زيارة موقع المشروع وفحص طبيعة الأرض ومطابقة الأبعاد وتحديد المتطلبات الفنية بدقة." },
            { title: "التصميم والدراسات", text: "إعداد المخططات الهندسية التفصيلية المعمارية والإنشائية واعتماد كافة الرؤى التصميمية." },
            { title: "المقايسة ودراسة التكاليف", text: "إعداد جداول الكميات (BOQ) ودراسة المواصفات والتكاليف بشفافية تامة." },
            { title: "التنفيذ الميداني", text: "بدء الأعمال الإنشائية في الموقع تحت إشراف هندسي مستمر وتوثيق يومي لكافة المراحل." },
            { title: "التسليم الابتدائي", text: "فحص شامل لكافة بنود الأعمال المنفذة ومطابقتها للمواصفات ومعالجة أي ملاحظات فنية." },
            { title: "التسليم النهائي", text: "اعتماد المشروع نهائياً وتسليم كافة الوثائق الهندسية والمستندات والضمانات للمالك." }
          ]
        },
        {
          heading: "الأسئلة الشائعة حول شركة الحباك",
          cards: [
            {
              title: "ما هي شركة ELHABAK Construction؟",
              text: "الحباك للمقاولات والاستشارات الهندسية (ELHABAK Construction) هي شركة مصرية تقدم خدمات المقاولات والاستشارات الهندسية، وتشمل التصميم المعماري والهندسي، إدارة والإشراف على المشروعات، أعمال التنفيذ والتشطيبات، ومتابعة دورة المشروع من مراحل التصميم وحتى التنفيذ والتسليم."
            },
            {
              title: "ما الخدمات التي تقدمها الحباك للمقاولات والاستشارات الهندسية؟",
              text: "تشمل خدماتنا التصميم المعماري والهندسي، الاستشارات الهندسية، إدارة المشروعات والإشراف على التنفيذ، أعمال المقاولات العامة والتشطيبات، بالإضافة إلى منصة رقمية لمتابعة المشروع."
            },
            {
              title: "كيف أتواصل مع ELHABAK Construction؟",
              text: "يمكنك التواصل معنا هاتفياً عبر الرقم 01130666726، أو عبر واتساب على الرقم 201130666726، أو عبر البريد الإلكتروني elhabakconstruction.eg@gmail.com."
            }
          ]
        }
      ],
      linksTitle: "روابط سريعة",
      links: [
        { href: "/services", label: "خدماتنا", text: "استعرض نطاق العمل الكامل" },
        { href: "/platform", label: "منصة المشاريع", text: "نظام المتابعة الرقمي لمشروعك" },
        { href: "/contact", label: "تواصل معنا", text: "تحدث مع فريقنا الهندسي" }
      ]
    },
    en: {
      meta: {
        title: "About Us | ELHABAK Construction — Contracting & Engineering Consultancy",
        description:
          "ELHABAK Construction is an Egyptian contracting and engineering consultancy company providing architectural and engineering design, project management and supervision, construction and finishing services, with project delivery support from design through execution and handover.",
        keywords: [
          "ELHABAK Construction",
          "contracting company Egypt",
          "engineering consultancy Sohag",
          "about ELHABAK",
          "architectural design Egypt"
        ]
      },
      eyebrow: "About ELHABAK",
      title: "ELHABAK Construction | Contracting & Engineering Consultancy",
      lead:
        "ELHABAK Construction is an Egyptian contracting and engineering consultancy company providing architectural and engineering design, project management and supervision, construction and finishing services, with project delivery support from design through execution and handover.",
      image: { src: "/marketing/about-building.webp", alt: "A building project delivered by ELHABAK Construction" },
      sections: [
        {
          heading: "What is ELHABAK Construction? (Who We Are)",
          paragraphs: [
            "ELHABAK Construction (الحباك للمقاولات والاستشارات الهندسية) is an Egyptian contracting and engineering consultancy firm specializing in integrated architectural and engineering design, project management, site supervision, and turnkey construction. The company was established to provide a unified engineering delivery model that connects architectural concepts and structural engineering directly with field execution, ensuring uncompromising build quality, structural integrity, and schedule adherence.",
            "Headquartered in Sohag, Egypt, the company serves residential, commercial, and investment projects. Our engineering management oversees the complete project lifecycle from initial site inspection and preliminary estimation through full handover, supported by a dedicated digital platform providing clients with transparent, verified progress tracking."
          ]
        },
        {
          heading: "Company Profile & Identity Facts",
          lead: "Official entity details for ELHABAK Construction (الحباك للمقاولات والاستشارات الهندسية):",
          facts: [
            { label: "Trade Name", value: "ELHABAK Construction", isLtr: true },
            { label: "Arabic Name", value: "الحباك للمقاولات والاستشارات الهندسية" },
            { label: "Official Website", value: "elhabak.com", isLtr: true, href: "https://elhabak.com/" },
            { label: "Country", value: "Egypt" },
            { label: "Industry", value: "Contracting & Engineering Consultancy" },
            { label: "Official Phone", value: "01130666726", isLtr: true, href: "tel:+201130666726" },
            { label: "WhatsApp", value: "201130666726", isLtr: true, href: "https://wa.me/201130666726" },
            { label: "Email", value: "elhabakconstruction.eg@gmail.com", isLtr: true, href: "mailto:elhabakconstruction.eg@gmail.com" },
            { label: "Main Office", value: "Uptown Mall, New Sohag City, Sohag, Egypt" }
          ]
        },
        {
          heading: "Scope of Services & Engineering Responsibility",
          lead: "ELHABAK Construction covers all stages of engineering and construction under a single accountable management:",
          cards: [
            { title: "Architectural & Engineering Design", text: "Comprehensive architectural, structural, and MEP engineering drawings compliant with Egyptian building codes.", href: "/architectural-design" },
            { title: "Engineering Consultancy", text: "Specialized technical review, feasibility analysis, drawing coordination, and engineering decision support.", href: "/engineering-consultancy" },
            { title: "Project Management", text: "Full lifecycle schedule, cost, resource, and quality management from inspection to completion.", href: "/project-management" },
            { title: "Site Supervision", text: "Continuous on-site engineering oversight ensuring strict adherence to specifications and approved drawings.", href: "/site-supervision" },
            { title: "Contracting & Construction", text: "Structural works, concrete pouring, and comprehensive general contracting delivered on schedule.", href: "/construction-management" },
            { title: "Finishing Works", text: "High-end interior and exterior finishing with material and sample approvals.", href: "/services" }
          ]
        },
        {
          heading: "Project Delivery Lifecycle (Inspection to Handover)",
          lead: "Our verified 6-stage engineering delivery workflow:",
          steps: [
            { title: "Site Inspection", text: "Field visit to assess topography, verify dimensions, and establish project requirements." },
            { title: "Design & Studies", text: "Developing architectural concepts, structural blueprints, and technical specifications." },
            { title: "Preliminary Estimation & BOQ", text: "Itemized Bill of Quantities and transparent cost calculations before construction." },
            { title: "Site Execution", text: "Active construction with direct engineering supervision and daily milestone tracking." },
            { title: "Initial Handover", text: "Detailed snagging walkthrough and initial handover inspection with the client." },
            { title: "Final Handover", text: "Final project closeout, warranty delivery, and official documentation transfer." }
          ]
        },
        {
          heading: "Frequently Asked Questions About ELHABAK",
          cards: [
            {
              title: "What is ELHABAK Construction?",
              text: "ELHABAK Construction is an Egyptian contracting and engineering consultancy company providing architectural and engineering design, project management and supervision, construction and finishing services, with project delivery support from design through execution and handover."
            },
            {
              title: "What services does ELHABAK Construction provide?",
              text: "Our services encompass architectural and engineering design, engineering consultancy, construction management and site supervision, contracting and finishing works, supported by our project tracking platform."
            },
            {
              title: "How can I contact ELHABAK Construction?",
              text: "You can reach us by phone at 01130666726, via WhatsApp at 201130666726, or by email at elhabakconstruction.eg@gmail.com."
            }
          ]
        }
      ],
      linksTitle: "Quick Links",
      links: [
        { href: "/services", label: "Our Services", text: "Explore our full scope of work" },
        { href: "/platform", label: "Project Platform", text: "Learn about our digital tracking system" },
        { href: "/contact", label: "Contact Us", text: "Speak with our engineering team" }
      ]
    }
  },

  contact: {
    ar: {
      meta: {
        title: "تواصل معنا | ELHABAK Construction — الحباك للمقاولات والاستشارات الهندسية",
        description:
          "تواصل مع شركة الحباك للمقاولات والاستشارات الهندسية (ELHABAK Construction) في مصر: هاتف 01130666726، واتساب 201130666726، بريد إلكتروني، واستشارة هندسية لمشروعك.",
        keywords: [
          "تواصل الحباك",
          "ELHABAK Construction contact",
          "مكتب هندسي سوهاج",
          "طلب معاينة موقع",
          "استشارة هندسية مصر"
        ]
      },
      eyebrow: "تواصل معنا",
      title: "تواصل مع ELHABAK Construction — الحباك للمقاولات والاستشارات الهندسية",
      lead:
        "أخبرنا عن مشروعك — سكني أو تجاري، تصميم أو تنفيذ أو إشراف — وسيتواصل معك فريق شركة الحباك للمقاولات والاستشارات الهندسية (ELHABAK Construction) لترتيب المعاينة ومناقشة نطاق العمل.",
      image: { src: "/marketing/contact-crane.webp", alt: "معدات إنشائية في موقع مشروع — تواصل مع الحباك" },
      sections: [
        {
          heading: "بيانات التواصل المعتمدة",
          cards: [
            { title: "الهاتف المباشر", text: "01130666726", href: telHref(companyContact) },
            { title: "واتساب", text: "201130666726", href: whatsappHref(companyContact, dictionary.ar.home.whatsappMessage) },
            { title: "البريد الإلكتروني", text: "elhabakconstruction.eg@gmail.com", href: "mailto:elhabakconstruction.eg@gmail.com" },
            { title: "المقر الرئيسي", text: "أب تاون مول، مدينة سوهاج الجديدة، سوهاج" }
          ]
        },
        {
          heading: "كيف يبدأ المشروع؟",
          steps: [
            { title: "التواصل الأول", text: "راسلنا أو اتصل بنا وصف لنا نوع المشروع والموقع." },
            { title: "المعاينة", text: "نزور الموقع أو نراجع المخططات المتاحة ونحدد الاحتياجات الفنية." },
            { title: "نطاق العمل", text: "تتلقى عرضاً واضحاً بالنطاق والمراحل وطريقة المتابعة." },
            { title: "بدء التنفيذ", text: "يُنشأ مشروعك في نظام المتابعة وتبدأ المراحل الموثقة." }
          ]
        },
        {
          heading: "ما الذي يمكننا مساعدتك فيه؟",
          bullets: [
            "تصميم معماري وهندسي لمشروع سكني أو تجاري",
            "تنفيذ وإنشاءات وأعمال خرسانية",
            "تشطيبات معمارية داخلية وخارجية",
            "إشراف هندسي على مشروع قائم",
            "إدارة مشروع كاملة من المعاينة للتسليم",
            "استشارة فنية قبل شراء أو بناء"
          ]
        }
      ],
      linksTitle: "قبل التواصل",
      links: [
        { href: "/services", label: "استعرض الخدمات", text: "تعرّف على نطاق عملنا" },
        { href: "/platform", label: "المنصة الرقمية", text: "كيف ستتابع مشروعك" },
        { href: "/about", label: "عن الحباك", text: "من نحن وكيف نعمل" }
      ]
    },
    en: {
      meta: {
        title: "Contact Us | ELHABAK Construction — Contracting & Engineering Consultancy",
        description:
          "Contact ELHABAK Construction in Egypt: phone 01130666726, WhatsApp 201130666726, email, and specialized engineering consultation for your project.",
        keywords: [
          "contact ELHABAK",
          "ELHABAK Construction phone",
          "engineering office Sohag",
          "request site inspection"
        ]
      },
      eyebrow: "Contact Us",
      title: "Contact ELHABAK Construction — Contracting & Engineering Consultancy",
      lead:
        "Tell us about your project — residential or commercial, design, execution, or supervision — and the ELHABAK Construction engineering team will arrange an inspection and discuss scope.",
      image: { src: "/marketing/contact-crane.webp", alt: "Construction equipment on a project site — contact ELHABAK" },
      sections: [
        {
          heading: "Official Contact Channels",
          cards: [
            { title: "Direct Phone", text: "01130666726", href: telHref(companyContact) },
            { title: "WhatsApp", text: "201130666726", href: whatsappHref(companyContact, dictionary.en.home.whatsappMessage) },
            { title: "Email", text: "elhabakconstruction.eg@gmail.com", href: "mailto:elhabakconstruction.eg@gmail.com" },
            { title: "Main Office", text: "Uptown Mall, New Sohag City, Sohag, Egypt" }
          ]
        },
        {
          heading: "How a Project Starts",
          steps: [
            { title: "First Contact", text: "Message or call us and describe the project type and location." },
            { title: "Inspection", text: "We visit the site or review available drawings and define requirements." },
            { title: "Scope of Work", text: "You receive a clear proposal covering scope, stages, and follow-up method." },
            { title: "Execution Begins", text: "Your project is created in the tracking system and documented stages begin." }
          ]
        },
        {
          heading: "What We Can Help With",
          bullets: [
            "Architectural and engineering design for residential or commercial projects",
            "Execution, structural works, and finishing",
            "Engineering supervision of an existing project",
            "Full project management from inspection to handover",
            "Technical consultation before buying or building",
            "General contracting and turnkey delivery"
          ]
        }
      ],
      linksTitle: "Before you reach out",
      links: [
        { href: "/services", label: "Browse Services", text: "See our full scope" },
        { href: "/platform", label: "Digital Platform", text: "How you will track your project" },
        { href: "/about", label: "About ELHABAK", text: "Who we are and how we work" }
      ]
    }
  }
};
