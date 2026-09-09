"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiRequest, categoryLabel, phaseLabel, statusLabel, type ProjectRecord } from "../../../../lib/api";

export function ProjectsClient() {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const labels = useMemo(
    () =>
      locale === "ar"
        ? {
            title: "المشاريع",
            lead: "إدارة المشاريع والمرحلة والتقدم والفريق من قاعدة البيانات الفعلية.",
            create: "إنشاء مشروع",
            search: "بحث بالاسم أو الكود أو العميل",
            empty: "لا توجد مشاريع بعد.",
            client: "العميل",
            engineer: "المهندس",
            phase: "المرحلة",
            status: "الحالة",
            progress: "التقدم",
            open: "فتح"
          }
        : {
            title: "Projects",
            lead: "Manage projects, phase, progress, and team from real database data.",
            create: "Create Project",
            search: "Search by name, code, or client",
            empty: "No projects yet.",
            client: "Client",
            engineer: "Engineer",
            phase: "Phase",
            status: "Status",
            progress: "Progress",
            open: "Open"
          },
    [locale]
  );

  useEffect(() => {
    let alive = true;
    const path = query.trim() ? `/admin/projects?search=${encodeURIComponent(query.trim())}` : "/admin/projects";
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
  }, [query]);

  function href(path: string) {
    return locale === "ar" ? path : `${path}?lang=en`;
  }

  return (
    <section className="app-page">
      <div className="page-heading page-heading--row">
        <div>
          <h1>{labels.title}</h1>
          <p>{labels.lead}</p>
        </div>
        <Link className="ui-button ui-button--primary" href={href("/app/admin/projects/new")}>
          {labels.create}
        </Link>
      </div>

      <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} />
      {error && <div className="form-error">{error}</div>}
      {loading && <div className="empty-state">{locale === "ar" ? "جاري التحميل..." : "Loading..."}</div>}
      {!loading && projects.length === 0 && <div className="empty-state">{labels.empty}</div>}

      <div className="data-table">
        {projects.map((project) => (
          <article className="data-row project-row" key={project.id}>
            <div>
              <strong>{project.name}</strong>
              <span>{project.code}</span>
            </div>
            <div>
              <strong>{labels.client}</strong>
              <span>{project.client?.user.displayName ?? "-"}</span>
            </div>
            <div>
              <strong>{labels.engineer}</strong>
              <span>{project.engineer?.displayName ?? "-"}</span>
            </div>
            <div>
              <strong>{categoryLabel(project.category, locale)}</strong>
              <span>{labels.phase}: {phaseLabel(project.phase, locale)}</span>
            </div>
            <div>
              <strong>{statusLabel(project.status, locale)}</strong>
              <span>{labels.progress}: {project.progress}%</span>
            </div>
            <Link className="ui-button ui-button--secondary" href={href(`/app/admin/projects/${project.id}`)}>
              {labels.open}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
