import type { Locale } from "./translations";
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
        title: "من نحن | الحباك للمقاولات والاستشارات الهندسية",
        description:
          "الحباك للمقاولات والاستشارات الهندسية (ELHABAK Construction) في سوهاج: تصميم وتنفيذ وإشراف بإدارة هندسية واحدة، وفلسفة تحكم واضحة مدعومة بمنصة متابعة رقمية للعميل.",
        keywords: ["الحباك للمقاولات والاستشارات الهندسية", "الحباك للمقاولات", "شركة مقاولات سوهاج", "مكتب هندسي سوهاج"]
      },
      eyebrow: "عن الحباك",
      title: "شركة مقاولات واستشارات هندسية تجمع التصميم والتنفيذ والمتابعة في مسؤولية واحدة",
      lead: "الحباك للمقاولات والاستشارات الهندسية شركة مقرها سوهاج تعمل على المشروعات السكنية والتجارية — من المعاينة والتصميم إلى التنفيذ والتسليم.",
      image: { src: "/marketing/about-building.webp", alt: "مبنى من مشاريع الحباك للمقاولات والاستشارات الهندسية" },
      sections: [
        {
          heading: "من نحن",
          paragraphs: [
            "الحباك شركة مقاولات واستشارات هندسية تقدم الاستشارة والتصميم المعماري والتنفيذ والإشراف وإدارة المشاريع. نعمل على المباني السكنية والتجارية والتشطيبات والمقاولات العامة والتأثيث.",
            "مقرنا في سوهاج ونخدم عملاءنا بفريق يجمع بين المعرفة التصميمية والخبرة الميدانية — فالمهندس الذي يرسم المخطط هو من يتابع تنفيذه."
          ]
        },
        {
          heading: "فلسفتنا في التحكم بالمشروع",
          bullets: [
            "قرار واحد مسؤول: لا تناقض بين التصميم والتنفيذ لأنهما في يد فريق واحد",
            "توثيق قبل التنفيذ: المقايسات والمخططات والاعتمادات تسبق العمل الميداني",
            "متابعة يومية: الموقع يُوثق بالصور والتقارير لا بالانطباعات",
            "شفافية للعميل: كل مرحلة مرئية عبر منصة المتابعة الرقمية"
          ]
        },
        {
          heading: "الميزة الرقمية",
          paragraphs: [
            "بنينا نظام متابعة داخلياً لأن تجربة العميل التقليدية — مكالمات وصور واتساب وتقارير متأخرة — لا تليق بمشروع يكلّف ملايين. اليوم يتابع عميل الحباك مشروعه من هاتفه: التقدم، الصور، التصاميم، المستندات، والمحادثات في مكان واحد."
          ]
        }
      ],
      linksTitle: "تابع",
      links: [
        { href: "/services", label: "خدماتنا", text: "نطاق العمل الكامل" },
        { href: "/platform", label: "المنصة", text: "نظام المتابعة الذي نعمل به" },
        { href: "/contact", label: "تواصل معنا", text: "ابدأ الحديث عن مشروعك" }
      ]
    },
    en: {
      meta: {
        title: "About Us | ELHABAK Construction",
        description:
          "ELHABAK Construction (الحباك للمقاولات والاستشارات الهندسية) in Sohag, Egypt: design, execution, and supervision under one accountable engineering management, backed by a digital client tracking platform.",
        keywords: ["ELHABAK Construction", "construction company Egypt", "engineering consultancy Sohag"]
      },
      eyebrow: "About ELHABAK",
      title: "A Construction & Engineering Company Holding Design, Execution, and Follow-up in One Responsibility",
      lead: "ELHABAK Construction is a Sohag-based company working on residential and commercial projects — from site inspection and design to execution and handover.",
      image: { src: "/marketing/about-building.webp", alt: "A building delivered by ELHABAK Construction" },
      sections: [
        {
          heading: "Who We Are",
          paragraphs: [
            "ELHABAK Construction is a construction and engineering company delivering consultancy, architectural design, execution, supervision, and project management. We work on residential and commercial buildings, finishing, general contracting, and furnishing.",
            "We are based in Sohag and serve clients with a team that combines design knowledge and field experience — the engineer who draws the plan is the one who follows its execution."
          ]
        },
        {
          heading: "Our Project Control Philosophy",
          bullets: [
            "One accountable decision-maker: no design-versus-execution contradiction under one team",
            "Documentation before execution: estimates, drawings, and approvals precede site work",
            "Daily follow-up: the site is documented with photos and reports, not impressions",
            "Client transparency: every stage is visible through the digital tracking platform"
          ]
        },
        {
          heading: "The Digital Advantage",
          paragraphs: [
            "We built our internal tracking system because the traditional client experience — calls, scattered photos, late reports — does not suit a project that costs millions. Today an ELHABAK client follows the project from their phone: progress, photos, designs, documents, and conversations in one place."
          ]
        }
      ],
      linksTitle: "Continue",
      links: [
        { href: "/services", label: "Our Services", text: "The full scope of work" },
        { href: "/platform", label: "The Platform", text: "The tracking system we run" },
        { href: "/contact", label: "Contact Us", text: "Start the conversation about your project" }
      ]
    }
  },

  contact: {
    ar: {
      meta: {
        title: "تواصل معنا | الحباك للمقاولات والاستشارات الهندسية",
        description:
          "تواصل مع الحباك للمقاولات والاستشارات الهندسية في سوهاج: ابدأ مشروعك، اطلب معاينة، أو ناقش احتياجك الهندسي — هاتف، واتساب، بريد إلكتروني، وعنوان المقر.",
        keywords: ["تواصل الحباك", "مكتب هندسي سوهاج", "طلب معاينة موقع", "استشارة مشروع"]
      },
      eyebrow: "تواصل معنا",
      title: "ابدأ مشروعك بمعاينة واضحة ورد سريع",
      lead: "أخبرنا عن مشروعك — سكني أو تجاري، تصميم أو تنفيذ أو إشراف — وسيتواصل معك فريقنا الهندسي لترتيب المعاينة ومناقشة نطاق العمل.",
      image: { src: "/marketing/contact-crane.webp", alt: "معدات إنشائية في موقع مشروع — تواصل مع الحباك" },
      sections: [
        {
          heading: "بيانات التواصل",
          cards: [
            { title: "الهاتف المباشر", text: "(+20) 011 111 309 18", href: "tel:+201111130918" },
            { title: "واتساب", text: "راسلنا مباشرة على واتساب لبدء المحادثة.", href: "https://wa.me/201111130918" },
            { title: "البريد الإلكتروني", text: "elhabakconstruction.eg@gmail.com", href: "mailto:elhabakconstruction.eg@gmail.com" },
            { title: "المقر", text: "أب تاون مول، مدينة سوهاج الجديدة، سوهاج" }
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
            "تصميم معماري لمشروع سكني أو تجاري",
            "تنفيذ وإنشاءات وتشطيبات",
            "إشراف هندسي على مشروع قائم",
            "إدارة مشروع كاملة من المعاينة للتسليم",
            "استشارة فنية قبل شراء أو بناء",
            "مقاولات عامة وتأثيث"
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
        title: "Contact | ELHABAK Construction — Sohag, Egypt",
        description:
          "Contact ELHABAK Construction in Sohag: start your project, request a site inspection, or discuss your engineering needs — phone, WhatsApp, email, and office address.",
        keywords: ["contact ELHABAK", "engineering office Sohag", "request site inspection"]
      },
      eyebrow: "Contact Us",
      title: "Start Your Project with a Clear Inspection and a Fast Response",
      lead: "Tell us about your project — residential or commercial, design, execution, or supervision — and our engineering team will arrange the inspection and discuss scope.",
      image: { src: "/marketing/contact-crane.webp", alt: "Construction equipment on a project site — contact ELHABAK" },
      sections: [
        {
          heading: "Contact Channels",
          cards: [
            { title: "Direct Phone", text: "(+20) 011 111 309 18", href: "tel:+201111130918" },
            { title: "WhatsApp", text: "Message us directly on WhatsApp to start the conversation.", href: "https://wa.me/201111130918" },
            { title: "Email", text: "elhabakconstruction.eg@gmail.com", href: "mailto:elhabakconstruction.eg@gmail.com" },
            { title: "Office", text: "Uptown Mall, New Sohag City, Sohag, Egypt" }
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
            "Architectural design for residential or commercial projects",
            "Execution, structural works, and finishing",
            "Engineering supervision of an existing project",
            "Full project management from inspection to handover",
            "Technical consultation before buying or building",
            "General contracting and furnishing"
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
