"use client";

import { FileText, FolderKanban, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, MetricCard, PageHeader, ProgressBar } from "@elhabak/ui";
import {
  apiRequest,
  phaseLabel,
  statusLabel,
  statusTone,
  type ReportProjectIdentity
} from "../../../lib/api";

export function ReportsClient() {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<ReportProjectIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const labels = useMemo(
    () =>
      ar
        ? {
          title: "مركز التقارير",
          lead: "تقارير هندسية موحدة مبنية على بيانات المشاريع المسجلة وصلاحيات حسابك.",
          search: "ابحث باسم المشروع أو الكود أو العميل أو الموقع",
          empty: "لا توجد مشاريع مطابقة",
          hint: "عدّل عبارة البحث أو تحقق من المشاريع المتاحة لحسابك.",
          loading: "جاري تحميل المشاريع...",
          open: "فتح التقرير",
          failed: "تعذر تحميل مركز التقارير. حاول مرة أخرى."
        }
        : {
          title: "Reports Center",
          lead: "Consolidated engineering reports built from persisted project data and your account permissions.",
          search: "Search project, code, client, or location",
          empty: "No matching projects",
          hint: "Adjust the search or check the projects available to your account.",
          loading: "Loading projects...",
          open: "Open report",
          failed: "Reports Center could not be loaded. Try again."
        },
    [ar]
  );

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      const path = `/reports/projects${query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ""}`;
      apiRequest<ReportProjectIdentity[]>(path)
        .then((result) => {
          if (active) {
            setProjects(result);
            setError("");
          }
        })
        .catch(() => {
          if (active) setError(labels.failed);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [labels.failed, query]);

  const href = (path: string) => (ar ? path : `${path}?lang=en`);
  return (
    <section className="app-page reports-center">
      <PageHeader title={labels.title} description={labels.lead} />

      {!loading && (
        <div className="metric-grid">
          <MetricCard icon={<FolderKanban size={18} />} tone="navy" label={ar ? "مشاريع قابلة للتقرير" : "Reportable projects"} value={projects.length} />
        </div>
      )}

      <label className="global-search-field reports-search-field">
        <Search size={18} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={labels.search}
          aria-label={labels.search}
        />
      </label>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {loading && <LoadingState label={labels.loading} />}
      {!loading && !projects.length && (
        <EmptyState icon={<FileText size={20} />} title={labels.empty} description={labels.hint} />
      )}
      {!loading && projects.length > 0 && (
        <div className="report-project-grid">
          {projects.map((project) => (
            <article className="report-project-card" key={project.id}>
              <div className="report-project-card__head">
                <div>
                  <strong>{project.name}</strong>
                  <bdi className="mono">{project.code ?? "—"}</bdi>
                </div>
                <Badge tone={statusTone(project.status)}>
                  {statusLabel(project.status, locale)}
                </Badge>
              </div>
              <div className="report-project-card__phase">
                <span>{phaseLabel(project.phase, locale)}</span>
                <strong>
                  <bdi>{project.progress}%</bdi>
                </strong>
              </div>
              <ProgressBar value={project.progress} />
              <span className="report-project-card__client">
                {project.client?.user.displayName ?? "—"}
              </span>
              <Link
                className="ui-button ui-button--primary ui-button--sm"
                href={href(`/app/reports/${project.id}`)}
              >
                {labels.open}
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
