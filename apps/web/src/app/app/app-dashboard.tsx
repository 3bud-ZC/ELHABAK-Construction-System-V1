"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, MetricCard, ProgressBar } from "@elhabak/ui";
import {
  AlertTriangle,
  ArrowUpLeft,
  Camera,
  CheckCircle2,
  Database,
  FileText,
  FolderKanban,
  Plus,
  Ruler,
  Users2,
  WalletCards
} from "lucide-react";
import {
  activityLabel,
  apiRequest,
  categoryLabel,
  disciplineLabel,
  LIFECYCLE_PHASES,
  phaseLabel,
  statusLabel,
  statusTone,
  type DesignDiscipline,
  type ProjectPhase,
  type ProjectRecord,
  type ProjectStatus
} from "../../lib/api";
import { useCurrentUser } from "../../lib/user-context";

type AttentionDesign = {
  id: string;
  projectId: string;
  projectName: string;
  projectCode: string | null;
  title: string;
  discipline: string;
  updatedAt: string;
};

type DashboardSummary = {
  activeProjects: number;
  clientCount: number;
  pendingReviewCount: number;
  overdueCount: number;
  projects: ProjectRecord[];
  recentUpdates: Array<{
    id: string;
    projectId: string;
    projectName: string;
    note: string | null;
    createdAt: string;
    mediaCount: number;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    createdAt: string;
    actorName: string | null;
    projectName: string | null;
  }>;
  attention: {
    pendingDesigns: AttentionDesign[];
    rejectedDesigns: AttentionDesign[];
    overdueProjects: Array<{
      id: string;
      code: string | null;
      name: string;
      targetDate: string | null;
      phase: ProjectPhase;
      progress: number;
      status: ProjectStatus;
    }>;
    setupIncomplete: Array<{
      id: string;
      code: string | null;
      name: string;
      missingEngineer: boolean;
      missingSchedule: boolean;
    }>;
  };
};

