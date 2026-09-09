"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiRequest, phaseLabel, type ProjectRecord, type UserRecord } from "../../lib/api";

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
            title: "لوحة النظام",
            adminLead: "مؤشرات حقيقية من قاعدة بيانات المشاريع.",
            portalLead: "مشاريعك المصرح بها فقط.",
            active: "المشاريع النشطة",
            clients: "العملاء",
            phases: "المراحل والتقدم",
            updates: "آخر تحديثات الموقع",
            activity: "آخر النشاط",
            openProjects: "فتح المشاريع",
            empty: "لا توجد بيانات مشاريع بعد."
          }
        : {
            title: "Dashboard",
            adminLead: "Real project data from the database.",
            portalLead: "Only projects you are allowed to access.",
            active: "Active projects",
            clients: "Clients",
            phases: "Phases and progress",
            updates: "Recent site updates",
            activity: "Recent activity",
            openProjects: "Open projects",
            empty: "No project data yet."
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
      <div className="page-heading page-heading--row">
        <div>
          <h1>{labels.title}</h1>
          <p>{user?.role === "ADMIN" ? labels.adminLead : labels.portalLead}</p>
        </div>
        <Link className="ui-button ui-button--primary" href={href(user?.role === "ADMIN" ? "/app/admin/projects" : "/app/projects")}>
          {labels.openProjects}
        </Link>
      </div>
      {loading && <div className="empty-state">{locale === "ar" ? "جاري التحميل..." : "Loading..."}</div>}
      {error && <div className="form-error">{error}</div>}
      {dashboard && (
        <>
          <div className="metric-grid">
            <div className="metric-card"><span>{labels.active}</span><strong>{dashboard.activeProjects}</strong></div>
            <div className="metric-card"><span>{labels.clients}</span><strong>{dashboard.clientCount}</strong></div>
          </div>
          <section className="updates-panel">
            <h2>{labels.phases}</h2>
            {dashboard.projects.length === 0 && <div className="empty-state">{labels.empty}</div>}
            {dashboard.projects.map((project) => (
              <article className="update-card" key={project.id}>
                <strong>{project.name}</strong>
                <span>{phaseLabel(project.phase, locale)} - {project.progress}%</span>
                <div className="progress-track"><span style={{ width: `${project.progress}%` }} /></div>
              </article>
            ))}
          </section>
          <section className="updates-panel">
            <h2>{labels.updates}</h2>
            {dashboard.recentUpdates.length === 0 && <div className="empty-state">{labels.empty}</div>}
            {dashboard.recentUpdates.map((update) => (
              <article className="update-card" key={update.id}>
                <strong>{update.projectName}</strong>
                <span>{new Date(update.createdAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} - {update.mediaCount}</span>
                <p>{update.note || "-"}</p>
              </article>
            ))}
          </section>
          <section className="updates-panel">
            <h2>{labels.activity}</h2>
            {dashboard.recentActivity.map((activity) => (
              <article className="update-card" key={activity.id}>
                <strong>{activity.action}</strong>
                <span>{activity.actorName ?? "-"} / {activity.projectName ?? "-"}</span>
              </article>
            ))}
          </section>
        </>
      )}
      {!loading && user?.role !== "ADMIN" && (
        <div className="data-table">
          {projects.length === 0 && <div className="empty-state">{labels.empty}</div>}
          {projects.map((project) => (
            <article className="data-row project-row" key={project.id}>
              <div><strong>{project.name}</strong><span>{project.code}</span></div>
              <div><strong>{phaseLabel(project.phase, locale)}</strong><span>{project.progress}%</span></div>
              <Link className="ui-button ui-button--secondary" href={href(`/app/projects/${project.id}`)}>{labels.openProjects}</Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
