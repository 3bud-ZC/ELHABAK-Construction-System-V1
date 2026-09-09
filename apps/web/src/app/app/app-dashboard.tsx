"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, MetricCard, PageHeader, ProgressBar } from "@elhabak/ui";
import { Briefcase, Camera, FolderKanban, Users2 } from "lucide-react";
import {
  actionLabel,
  apiRequest,
  phaseLabel,
  statusTone,
  type ProjectRecord,
  type UserRecord
} from "../../lib/api";

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
  const [user, setUser] = useState<UserRecord | null>(null);
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
    apiRequest<{ user: UserRecord }>("/auth/me")
      .then(async (me) => {
        if (!alive) return;
        setUser(me.user);
        if (me.user.role === "ADMIN") {
          setDashboard(await apiRequest<DashboardSummary>("/admin/projects/dashboard/summary"));
        } else {
          setProjects(await apiRequest<ProjectRecord[]>("/projects"));
        }
      })
      .catch((requestError: Error) => {
        if (alive) setError(requestError.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  function href(path: string) {
    return locale === "ar" ? path : `${path}?lang=en`;
  }

  return (
    <section className="app-page">
      <PageHeader
        title={labels.title}
        description={user?.role === "ADMIN" ? labels.adminLead : labels.portalLead}
        actions={
          <Link className="ui-button ui-button--primary" href={href(user?.role === "ADMIN" ? "/app/admin/projects" : "/app/projects")}>
            {labels.openProjects}
          </Link>
        }
      />

      {loading && <LoadingState label={labels.loadingLabel} />}
      {error && <div className="form-error">{error}</div>}

      {dashboard && (
        <>
          <div className="metric-grid">
            <MetricCard icon={<FolderKanban size={18} />} tone="navy" label={labels.active} value={dashboard.activeProjects} />
            <MetricCard icon={<Users2 size={18} />} tone="info" label={labels.clients} value={dashboard.clientCount} />
            <MetricCard icon={<Camera size={18} />} tone="orange" label={labels.updates} value={dashboard.recentUpdates.length} />
            <MetricCard icon={<Briefcase size={18} />} tone="success" label={labels.activity} value={dashboard.recentActivity.length} />
          </div>

          <div className="section-title">
            <h2>{labels.phases}</h2>
          </div>
          {dashboard.projects.length === 0 ? (
            <EmptyState title={labels.emptyProjects} description={labels.emptyProjectsHint} />
          ) : (
            <div className="data-table" style={{ marginBottom: "var(--space-6)" }}>
              {dashboard.projects.map((project) => (
                <Link className="mini-project-row" href={href(`/app/admin/projects/${project.id}`)} key={project.id}>
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
        </>
      )}

      {!loading && user?.role !== "ADMIN" && (
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
