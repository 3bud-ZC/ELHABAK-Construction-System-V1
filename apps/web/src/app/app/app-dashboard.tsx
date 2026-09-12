"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, MetricCard, ProgressBar } from "@elhabak/ui";
import { Briefcase, CalendarDays, Camera, FileText, FolderKanban, Plus, Users2, WalletCards } from "lucide-react";
import {
  actionLabel,
  apiRequest,
  phaseLabel,
  statusTone,
  type ProjectRecord
} from "../../lib/api";
import { useCurrentUser } from "../../lib/user-context";

type DashboardSummary = {
  activeProjects: number;
  clientCount: number;
  projects: ProjectRecord[];
  recentUpdates: Array<{ id: string; projectId: string; projectName: string; note: string | null; createdAt: string; mediaCount: number }>;
  recentActivity: Array<{ id: string; action: string; createdAt: string; actorName: string | null; projectName: string | null }>;
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
          adminLead: "نظرة عامة على المشاريع الجارية والنشاط الحديث.",
          portalLead: "المشاريع المصرح لك بالوصول إليها.",
          active: "مشاريع نشطة",
          clients: "عملاء",
          phases: "المشاريع الجارية",
          updates: "آخر تحديثات الموقع",
          activity: "آخر النشاط",
          openProjects: "فتح المشاريع",
          open: "فتح",
          emptyProjects: "لا توجد مشاريع بعد",
          emptyProjectsHint: "ستظهر هنا المشاريع فور إنشائها.",
          emptyUpdates: "لا توجد تحديثات موقع بعد",
          emptyUpdatesHint: "ستظهر هنا تحديثات المهندسين والعمال الميدانية.",
          emptyActivity: "لا يوجد نشاط مسجل بعد",
          loadingLabel: "جاري تحميل البيانات...",
          code: "الكود",
          progress: "التقدم"
        }
        : {
          title: "Dashboard",
          adminLead: "An overview of active projects and recent activity.",
          portalLead: "Projects you are authorized to access.",
          active: "Active projects",
          clients: "Clients",
          phases: "Active projects",
          updates: "Recent site updates",
          activity: "Recent activity",
          openProjects: "Open projects",
          open: "Open",
          emptyProjects: "No projects yet",
          emptyProjectsHint: "Projects will appear here once created.",
          emptyUpdates: "No site updates yet",
          emptyUpdatesHint: "Field updates from engineers and workers will appear here.",
          emptyActivity: "No activity recorded yet",
          loadingLabel: "Loading data...",
          code: "Code",
          progress: "Progress"
        },
    [locale]
  );

  useEffect(() => {
    let alive = true;
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
    return locale === "ar" ? path : `${path}?lang=en`;
  }

  return (
    <section className="app-page dashboard-page">
      <header className="dashboard-command-intro">
        <div className="dashboard-command-intro__copy">
          <span className="section-kicker">{locale === "ar" ? "مركز قيادة العمليات" : "OPERATIONS COMMAND CENTER"}</span>
          <p>{locale === "ar" ? "مرحباً مجدداً" : "Welcome back"}</p>
          <h1>{user.displayName}</h1>
          <span>{user.role === "ADMIN" ? labels.adminLead : labels.portalLead}</span>
        </div>
        <div className="dashboard-command-intro__meta">
          <CalendarDays size={20} />
          <div>
            <strong>{new Date().toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", { weekday: "long", day: "numeric", month: "long" })}</strong>
            <span>{locale === "ar" ? "آخر قراءة من النظام" : "Live system overview"}</span>
          </div>
        </div>
      </header>

      {loading && <LoadingState label={labels.loadingLabel} />}
      {error && <div className="form-error">{error}</div>}

      {dashboard && (
        <>
          <div className="dashboard-kpi-strip">
            <MetricCard icon={<FolderKanban size={18} />} tone="navy" label={labels.active} value={dashboard.activeProjects} />
            <MetricCard icon={<Users2 size={18} />} tone="info" label={labels.clients} value={dashboard.clientCount} />
            <MetricCard icon={<Camera size={18} />} tone="orange" label={labels.updates} value={dashboard.recentUpdates.length} />
            <MetricCard icon={<Briefcase size={18} />} tone="success" label={labels.activity} value={dashboard.recentActivity.length} />
          </div>

          <div className="dashboard-body">
            <div className="dashboard-body__main">
              <div className="section-title">
                <h2>{labels.phases}</h2>
              </div>
              {dashboard.projects.length === 0 ? (
                <EmptyState title={labels.emptyProjects} description={labels.emptyProjectsHint} />
              ) : (
                <div className="data-table" style={{ marginBottom: "var(--space-5)" }}>
                  {dashboard.projects.map((project) => (
                    <Link className="mini-project-row" href={href(`/app/projects/${project.id}`)} key={project.id}>
                      <div className="mini-project-row__id">
                        <strong>{project.name}</strong>
                        <span className="mono">{project.code}</span>
                      </div>
                      <div className="mini-project-row__phase">{phaseLabel(project.phase, locale)}</div>
                      <div className="mini-project-row__progress">
                        <ProgressBar value={project.progress} />
                        <strong>{project.progress}%</strong>
                      </div>
                      <Badge tone={statusTone(project.status)}>{project.client?.user.displayName ?? "-"}</Badge>
                    </Link>
                  ))}
                </div>
              )}

              <div className="section-title">
                <h2>{labels.activity}</h2>
              </div>
              {dashboard.recentActivity.length === 0 ? (
                <EmptyState title={labels.emptyActivity} />
              ) : (
                <div className="activity-list">
                  {dashboard.recentActivity.map((activity) => (
                    <div className="activity-row" key={activity.id}>
                      <span className="activity-row__dot" aria-hidden="true" />
                      <span className="activity-row__body">
                        <strong>{actionLabel(activity.action, locale)}</strong>
                        <span>
                          {activity.actorName ?? "-"} {activity.projectName ? `• ${activity.projectName}` : ""}
                        </span>
                      </span>
                      <time>{new Date(activity.createdAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}</time>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <aside className="dashboard-body__aside">
              <section className="dashboard-quick-panel">
                <div className="section-title">
                  <h2>{locale === "ar" ? "إجراءات سريعة" : "Quick actions"}</h2>
                </div>
                <div className="dashboard-quick-grid">
                  {user.role === "ADMIN" && <Link href={href("/app/admin/projects/new")}><Plus size={19} /><strong>{locale === "ar" ? "مشروع جديد" : "New project"}</strong></Link>}
                  <Link href={href("/app/reports")}><FileText size={19} /><strong>{locale === "ar" ? "مركز التقارير" : "Reports center"}</strong></Link>
                  {(user.role === "ADMIN" || user.role === "ACCOUNTANT") && <Link href={href("/app/finance")}><WalletCards size={19} /><strong>{locale === "ar" ? "الشؤون المالية" : "Project finance"}</strong></Link>}
                  {user.role === "ADMIN" && <Link href={href("/app/admin/users")}><Users2 size={19} /><strong>{locale === "ar" ? "إدارة الفريق" : "Manage team"}</strong></Link>}
                </div>
              </section>
              <section className="dashboard-phase-panel">
                <div className="section-title">
                  <h2>{locale === "ar" ? "توزيع مراحل التنفيذ" : "Delivery phase distribution"}</h2>
                </div>
                <div className="dashboard-phase-list">
                  {(["SITE_INSPECTION", "DESIGN", "PRELIMINARY_ESTIMATION", "EXECUTION", "INITIAL_HANDOVER", "FINAL_HANDOVER"] as const).map((phase) => {
                    const count = dashboard.projects.filter((project) => project.phase === phase).length;
                    return <div key={phase}><span>{phaseLabel(phase, locale)}</span><i><b style={{ width: `${dashboard.projects.length ? Math.max(4, count / dashboard.projects.length * 100) : 0}%` }} /></i><strong>{count}</strong></div>;
                  })}
                </div>
              </section>
              {dashboard.recentUpdates.length > 0 && <section className="dashboard-updates-panel">
                <div className="section-title"><h2>{labels.updates}</h2></div>
                <div className="dashboard-updates">
                  {dashboard.recentUpdates.slice(0, 3).map((update) => (
                    <div className="dashboard-update-card" key={update.id}>
                      <div className="dashboard-update-card__head"><strong>{update.projectName}</strong>{update.mediaCount > 0 && <Badge tone="orange">{update.mediaCount}</Badge>}</div>
                      {update.note && <p>{update.note}</p>}
                      <time>{new Date(update.createdAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}</time>
                    </div>
                  ))}
                </div>
              </section>}
            </aside>
          </div>
        </>
      )}

      {!loading && user.role !== "ADMIN" && (
        <div className="data-table">
          {projects.length === 0 && <EmptyState title={labels.emptyProjects} description={labels.emptyProjectsHint} />}
          {projects.map((project) => (
            <Link className="mini-project-row" href={href(`/app/projects/${project.id}`)} key={project.id}>
              <div className="mini-project-row__id">
                <strong>{project.name}</strong>
                <span className="mono">{project.code}</span>
              </div>
              <div className="mini-project-row__phase">{phaseLabel(project.phase, locale)}</div>
              <div className="mini-project-row__progress">
                <ProgressBar value={project.progress} />
                <strong>{project.progress}%</strong>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
