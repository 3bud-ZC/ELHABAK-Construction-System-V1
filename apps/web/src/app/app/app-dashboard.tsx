"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, MetricCard, ProgressBar } from "@elhabak/ui";
import {
  ArrowUpLeft,
  Briefcase,
  Camera,
  CheckCircle2,
  FileText,
  FolderKanban,
  Plus,
  Users2,
  WalletCards
} from "lucide-react";
import {
  activityLabel,
  apiRequest,
  categoryLabel,
  LIFECYCLE_PHASES,
  phaseLabel,
  statusLabel,
  statusTone,
  type ProjectRecord
} from "../../lib/api";
import { useCurrentUser } from "../../lib/user-context";

type DashboardSummary = {
  activeProjects: number;
  clientCount: number;
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
          review: "مراجعة"
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
          review: "Review"
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
            <span className="mono">OPS / 01</span>
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
            icon={<Camera size={17} />}
            tone="orange"
            label={labels.updates}
            value={<bdi>{dashboard.recentUpdates.length}</bdi>}
            hint={labels.updateContext}
          />
          <MetricCard
            icon={<Briefcase size={17} />}
            tone="success"
            label={labels.activity}
            value={<bdi>{dashboard.recentActivity.length}</bdi>}
            hint={labels.activityContext}
          />
        </div>
      )}

      {!loading && (
        <div className="dashboard-body">
          <div className="dashboard-body__main">
            <section className="dashboard-projects-panel">
              <header className="dashboard-section-heading">
                <div>
                  <span className="dashboard-section-heading__eyebrow">{isAdmin ? "PORTFOLIO / DELIVERY" : labels.authorized}</span>
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
                    <span className="dashboard-section-heading__eyebrow">ACTIVITY / LOG</span>
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
              <section className="dashboard-quick-panel">
              <header className="dashboard-section-heading dashboard-section-heading--compact">
                <div>
                  <span className="dashboard-section-heading__eyebrow">SHORTCUTS</span>
                  <h2>{labels.quickTitle}</h2>
                  <p>{labels.quickLead}</p>
                </div>
              </header>
              <div className="dashboard-quick-grid">
                {isAdmin && <Link href={href("/app/admin/projects/new")}><Plus size={16} /><strong>{labels.newProject}</strong></Link>}
                <Link href={href("/app/reports")}><FileText size={16} /><strong>{labels.reports}</strong></Link>
                {(user.role === "ADMIN" || user.role === "ACCOUNTANT") && <Link href={href("/app/finance")}><WalletCards size={16} /><strong>{labels.finance}</strong></Link>}
                {isAdmin && <Link href={href("/app/admin/users")}><Users2 size={16} /><strong>{labels.team}</strong></Link>}
              </div>
            </section>

            {dashboard && (
              <>
                <section className="dashboard-phase-panel">
                  <header className="dashboard-section-heading dashboard-section-heading--compact">
                    <div>
                      <span className="dashboard-section-heading__eyebrow">PIPELINE / PHASES</span>
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
                      <span className="dashboard-section-heading__eyebrow">FIELD / REPORTS</span>
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
