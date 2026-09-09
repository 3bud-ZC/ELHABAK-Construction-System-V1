"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, PageHeader, ProgressBar } from "@elhabak/ui";
import { FolderKanban } from "lucide-react";
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
            loadingLabel: "جاري تحميل المشاريع..."
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
            loadingLabel: "Loading projects..."
          },
    [locale]
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
        <div className="data-table">
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
              <div>
                <strong>{project.name}</strong>
                <span className="mono">{project.code}</span>
              </div>
              <div>
                <strong>{project.client?.user.displayName ?? "-"}</strong>
                <span>{categoryLabel(project.category, locale)}</span>
              </div>
              <div>
                <strong>{project.engineer?.displayName ?? "-"}</strong>
              </div>
              <div>
                <Badge tone="navy">{phaseLabel(project.phase, locale)}</Badge>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ProgressBar value={project.progress} style={{ flex: "1 1 auto" }} />
                <strong style={{ color: "var(--navy)", fontSize: "0.8rem", flex: "0 0 auto" }}>{project.progress}%</strong>
              </div>
              <span className="data-row-action">
                <Badge tone={statusTone(project.status)} style={{ marginInlineEnd: "0.5rem" }}>
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
