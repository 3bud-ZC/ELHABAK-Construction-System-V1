"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, MetricCard, PageHeader, ProgressBar } from "@elhabak/ui";
import { BriefcaseBusiness, FolderKanban, TrendingUp } from "lucide-react";
import {
  apiRequest,
  categoryLabel,
  phaseLabel,
  statusLabel,
  statusTone,
  type ProjectRecord,
  type ProjectStatus
} from "../../../../lib/api";

const statuses: ProjectStatus[] = ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];

export function ProjectsClient() {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const labels = useMemo(
    () =>
      locale === "ar"
        ? {
          title: "المشاريع",
          lead: "متابعة وإدارة جميع المشاريع الجارية والمرحلة والفريق المسؤول.",
          create: "إنشاء مشروع",
          search: "بحث بالاسم أو الكود أو العميل",
          allStatuses: "كل الحالات",
          empty: "لا توجد مشاريع مطابقة",
          emptyHint: "جرّب تعديل البحث أو أنشئ مشروعاً جديداً.",
          name: "المشروع",
          client: "العميل",
          engineer: "المهندس",
          phase: "المرحلة",
          progress: "التقدم",
          open: "فتح",
          loadingLabel: "جاري تحميل المشاريع...",
          total: "إجمالي المشاريع",
          activeCount: "نشطة حالياً",
          avgProgress: "متوسط التقدم"
        }
        : {
          title: "Projects",
          lead: "Track and manage every active project, its phase, and responsible team.",
          create: "Create Project",
          search: "Search by name, code, or client",
          allStatuses: "All statuses",
          empty: "No matching projects",
          emptyHint: "Try a different search or create a new project.",
          name: "Project",
          client: "Client",
          engineer: "Engineer",
          phase: "Phase",
          progress: "Progress",
          open: "Open",
          loadingLabel: "Loading projects...",
          total: "Total projects",
          activeCount: "Currently active",
          avgProgress: "Average progress"
        },
    [locale]
  );

  const activeCount = useMemo(() => projects.filter((project) => project.status === "ACTIVE").length, [projects]);
  const avgProgress = useMemo(
    () => (projects.length ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length) : 0),
    [projects]
  );

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    if (status) params.set("status", status);
    const path = `/admin/projects${params.toString() ? `?${params.toString()}` : ""}`;
    setLoading(true);
    apiRequest<ProjectRecord[]>(path)
      .then((result) => {
        if (alive) {
          setProjects(result);
          setError("");
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
  }, [query, status]);

  function href(path: string) {
    return locale === "ar" ? path : `${path}?lang=en`;
  }

  return (
    <section className="app-page">
      <PageHeader
        title={labels.title}
        description={labels.lead}
        actions={
          <Link className="ui-button ui-button--primary" href={href("/app/admin/projects/new")}>
            {labels.create}
          </Link>
        }
      />

      {!loading && (
        <div className="metric-grid">
          <MetricCard icon={<FolderKanban size={18} />} tone="navy" label={labels.total} value={projects.length} />
          <MetricCard icon={<BriefcaseBusiness size={18} />} tone="orange" label={labels.activeCount} value={activeCount} />
          <MetricCard icon={<TrendingUp size={18} />} tone="success" label={labels.avgProgress} value={`${avgProgress}%`} />
        </div>
      )}

      <div className="table-toolbar">
        <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} />
        <select className="filter-select" value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | "")}>
          <option value="">{labels.allStatuses}</option>
          {statuses.map((item) => (
            <option value={item} key={item}>
              {statusLabel(item, locale)}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="form-error">{error}</div>}
      {loading && <LoadingState label={labels.loadingLabel} />}
      {!loading && projects.length === 0 && (
        <EmptyState icon={<FolderKanban size={20} />} title={labels.empty} description={labels.emptyHint} />
      )}

      {!loading && projects.length > 0 && (
        <div className="data-table data-table--projects">
          <div className="data-table-head project-row">
            <span>{labels.name}</span>
            <span>{labels.client}</span>
            <span>{labels.engineer}</span>
            <span>{labels.phase}</span>
            <span>{labels.progress}</span>
            <span />
          </div>
          {projects.map((project) => (
            <article className="data-row project-row" key={project.id}>
              <div data-label={labels.name}>
                <strong>{project.name}</strong>
                <span className="project-code-tag mono"><bdi>{project.code}</bdi></span>
              </div>
              <div data-label={labels.client}>
                <strong>{project.client?.user.displayName ?? "-"}</strong>
                <span>{categoryLabel(project.category, locale)}</span>
              </div>
              <div data-label={labels.engineer}>
                <strong>{project.engineer?.displayName ?? "-"}</strong>
              </div>
              <div data-label={labels.phase}>
                <Badge tone="navy">{phaseLabel(project.phase, locale)}</Badge>
              </div>
              <div data-label={labels.progress} className="project-row__progress-cell">
                <ProgressBar value={project.progress} />
                <strong className="mono">{project.progress}%</strong>
              </div>
              <span className="data-row-action" data-label={labels.open}>
                <Badge tone={statusTone(project.status)}>
                  {statusLabel(project.status, locale)}
                </Badge>
                <Link className="ui-button ui-button--secondary ui-button--sm" href={href(`/app/projects/${project.id}`)}>
                  {labels.open}
                </Link>
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