export function AppDashboard() {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const user = useCurrentUser();
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const labels = useMemo(
    () =>
      locale === "ar"
        ? {
          title: "لوحة التحكم",
          eyebrow: "مركز قيادة العمليات",
          adminLead: "قراءة تشغيلية للمشاريع الجارية وما يحتاج إلى متابعة.",
          portalLead: "المشاريع المصرح لك بالوصول إليها.",
          welcome: "مرحباً مجدداً",
          liveContext: "قراءة النظام",
          systemReady: "النظام متصل",
          active: "مشاريع نشطة",
          clients: "عملاء مرتبطون",
          updates: "تحديثات الموقع",
          activity: "سجل النشاط",
          activeContext: "ضمن خط التنفيذ الحالي",
          clientContext: "حسابات مرتبطة بالمشاريع",
          updateContext: "آخر ما ورد من الموقع",
          activityContext: "أحداث مسجلة مؤخراً",
          operations: "المشاريع قيد التشغيل",
          operationsLead: "سجل سريع للمشاريع ومراحلها ونسب الإنجاز.",
          viewProjects: "عرض كل المشاريع",
          status: "الحالة",
          phase: "المرحلة الحالية",
          progress: "الإنجاز",
          client: "العميل",
          open: "فتح المشروع",
          noProjects: "لا توجد مشاريع في نطاق الوصول",
          noProjectsHint: "ستظهر المشاريع هنا فور توفر سجل مصرح به.",
          newProject: "إنشاء مشروع",
          setupTitle: "ابدأ تشغيل النظام بخطوات واضحة",
          setupLead: "أنشئ السجلات الأساسية أولاً، ثم انتقل إلى متابعة التنفيذ من مساحة المشروع.",
          setupClient: "أضف أول عميل",
          setupClientHint: "سجّل جهة الاتصال قبل ربطها بمشروع.",
          setupProject: "أنشئ أول مشروع",
          setupProjectHint: "سيتم إنشاء معرّف المشروع تلقائياً.",
          setupFinance: "أضف سياق الميزانية",
          setupFinanceHint: "أكمل البيانات المالية من داخل مساحة المشروع.",
          setupSite: "ابدأ متابعة الموقع",
          setupSiteHint: "بعد إنشاء المشروع، ارفع أول تحديث ميداني.",
          setupDone: "جاهز",
          setupNext: "ابدأ",
          teamPath: "/app/admin/clients",
          activityTitle: "آخر النشاط التشغيلي",
          activityLead: "أحداث مسجلة من وحدات النظام.",
          updatesTitle: "آخر تحديثات الموقع",
          updatesLead: "آخر الملاحظات الواردة من فرق الموقع.",
          quickTitle: "اختصارات التشغيل",
          quickLead: "انتقل مباشرة إلى العمل المتكرر.",
          phaseTitle: "توزيع مراحل التنفيذ",
          phaseLead: "عدد المشاريع في كل مرحلة حالية.",
          reports: "مركز التقارير",
          finance: "الشؤون المالية",
          team: "إدارة الفريق",
          noActivity: "لا يوجد نشاط مسجل بعد",
          noActivityHint: "ستظهر الأحداث التشغيلية هنا بعد بدء العمل.",
          noUpdates: "لا توجد تحديثات موقع بعد",
          noUpdatesHint: "ستظهر هنا ملاحظات المهندسين والعمال الميدانية.",
          media: "مرفقات",
          noNote: "بدون ملاحظة نصية",
          authorized: "مشاريع مصرح بها",
          category: "التصنيف",
          review: "مراجعة",
          portfolioEyebrow: "المشاريع الجارية",
          activityEyebrow: "سجل النشاط الميداني",
          quickEyebrow: "روابط سريعة",
          phaseEyebrow: "مراحل التنفيذ",
          updatesEyebrow: "تقارير الموقع",
          attentionEyebrow: "مركز الإجراءات",
          attentionTitle: "يحتاج إلى متابعة",
          attentionLead: "قرارات عمل معلقة عبر المشاريع.",
          designReview: "تصميم بانتظار المراجعة",
          designRejected: "تصميم مرفوض يحتاج مراجعة جديدة",
          overdue: "متأخر عن موعد التسليم",
          setupIncomplete: "إعداد المشروع غير مكتمل",
          missingEngineer: "بدون مهندس مسؤول",
          missingSchedule: "بدون جدول زمني",
          openDesign: "مراجعة التصميم",
          openProject: "فتح المشروع",
          fixSetup: "إكمال الإعداد",
          pendingReviews: "مراجعات معلقة",
          overdueShort: "تجاوز الموعد",
          allClear: "لا توجد بنود معلقة",
          allClearHint: "كل المشاريع تعمل ضمن النطاق المخطط.",
          dataOps: "عمليات البيانات"
        }
        : {
          title: "Dashboard",
          eyebrow: "OPERATIONS COMMAND CENTER",
          adminLead: "An operational read on active delivery and what needs attention.",
          portalLead: "Projects you are authorized to access.",
          welcome: "Welcome back",
          liveContext: "SYSTEM READ",
          systemReady: "System connected",
          active: "Active projects",
          clients: "Linked clients",
          updates: "Site updates",
          activity: "Activity log",
          activeContext: "Within the current delivery pipeline",
          clientContext: "Accounts linked to projects",
          updateContext: "Latest field submissions",
          activityContext: "Recently recorded events",
          operations: "Projects in operation",
          operationsLead: "A quick register of projects, phases, and progress.",
          viewProjects: "View all projects",
          status: "Status",
          phase: "Current phase",
          progress: "Progress",
          client: "Client",
          open: "Open project",
          noProjects: "No projects in your access scope",
          noProjectsHint: "Authorized projects will appear here when available.",
          newProject: "Create project",
          setupTitle: "Start the system with a clear first run",
          setupLead: "Create the core records first, then move into delivery from the project workspace.",
          setupClient: "Add your first client",
          setupClientHint: "Register the contact before linking a project.",
          setupProject: "Create your first project",
          setupProjectHint: "The project identifier is generated automatically.",
          setupFinance: "Add budget context",
          setupFinanceHint: "Complete financial context inside the project workspace.",
          setupSite: "Start site follow-up",
          setupSiteHint: "After creating a project, submit the first field update.",
          setupDone: "Ready",
          setupNext: "Start",
          teamPath: "/app/admin/clients",
          activityTitle: "Latest operational activity",
          activityLead: "Events recorded across the system.",
          updatesTitle: "Latest site updates",
          updatesLead: "Recent notes submitted from the field.",
          quickTitle: "Operations shortcuts",
          quickLead: "Go directly to recurring work.",
          phaseTitle: "Delivery phase distribution",
          phaseLead: "Projects currently assigned to each phase.",
          reports: "Reports center",
          finance: "Project finance",
          team: "Manage team",
          noActivity: "No activity recorded yet",
          noActivityHint: "Operational events will appear here once work begins.",
          noUpdates: "No site updates yet",
          noUpdatesHint: "Field notes from engineers and workers will appear here.",
          media: "attachments",
          noNote: "No written note",
          authorized: "Authorized projects",
          category: "Category",
          review: "Review",
          portfolioEyebrow: "ACTIVE PORTFOLIO",
          activityEyebrow: "FIELD ACTIVITY",
          quickEyebrow: "QUICK ACCESS",
          phaseEyebrow: "EXECUTION PHASES",
          updatesEyebrow: "FIELD UPDATES",
          attentionEyebrow: "ACTION CENTER",
          attentionTitle: "Needs attention",
          attentionLead: "Pending operational decisions across projects.",
          designReview: "Design awaiting review",
          designRejected: "Rejected design needs a new revision",
          overdue: "Past target date",
          setupIncomplete: "Project setup incomplete",
          missingEngineer: "No engineer assigned",
          missingSchedule: "No schedule configured",
          openDesign: "Review design",
          openProject: "Open project",
          fixSetup: "Complete setup",
          pendingReviews: "Pending reviews",
          overdueShort: "Past due",
          allClear: "Nothing pending",
          allClearHint: "All projects are running within the planned envelope.",
          dataOps: "Data Ops"
        },
    [locale]
  );

  useEffect(() => {
    let alive = true;
    setError("");
    const request = user.role === "ADMIN"
      ? apiRequest<DashboardSummary>("/admin/projects/dashboard/summary").then((result) => {
        if (alive) setDashboard(result);
      })
      : apiRequest<ProjectRecord[]>("/projects").then((result) => {
        if (alive) setProjects(result);
      });
    request
      .catch((requestError: Error) => {
        if (alive) setError(requestError.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user.role]);

  function href(path: string) {
    return locale === "ar" ? path : `${path}${path.includes("?") ? "&" : "?"}lang=en`;
  }

  function formatDate(value: string | Date, options: Intl.DateTimeFormatOptions) {
    const dateLocale = locale === "ar" ? "ar-EG-u-nu-latn" : "en-US";
    return new Intl.DateTimeFormat(dateLocale, options).format(new Date(value));
  }

  function formatTimestamp(value: string) {
    return formatDate(value, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  const visibleProjects = dashboard?.projects ?? projects;
  const projectById = new Map(visibleProjects.map((project) => [project.id, project]));
  const phaseCounts = LIFECYCLE_PHASES.map((phase) => ({
    phase,
    count: dashboard?.projects.filter((project) => project.phase === phase).length ?? 0
  }));
  const phaseTotal = dashboard?.projects.length ?? 0;
  const isAdmin = user.role === "ADMIN";

  return (
    <section className="app-page dashboard-page">
      <header className="dashboard-command-intro">
        <div className="dashboard-command-intro__copy">
          <div className="dashboard-command-intro__eyebrow">
            <span>{labels.eyebrow}</span>
          </div>
          <span className="dashboard-command-intro__welcome">{labels.welcome}, <bdi>{user.displayName}</bdi></span>
          <h1>{labels.title}</h1>
          <p>{isAdmin ? labels.adminLead : labels.portalLead}</p>
        </div>
        <div className="dashboard-command-intro__meta">
          <span className="dashboard-command-intro__meta-label">{labels.liveContext}</span>
          <strong><bdi>{formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}</bdi></strong>
          <span className="dashboard-command-intro__system"><i aria-hidden="true" />{labels.systemReady}</span>
        </div>
      </header>

      {loading && <LoadingState label={locale === "ar" ? "جاري قراءة بيانات التشغيل..." : "Reading operations data..."} />}
      {error && <div className="form-error">{error}</div>}

      {dashboard && (
        <div className="dashboard-kpi-strip">
          <MetricCard
            icon={<FolderKanban size={17} />}
            tone="navy"
            label={labels.active}
            value={<bdi>{dashboard.activeProjects}</bdi>}
            hint={labels.activeContext}
          />
          <MetricCard
            icon={<Users2 size={17} />}
            tone="info"
            label={labels.clients}
            value={<bdi>{dashboard.clientCount}</bdi>}
            hint={labels.clientContext}
          />
          <MetricCard
            icon={<Ruler size={17} />}
            tone={dashboard.pendingReviewCount > 0 ? "orange" : "success"}
            label={labels.pendingReviews}
            value={<bdi>{dashboard.pendingReviewCount}</bdi>}
            hint={labels.designReview}
          />
          <MetricCard
            icon={<AlertTriangle size={17} />}
            tone={dashboard.overdueCount > 0 ? "danger" : "success"}
            label={labels.overdueShort}
            value={<bdi>{dashboard.overdueCount}</bdi>}
            hint={labels.overdue}
          />
        </div>
      )}

      {isAdmin && dashboard?.projects.length === 0 && (
        <section className="dashboard-setup-guide" aria-labelledby="dashboard-setup-title">
          <header className="dashboard-setup-guide__head">
            <div>
              <span className="dashboard-section-heading__eyebrow">{labels.quickEyebrow}</span>
              <h2 id="dashboard-setup-title">{labels.setupTitle}</h2>
              <p>{labels.setupLead}</p>
            </div>
            <span className="dashboard-setup-guide__state"><CheckCircle2 size={15} /> {labels.setupDone}</span>
          </header>
          <div className="dashboard-setup-guide__steps">
            {[
              { icon: <Users2 size={17} />, title: labels.setupClient, hint: labels.setupClientHint, path: "/app/admin/clients/new" },
              { icon: <FolderKanban size={17} />, title: labels.setupProject, hint: labels.setupProjectHint, path: "/app/admin/projects/new" },
              { icon: <WalletCards size={17} />, title: labels.setupFinance, hint: labels.setupFinanceHint, path: "/app/finance" },
              { icon: <Camera size={17} />, title: labels.setupSite, hint: labels.setupSiteHint, path: "/app/admin/projects" }
            ].map((step, index) => (
              <Link className="dashboard-setup-step" href={href(step.path)} key={step.title}>
                <span className="dashboard-setup-step__index"><bdi>{String(index + 1).padStart(2, "0")}</bdi></span>
                <span className="dashboard-setup-step__icon">{step.icon}</span>
                <span className="dashboard-setup-step__copy"><strong>{step.title}</strong><small>{step.hint}</small></span>
                <span className="dashboard-setup-step__action">{labels.setupNext} <ArrowUpLeft size={14} /></span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loading && (
        <div className="dashboard-body">
          <div className="dashboard-body__main">
            <section className="dashboard-projects-panel">
              <header className="dashboard-section-heading">
                <div>
                  <span className="dashboard-section-heading__eyebrow">{isAdmin ? labels.portfolioEyebrow : labels.authorized}</span>
                  <h2>{labels.operations}</h2>
                  <p>{labels.operationsLead}</p>
                </div>
                <Link className="dashboard-section-link" href={href(isAdmin ? "/app/admin/projects" : "/app/projects")}>
                  {labels.viewProjects} <ArrowUpLeft size={15} aria-hidden="true" />
                </Link>
              </header>
              {visibleProjects.length === 0 ? (
                <EmptyState
                  icon={<FolderKanban size={18} />}
                  title={labels.noProjects}
                  description={labels.noProjectsHint}
                  action={isAdmin ? <Link className="ui-button ui-button--primary ui-button--sm" href={href("/app/admin/projects/new")}><Plus size={15} /> {labels.newProject}</Link> : undefined}
                  className="dashboard-empty-state"
                />
              ) : (
                <div className="dashboard-project-table">
                  <div className="dashboard-project-table__head" aria-hidden="true">
                    <span>{locale === "ar" ? "المشروع" : "Project"}</span>
                    <span>{labels.status} / {labels.phase}</span>
                    <span>{labels.progress}</span>
                    <span>{labels.client}</span>
                    <span />
                  </div>
                  {visibleProjects.map((project, index) => (
                    <Link className="dashboard-project-row" href={href(`/app/projects/${project.id}`)} key={project.id} aria-label={`${labels.open}: ${project.name}`}>
                      <div className="dashboard-project-row__identity">
                        <span className="dashboard-project-row__index mono">{String(index + 1).padStart(2, "0")}</span>
                        <div>
                          <strong>{project.name}</strong>
                          <span className="mono">{project.code ?? "—"}</span>
                          <small>{categoryLabel(project.category, locale)}{project.location ? ` · ${project.location}` : ""}</small>
                        </div>
                      </div>
                      <div className="dashboard-project-row__phase">
                        <Badge tone={statusTone(project.status)}>{statusLabel(project.status, locale)}</Badge>
                        <span>{phaseLabel(project.phase, locale)}</span>
                      </div>
                      <div className="dashboard-project-row__progress">
                        <div><span>{labels.progress}</span><strong className="mono"><bdi>{project.progress}%</bdi></strong></div>
                        <ProgressBar value={project.progress} tone={project.progress >= 70 ? "success" : "orange"} />
                      </div>
                      <div className="dashboard-project-row__client">
                        <span>{labels.client}</span>
                        <strong><bdi>{project.client?.user.displayName ?? "—"}</bdi></strong>
                      </div>
                      <ArrowUpLeft className="dashboard-project-row__arrow" size={16} aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {dashboard && (
              <section className="dashboard-activity-panel">
                <header className="dashboard-section-heading dashboard-section-heading--compact">
                  <div>
                    <span className="dashboard-section-heading__eyebrow">{labels.activityEyebrow}</span>
                    <h2>{labels.activityTitle}</h2>
                    <p>{labels.activityLead}</p>
                  </div>
                </header>
                {dashboard.recentActivity.length === 0 ? (
                  <EmptyState icon={<CheckCircle2 size={18} />} title={labels.noActivity} description={labels.noActivityHint} className="dashboard-empty-state" />
                ) : (
                  <div className="dashboard-activity-list">
                    {dashboard.recentActivity.map((activity) => (
                      <div className="dashboard-activity-row" key={activity.id}>
                        <span className="dashboard-activity-row__marker" aria-hidden="true"><i /></span>
                        <div className="dashboard-activity-row__body">
                          <strong>{activityLabel(activity.action, locale)}</strong>
                          <span><bdi>{activity.actorName ?? "—"}</bdi>{activity.projectName ? <> <em>·</em> <bdi>{activity.projectName}</bdi></> : null}</span>
                        </div>
                        <time className="mono"><bdi>{formatTimestamp(activity.createdAt)}</bdi></time>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          {(user.role !== "WORKER" || dashboard) && (
            <aside className="dashboard-body__aside">
              {dashboard && (
                <section className="dashboard-attention-panel">
                  <header className="dashboard-section-heading dashboard-section-heading--compact">
                    <div>
                      <span className="dashboard-section-heading__eyebrow">{labels.attentionEyebrow}</span>
                      <h2>{labels.attentionTitle}</h2>
                      <p>{labels.attentionLead}</p>
                    </div>
                    <strong className="dashboard-side-total mono">
                      <bdi>{dashboard.attention.pendingDesigns.length + dashboard.attention.rejectedDesigns.length + dashboard.attention.overdueProjects.length + dashboard.attention.setupIncomplete.length}</bdi>
                    </strong>
                  </header>
                  {dashboard.attention.pendingDesigns.length === 0 &&
                  dashboard.attention.rejectedDesigns.length === 0 &&
                  dashboard.attention.overdueProjects.length === 0 &&
                  dashboard.attention.setupIncomplete.length === 0 ? (
                    <div className="dashboard-attention-clear" role="status">
                      <CheckCircle2 size={17} />
                      <div><strong>{labels.allClear}</strong><span>{labels.allClearHint}</span></div>
                    </div>
                  ) : (
                    <div className="attention-list">
                      {dashboard.attention.pendingDesigns.map((design) => (
                        <Link className="attention-row" href={href(`/app/projects/${design.projectId}/design/${design.id}`)} key={`design-${design.id}`}>
                          <span className="attention-row__icon"><Ruler size={16} /></span>
                          <span className="attention-row__body">
                            <strong>{design.title}</strong>
                            <span>
                              {labels.designReview} · {disciplineLabel(design.discipline as DesignDiscipline, locale)} · {design.projectName}
                            </span>
                          </span>
                          <span className="attention-row__cta">{labels.openDesign}</span>
                        </Link>
                      ))}
                      {dashboard.attention.rejectedDesigns.map((design) => (
                        <Link className="attention-row" href={href(`/app/projects/${design.projectId}/design/${design.id}`)} key={`rejected-${design.id}`}>
                          <span className="attention-row__icon attention-row__icon--danger"><Ruler size={16} /></span>
                          <span className="attention-row__body">
                            <strong>{design.title}</strong>
                            <span>
                              {labels.designRejected} · {disciplineLabel(design.discipline as DesignDiscipline, locale)} · {design.projectName}
                            </span>
                          </span>
                          <span className="attention-row__cta">{labels.openDesign}</span>
                        </Link>
                      ))}
                      {dashboard.attention.overdueProjects.map((project) => (
                        <Link className="attention-row" href={href(`/app/admin/projects/${project.id}`)} key={`overdue-${project.id}`}>
                          <span className="attention-row__icon attention-row__icon--danger"><AlertTriangle size={16} /></span>
                          <span className="attention-row__body">
                            <strong>{project.name}</strong>
                            <span>
                              {labels.overdue}{project.targetDate ? <> · <bdi>{formatDate(project.targetDate, { day: "2-digit", month: "short" })}</bdi></> : null} · <bdi>{project.progress}%</bdi>
                            </span>
                          </span>
                          <span className="attention-row__cta">{labels.openProject}</span>
                        </Link>
                      ))}
                      {dashboard.attention.setupIncomplete.map((project) => (
                        <Link className="attention-row" href={href(`/app/admin/projects/${project.id}`)} key={`setup-${project.id}`}>
                          <span className="attention-row__icon attention-row__icon--info"><FolderKanban size={16} /></span>
                          <span className="attention-row__body">
                            <strong>{project.name}</strong>
                            <span>
                              {labels.setupIncomplete} · {[project.missingEngineer ? labels.missingEngineer : null, project.missingSchedule ? labels.missingSchedule : null].filter(Boolean).join(locale === "ar" ? "، " : ", ")}
                            </span>
                          </span>
                          <span className="attention-row__cta">{labels.fixSetup}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              )}
              <section className="dashboard-quick-panel">
              <header className="dashboard-section-heading dashboard-section-heading--compact">
                <div>
                  <span className="dashboard-section-heading__eyebrow">{labels.quickEyebrow}</span>
                  <h2>{labels.quickTitle}</h2>
                  <p>{labels.quickLead}</p>
                </div>
              </header>
              <div className="dashboard-quick-grid">
                {isAdmin && <Link href={href("/app/admin/projects/new")}><Plus size={16} /><strong>{labels.newProject}</strong></Link>}
                <Link href={href("/app/reports")}><FileText size={16} /><strong>{labels.reports}</strong></Link>
                {(user.role === "ADMIN" || user.role === "ACCOUNTANT") && <Link href={href("/app/finance")}><WalletCards size={16} /><strong>{labels.finance}</strong></Link>}
                {isAdmin && <Link href={href("/app/admin/users")}><Users2 size={16} /><strong>{labels.team}</strong></Link>}
                {isAdmin && <Link href={href("/app/data")}><Database size={16} /><strong>{labels.dataOps}</strong></Link>}
              </div>
            </section>

            {dashboard && (
              <>
                <section className="dashboard-phase-panel">
                  <header className="dashboard-section-heading dashboard-section-heading--compact">
                    <div>
                      <span className="dashboard-section-heading__eyebrow">{labels.phaseEyebrow}</span>
                      <h2>{labels.phaseTitle}</h2>
                      <p>{labels.phaseLead}</p>
                    </div>
                    <strong className="dashboard-side-total mono"><bdi>{phaseTotal}</bdi></strong>
                  </header>
                  <div className="dashboard-phase-list">
                    {phaseCounts.map(({ phase, count }) => (
                      <div key={phase}>
                        <span>{phaseLabel(phase, locale)}</span>
                        <i><b style={{ width: `${phaseTotal && count ? Math.max(8, (count / phaseTotal) * 100) : 0}%` }} /></i>
                        <strong className="mono"><bdi>{count}</bdi></strong>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="dashboard-updates-panel">
                  <header className="dashboard-section-heading dashboard-section-heading--compact">
                    <div>
                      <span className="dashboard-section-heading__eyebrow">{labels.updatesEyebrow}</span>
                      <h2>{labels.updatesTitle}</h2>
                      <p>{labels.updatesLead}</p>
                    </div>
                  </header>
                  {dashboard.recentUpdates.length === 0 ? (
                    <EmptyState icon={<Camera size={18} />} title={labels.noUpdates} description={labels.noUpdatesHint} className="dashboard-empty-state" />
                  ) : (
                    <div className="dashboard-updates">
                      {dashboard.recentUpdates.slice(0, 3).map((update) => {
                        const project = projectById.get(update.projectId);
                        return (
                          <Link className="dashboard-update-card" href={href(`/app/projects/${update.projectId}/site-activity`)} key={update.id}>
                            <div className="dashboard-update-card__head">
                              <strong>{update.projectName}</strong>
                              {update.mediaCount > 0 && <Badge tone="orange"><bdi>{update.mediaCount}</bdi> {labels.media}</Badge>}
                            </div>
                            <span className="dashboard-update-card__context">
                              {project ? <>{phaseLabel(project.phase, locale)} <em>·</em> <bdi>{project.progress}%</bdi></> : labels.review}
                            </span>
                            <p>{update.note ?? labels.noNote}</p>
                            <time className="mono"><bdi>{formatTimestamp(update.createdAt)}</bdi></time>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </section>
              </>
            )}
            </aside>
          )}
        </div>
      )}
    </section>
  );
}
