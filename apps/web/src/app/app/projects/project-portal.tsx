"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, OperationsHeader, OperationsSurface, ProgressBar, Register, RegisterCell, RegisterRow } from "@elhabak/ui";
import {
  Activity,
  ArrowUpLeft,
  CheckCircle2,
  Circle,
  Clock3,
  FileStack,
  FolderKanban,
  Info,
  MessageSquare,
  Ruler,
  Wallet
} from "lucide-react";

import {
  activityLabel,
  apiRequest,
  formatAppDate,
  designStatusLabel,
  designStatusTone,
  phaseLabel,
  statusLabel,
  statusTone,
  siteUpdateTypeLabel,
  siteUpdateTypeTone,
  type ProjectOverviewRecord,
  type ProjectRecord
} from "../../../lib/api";
import { useCurrentUser } from "../../../lib/user-context";
import { Lifecycle } from "../../../components/lifecycle";
import { ProjectWorkspace } from "../../../components/project-workspace";

type PortalProps = { projectId?: string };

export function ProjectPortal({ projectId }: PortalProps) {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const user = useCurrentUser();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [overview, setOverview] = useState<ProjectOverviewRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const labels = useMemo(() => locale === "ar" ? {
    title: "مشاريعي", workerTitle: "تحديثات الموقع", lead: "المشاريع المصرح لك بالوصول إليها.", workerLead: "اختر مشروعاً لرفع تحديث ميداني جديد.",
    empty: "لا توجد مشاريع مخصصة لك", emptyHint: "سيظهر هنا أي مشروع يتم تعيينك عليه.", brief: "ملاحظات تشغيلية", briefLead: "ملاحظات التشغيل المسجلة على المشروع.", dates: "الجدول الزمني", team: "فريق التسليم", progress: "الإنجاز",
    noNotes: "لا توجد ملاحظات مسجلة.", note: "ملاحظة", files: "مرفقات", setup: "قائمة إعداد المشروع", clientReady: "العميل معين", engineerReady: "المهندس معين", scheduleReady: "الجدول الزمني مضبوط", siteReady: "أول تحديث ميداني", openSite: "فتح نشاط الموقع", loadingLabel: "جاري تحميل مساحة المشروع...", start: "تاريخ البدء", target: "التسليم المستهدف", category: "فئة المشروع", phase: "مرحلة العمل", workers: "الفريق الميداني", none: "غير معين", lifecycle: "مسار المشروع", lifecycleLead: "المراحل الستة للتسليم الهندسي.", current: "الحالة الحالية",
    modules: "وحدات المشروع", modulesLead: "الحالة الحالية لكل وحدة تشغيل ومسار الدخول إليها.", openModule: "فتح", designModule: "التصميمات", siteModule: "نشاط الموقع", docsModule: "المستندات", financeModule: "الشؤون المالية", chatModule: "الدردشة",
    designEmpty: "لا توجد تصميمات بعد", designLatest: "أحدث تصميم", designReviewPending: "بانتظار مراجعة العميل", designRejectedCount: "مرفوضة تحتاج مراجعة", designCount: "تصميم",
    siteEmpty: "لا توجد تحديثات موقع بعد", siteLatest: "آخر تحديث", siteCount: "تحديث",
    docsEmpty: "لا توجد مستندات نشطة", docsShared: "مشترك مع العميل", docsCount: "مستند نشط",
    financeNotConfigured: "الملف المالي غير مضبوط", financeContract: "قيمة العقد", financePaid: "المدفوع", financeOutstanding: "المتبقي",
    chatUnread: "رسائل غير مقروءة", chatCaughtUp: "لا رسائل جديدة",
    recentActivity: "آخر نشاط المشروع", recentActivityLead: "أحداث تشغيلية مسجلة على هذا المشروع.", noActivity: "لا يوجد نشاط مسجل بعد", noActivityHint: "ستظهر الأحداث هنا مع بدء العمل.",
    overdueBadge: "تجاوز موعد التسليم المستهدف", retry: "إعادة المحاولة", loadFailed: "تعذر تحميل مساحة المشروع."
  } : {
    title: "My Projects", workerTitle: "Site Updates", lead: "Projects you are authorized to access.", workerLead: "Choose a project to upload a new field update.",
    empty: "No assigned projects", emptyHint: "Any project you are assigned to will appear here.", brief: "Operating notes", briefLead: "Notes recorded on this project.", dates: "Schedule", team: "Delivery team", progress: "Progress",
    noNotes: "No project notes recorded.", note: "Note", files: "attachments", setup: "Project setup checklist", clientReady: "Client assigned", engineerReady: "Engineer assigned", scheduleReady: "Schedule configured", siteReady: "First site update", openSite: "Open site activity", loadingLabel: "Loading project workspace...", start: "Start date", target: "Target delivery", category: "Project category", phase: "Work phase", workers: "Field team", none: "Unassigned", lifecycle: "Project delivery path", lifecycleLead: "The six canonical engineering delivery stages.", current: "Current state",
    modules: "Project modules", modulesLead: "Current state of each operations module and its entry point.", openModule: "Open", designModule: "Design Hub", siteModule: "Site Activity", docsModule: "Documents", financeModule: "Finance", chatModule: "Chat",
    designEmpty: "No designs yet", designLatest: "Latest design", designReviewPending: "awaiting client review", designRejectedCount: "rejected awaiting revision", designCount: "designs",
    siteEmpty: "No site updates yet", siteLatest: "Latest update", siteCount: "updates",
    docsEmpty: "No active documents", docsShared: "shared with client", docsCount: "active documents",
    financeNotConfigured: "Finance not configured", financeContract: "Contract value", financePaid: "Paid", financeOutstanding: "Outstanding",
    chatUnread: "unread messages", chatCaughtUp: "No new messages",
    recentActivity: "Latest project activity", recentActivityLead: "Operational events recorded on this project.", noActivity: "No activity recorded yet", noActivityHint: "Events will appear here once work begins.",
    overdueBadge: "Past the target delivery date", retry: "Retry", loadFailed: "The project workspace could not be loaded."
  }, [locale]);

  function load() {
    setLoading(true);
    (projectId ? apiRequest<ProjectOverviewRecord>(`/projects/${projectId}/overview`) : apiRequest<ProjectRecord[]>("/projects")).then((result) => {
      if (Array.isArray(result)) { setProjects(result); setOverview(null); }
      else { setOverview(result); setProjects([]); }
      setError("");
    }).catch(() => setError(labels.loadFailed))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (projectId ? apiRequest<ProjectOverviewRecord>(`/projects/${projectId}/overview`) : apiRequest<ProjectRecord[]>("/projects")).then((result) => {
      if (!alive) return;
      if (Array.isArray(result)) { setProjects(result); setOverview(null); }
      else { setOverview(result); setProjects([]); }
      setError("");
    }).catch(() => { if (alive) setError(labels.loadFailed); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [projectId]);

  function href(path: string) { return locale === "ar" ? path : `${path}${path.includes("?") ? "&" : "?"}lang=en`; }
  function formatDate(value: string | null) {
    if (!value) return locale === "ar" ? "غير محدد" : "Not set";
    return formatAppDate(value, locale);
  }
  function formatTimestamp(value: string) {
    return formatAppDate(value, locale, true);
  }

  if (loading) return <section className="app-page"><LoadingState label={labels.loadingLabel} /></section>;

  const isWorker = user.role === "WORKER";
  const project = overview?.project ?? null;

  if (project && overview) {
    const setupItems = [
      { label: labels.clientReady, complete: overview.setup.clientAssigned, href: null },
      { label: labels.engineerReady, complete: overview.setup.engineerAssigned, href: user.role === "ADMIN" && !overview.setup.engineerAssigned ? `/app/admin/projects/${project.id}` : null },
      { label: labels.scheduleReady, complete: overview.setup.scheduleConfigured, href: user.role === "ADMIN" && !overview.setup.scheduleConfigured ? `/app/admin/projects/${project.id}` : null },
      { label: labels.siteReady, complete: overview.setup.hasSiteUpdate, href: `${project.id}/site-activity` }
    ];
    const incompleteSetup = setupItems.filter((item) => !item.complete);
    const isOverdue = project.targetDate !== null && new Date(project.targetDate) < new Date() && project.status !== "COMPLETED" && project.status !== "CANCELLED";
    const showSetup = incompleteSetup.length > 0 && (user.role === "ADMIN" || user.role === "ENGINEER");

    const moduleCards = [
      overview.design !== null
        ? {
          id: "design",
          icon: <Ruler size={16} />,
          title: labels.designModule,
          href: `${project.id}/design`,
          stats: overview.design.total === 0
            ? <span className="overview-module-card__empty">{labels.designEmpty}</span>
            : <>
              <span className="overview-module-card__stat"><strong className="mono"><bdi>{overview.design.total}</bdi></strong> {labels.designCount}</span>
              {overview.design.inReview > 0 && <Badge tone="orange"><bdi>{overview.design.inReview}</bdi> {labels.designReviewPending}</Badge>}
              {overview.design.rejected > 0 && <Badge tone="danger"><bdi>{overview.design.rejected}</bdi> {labels.designRejectedCount}</Badge>}
              {overview.design.latest && <span className="overview-module-card__meta">{labels.designLatest}: <bdi>{overview.design.latest.title}</bdi> · <Badge tone={designStatusTone(overview.design.latest.status)}>{designStatusLabel(overview.design.latest.status, locale)}</Badge></span>}
            </>
        }
        : null,
      {
        id: "site",
        icon: <Activity size={16} />,
        title: labels.siteModule,
        href: `${project.id}/site-activity`,
        stats: overview.site.updateCount === 0
          ? <span className="overview-module-card__empty">{labels.siteEmpty}</span>
          : <>
            <span className="overview-module-card__stat"><strong className="mono"><bdi>{overview.site.updateCount}</bdi></strong> {labels.siteCount}</span>
            {overview.site.recent[0] && <span className="overview-module-card__meta">{labels.siteLatest}: <Badge tone={siteUpdateTypeTone(overview.site.recent[0].type)}>{siteUpdateTypeLabel(overview.site.recent[0].type, locale)}</Badge> · <bdi>{formatDate(overview.site.recent[0].createdAt)}</bdi></span>}
          </>
      },
      overview.documents !== null
        ? {
          id: "documents",
          icon: <FileStack size={16} />,
          title: labels.docsModule,
          href: `${project.id}/documents`,
          stats: overview.documents.total === 0
            ? <span className="overview-module-card__empty">{labels.docsEmpty}</span>
            : <>
              <span className="overview-module-card__stat"><strong className="mono"><bdi>{overview.documents.total}</bdi></strong> {labels.docsCount}</span>
              {overview.documents.clientVisible !== undefined && overview.documents.clientVisible !== null && <span className="overview-module-card__meta"><bdi>{overview.documents.clientVisible}</bdi> {labels.docsShared}</span>}
            </>
        }
        : null,
      user.role === "ADMIN" && overview.finance !== null
        ? {
          id: "finance",
          icon: <Wallet size={16} />,
          title: labels.financeModule,
          href: `${project.id}/finance`,
          stats: !overview.finance.configured
            ? <span className="overview-module-card__empty">{labels.financeNotConfigured}</span>
            : <span className="overview-module-card__finance">
              <span><small>{labels.financeContract}</small><strong className="mono"><bdi>{overview.finance.contractValue ?? "—"}</bdi></strong></span>
              <span><small>{labels.financePaid}</small><strong className="mono"><bdi>{overview.finance.paidAmount}</bdi></strong></span>
              <span><small>{labels.financeOutstanding}</small><strong className="mono"><bdi>{overview.finance.outstandingBalance ?? "—"}</bdi></strong></span>
            </span>
        }
        : null,
      {
        id: "chat",
        icon: <MessageSquare size={16} />,
        title: labels.chatModule,
        href: `${project.id}/chat`,
        stats: overview.chat.unreadCount > 0
          ? <span className="overview-module-card__stat"><Badge tone="orange"><bdi>{overview.chat.unreadCount}</bdi></Badge> {labels.chatUnread}</span>
          : <span className="overview-module-card__empty">{labels.chatCaughtUp}</span>
      }
    ].filter((card): card is NonNullable<typeof card> => card !== null);

    return (
      <section className={`app-page project-workspace-page ${isWorker ? "worker-shell" : ""}`}>
        <ProjectWorkspace project={project} locale={locale} role={user.role} active="overview" />
        {error && <div className="form-error">{error}</div>}

        {isOverdue && (user.role === "ADMIN" || user.role === "ENGINEER") && (
          <div className="overview-overdue-note" role="status">
            <Clock3 size={15} aria-hidden="true" />
            <span>{labels.overdueBadge} · <bdi>{formatDate(project.targetDate)}</bdi></span>
          </div>
        )}

        {showSetup && (
          <section className="project-setup-checklist" aria-labelledby="project-setup-title">
            <div className="project-setup-checklist__head">
              <div><span className="section-kicker">{locale === "ar" ? "جاهزية المشروع" : "Project setup"}</span><h2 id="project-setup-title">{labels.setup}</h2></div>
              <span><bdi>{setupItems.length - incompleteSetup.length}/{setupItems.length}</bdi></span>
            </div>
            <div className="project-setup-checklist__items">
              {setupItems.map((item) => {
                const content = <><span className={item.complete ? "is-complete" : ""}>{item.complete ? <CheckCircle2 size={16} /> : <Circle size={16} />}</span><strong>{item.label}</strong></>;
                return item.href && !item.complete ? <Link href={href(item.href.startsWith("/app") ? item.href : `/app/projects/${item.href}`)} key={item.label}>{content}</Link> : <div key={item.label}>{content}</div>;
              })}
            </div>
          </section>
        )}

        <div className="project-overview-v2">
          <section className="overview-lifecycle-section">
            <div className="overview-section-heading">
              <div><span className="section-kicker">{locale === "ar" ? "مراحل التنفيذ" : "Delivery stages"}</span><h2>{labels.lifecycle}</h2></div>
            </div>
            <Lifecycle phase={project.phase} locale={locale} />
          </section>

          <section className="overview-modules-section" aria-labelledby="overview-modules-title">
            <div className="overview-section-heading">
              <div><span className="section-kicker">{locale === "ar" ? "متابعة المشروع" : "Project operations"}</span><h2 id="overview-modules-title">{labels.modules}</h2><p>{labels.modulesLead}</p></div>
            </div>
            <div className="overview-module-grid">
              {moduleCards.map((card) => (
                <Link className="overview-module-card" href={href(`/app/projects/${card.href}`)} key={card.id}>
                  <span className="overview-module-card__head">
                    <span className="overview-module-card__icon">{card.icon}</span>
                    <strong>{card.title}</strong>
                    <span className="overview-module-card__cta">{labels.openModule} <ArrowUpLeft size={14} aria-hidden="true" /></span>
                  </span>
                  <span className="overview-module-card__body">{card.stats}</span>
                </Link>
              ))}
            </div>
          </section>

          <div className="workspace-grid workspace-grid--overview">
            <section className="workspace-panel workspace-panel--brief">
              <div className="workspace-panel__title"><Info size={17} /><div><h2>{labels.brief}</h2><p>{labels.briefLead}</p></div></div>
              <dl className="detail-list">
                <div><dt>{labels.note}</dt><dd>{project.notes ?? labels.noNotes}</dd></div>
              </dl>
            </section>
            <section className="workspace-panel workspace-panel--activity">
              <div className="workspace-panel__title"><Activity size={17} /><div><h2>{labels.recentActivity}</h2><p>{labels.recentActivityLead}</p></div></div>
              {overview.recentActivity.length === 0 ? (
                <EmptyState title={labels.noActivity} description={labels.noActivityHint} className="project-overview-empty" />
              ) : (
                <div className="project-overview-activity-list">
                  {overview.recentActivity.map((event) => (
                    <article className="project-overview-activity" key={event.id}>
                      <span className="project-overview-activity__marker"><Clock3 size={13} /></span>
                      <div><strong>{activityLabel(event.action, locale)}</strong><small><bdi>{event.actorName ?? "—"}</bdi> · <bdi>{formatTimestamp(event.createdAt)}</bdi></small></div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </section>
    );
  }

  if (projectId && error) {
    return (
      <section className="app-page">
        <div className="form-error">{error}</div>
        <button className="ui-button ui-button--secondary" type="button" onClick={load}>{labels.retry}</button>
      </section>
    );
  }

  return <section className="app-page">
    <OperationsHeader
      eyebrow={isWorker ? (locale === "ar" ? "تحديثات ميدانية" : "Field updates") : (locale === "ar" ? "المشاريع المصرح بها" : "Authorized projects")}
      title={isWorker ? labels.workerTitle : labels.title}
      description={isWorker ? labels.workerLead : labels.lead}
      meta={<span><bdi>{projects.length}</bdi> {locale === "ar" ? "مشروع" : "projects"}</span>}
    />
    {error && <div className="form-error">{error}</div>}
    {projects.length === 0 && <EmptyState icon={<FolderKanban size={20} />} title={labels.empty} description={labels.emptyHint} />}
    {projects.length > 0 && (
      <OperationsSurface>
        <Register
          className="assigned-project-register"
          columns="minmax(260px,1.8fr) minmax(150px,.9fr) minmax(160px,1fr) minmax(110px,.7fr) 56px"
          head={<><span>{locale === "ar" ? "المشروع" : "Project"}</span><span>{labels.phase}</span><span>{labels.progress}</span><span>{labels.current}</span><span /></>}
        >
          {projects.map((item) => (
            <RegisterRow className="assigned-project-register__row" key={item.id}>
              <RegisterCell className="ops-register__cell--identity" label={locale === "ar" ? "المشروع" : "Project"}>
                <Link href={href(`/app/projects/${item.id}${isWorker ? "/site-activity" : ""}`)}>
                  <strong dir="auto">{item.name}</strong>
                  <bdi className="mono" dir="ltr">{item.code}</bdi>
                </Link>
              </RegisterCell>
              <RegisterCell label={labels.phase}>{phaseLabel(item.phase, locale)}</RegisterCell>
              <RegisterCell label={labels.progress}>
                <span className="ops-progress-cell"><ProgressBar value={item.progress} tone={item.progress >= 70 ? "success" : "orange"} /><strong className="mono" dir="ltr">{item.progress}%</strong></span>
              </RegisterCell>
              <RegisterCell label={labels.current}><Badge tone={statusTone(item.status)}>{statusLabel(item.status, locale)}</Badge></RegisterCell>
              <RegisterCell className="ops-register__cell--action"><Link className="project-register-open" href={href(`/app/projects/${item.id}${isWorker ? "/site-activity" : ""}`)} aria-label={`${labels.openModule}: ${item.name}`}><ArrowUpLeft size={15} /></Link></RegisterCell>
            </RegisterRow>
          ))}
        </Register>
      </OperationsSurface>
    )}
  </section>;
}
