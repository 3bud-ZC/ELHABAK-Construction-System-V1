"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, MetricCard, PageHeader, ProgressBar } from "@elhabak/ui";
import { BriefcaseBusiness, CalendarDays, Clock3, Download, Filter, FolderKanban, MapPin, RotateCcw, TrendingUp } from "lucide-react";
import {
  apiRequest,
  categoryLabel,
  dataOpsExportUrl,
  phaseLabel,
  statusLabel,
  statusTone,
  LIFECYCLE_PHASES,
  type ProjectCategory,
  type ProjectPhase,
  type ProjectRecord,
  type ProjectStatus
} from "../../../../lib/api";

const statuses: ProjectStatus[] = ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];
const categories: ProjectCategory[] = ["DESIGN", "CONSTRUCTION", "FINISHING", "GENERAL_CONTRACTING", "FURNITURE", "MIXED"];

export function ProjectsClient() {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "">("");
  const [phase, setPhase] = useState<ProjectPhase | "">("");
  const [category, setCategory] = useState<ProjectCategory | "">("");
  const [clientId, setClientId] = useState("");
  const [engineerId, setEngineerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const labels = useMemo(
    () =>
      locale === "ar"
        ? {
          eyebrow: "إدارة ومتابعة المشاريع",
          title: "سجل المشاريع",
          lead: "مرجع تشغيلي موحد للمشاريع والحالة والمرحلة والفريق المسؤول.",
          create: "إنشاء مشروع",
          search: "بحث بالاسم أو الكود أو العميل",
          allStatuses: "كل الحالات",
          allPhases: "كل المراحل",
          allCategories: "كل الفئات",
          allClients: "كل العملاء",
          allEngineers: "كل المهندسين",
          clear: "مسح الفلاتر",
          result: "نتيجة",
          results: "نتائج",
          empty: "لا توجد مشاريع مطابقة",
          emptyHint: "جرّب تعديل معايير البحث أو أعد ضبط الفلاتر.",
          name: "المشروع",
          client: "العميل",
          engineer: "المهندس المسؤول",
          location: "الموقع",
          phase: "المرحلة الحالية",
          status: "الحالة",
          progress: "الإنجاز",
          schedule: "التسليم المستهدف",
          open: "فتح المشروع",
          openShort: "فتح ←",
          loadingLabel: "جاري تحميل سجل المشاريع...",
          total: "إجمالي المشاريع",
          activeCount: "مشاريع نشطة",
          avgProgress: "متوسط الإنجاز",
          overdue: "تجاوزت الموعد",
          noDate: "غير محدد",
          export: "تصدير"
        }
        : {
          eyebrow: "Project Portfolio Management",
          title: "Project Register",
          lead: "A unified operational reference for projects, state, phase, and responsible teams.",
          create: "Create project",
          search: "Search by name, code, or client",
          allStatuses: "All statuses",
          allPhases: "All phases",
          allCategories: "All categories",
          allClients: "All clients",
          allEngineers: "All engineers",
          clear: "Clear filters",
          result: "result",
          results: "results",
          empty: "No matching projects",
          emptyHint: "Adjust the search criteria or reset the filters.",
          name: "Project",
          client: "Client",
          engineer: "Responsible engineer",
          location: "Location",
          phase: "Current phase",
          status: "Status",
          progress: "Progress",
          schedule: "Target delivery",
          open: "Open project",
          openShort: "Open →",
          loadingLabel: "Loading project register...",
          total: "Total projects",
          activeCount: "Active projects",
          avgProgress: "Average progress",
          overdue: "Past target date",
          noDate: "Not set",
          export: "Export"
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
    return locale === "ar" ? path : `${path}${path.includes("?") ? "&" : "?"}lang=en`;
  }

  function formatDate(value: string | null) {
    if (!value) return labels.noDate;
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(new Date(value));
  }

  const clientOptions = useMemo(
    () => Array.from(new Map(projects.filter((project) => project.client).map((project) => [project.client!.id, project.client!.user.displayName])).entries()),
    [projects]
  );
  const engineerOptions = useMemo(
    () => Array.from(new Map(projects.filter((project) => project.engineer).map((project) => [project.engineer!.id, project.engineer!.displayName])).entries()),
    [projects]
  );
  const visibleProjects = useMemo(
    () => projects.filter((project) =>
      (!phase || project.phase === phase) &&
      (!category || project.category === category) &&
      (!clientId || project.client?.id === clientId) &&
      (!engineerId || project.engineer?.id === engineerId)
    ),
    [category, clientId, engineerId, phase, projects]
  );
  const activeCount = useMemo(() => visibleProjects.filter((project) => project.status === "ACTIVE").length, [visibleProjects]);
  const avgProgress = useMemo(
    () => (visibleProjects.length ? Math.round(visibleProjects.reduce((sum, project) => sum + project.progress, 0) / visibleProjects.length) : 0),
    [visibleProjects]
  );
  const overdueCount = useMemo(
    () => visibleProjects.filter((project) => project.targetDate && new Date(project.targetDate) < new Date() && !["COMPLETED", "CANCELLED"].includes(project.status)).length,
    [visibleProjects]
  );
  const hasFilters = Boolean(query || status || phase || category || clientId || engineerId);

  function clearFilters() {
    setQuery("");
    setStatus("");
    setPhase("");
    setCategory("");
    setClientId("");
    setEngineerId("");
  }

  return (
    <section className="app-page projects-register-page">
      <PageHeader
        eyebrow={<span className="page-header__eyebrow-code">{labels.eyebrow}</span>}
        title={labels.title}
        description={labels.lead}
        actions={
          <Link className="ui-button ui-button--primary" href={href("/app/admin/projects/new")}>
            {labels.create}
          </Link>
        }
      />

      {!loading && (
        <div className="project-register-metrics metric-grid">
          <MetricCard icon={<FolderKanban size={17} />} tone="navy" label={labels.total} value={<bdi>{visibleProjects.length}</bdi>} />
          <MetricCard icon={<BriefcaseBusiness size={17} />} tone="orange" label={labels.activeCount} value={<bdi>{activeCount}</bdi>} />
          <MetricCard icon={<TrendingUp size={17} />} tone="success" label={labels.avgProgress} value={<bdi>{avgProgress}%</bdi>} />
          <MetricCard icon={<Clock3 size={17} />} tone="orange" label={labels.overdue} value={<bdi>{overdueCount}</bdi>} />
        </div>
      )}

      <section className="project-register-surface">
        <div className="project-register-toolbar">
          <label className="project-register-search">
            <span className="sr-only">{labels.search}</span>
            <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} />
          </label>
          <div className="project-register-filters">
            <span className="project-register-filter-label"><Filter size={14} /> {locale === "ar" ? "تصفية السجل" : "Filter register"}</span>
            <select className="filter-select" value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | "")}>
              <option value="">{labels.allStatuses}</option>
              {statuses.map((item) => <option value={item} key={item}>{statusLabel(item, locale)}</option>)}
            </select>
            <select className="filter-select" value={phase} onChange={(event) => setPhase(event.target.value as ProjectPhase | "")}>
              <option value="">{labels.allPhases}</option>
              {LIFECYCLE_PHASES.map((item) => <option value={item} key={item}>{phaseLabel(item, locale)}</option>)}
            </select>
            <select className="filter-select" value={category} onChange={(event) => setCategory(event.target.value as ProjectCategory | "")}>
              <option value="">{labels.allCategories}</option>
              {categories.map((item) => <option value={item} key={item}>{categoryLabel(item, locale)}</option>)}
            </select>
            {clientOptions.length > 0 && <select className="filter-select" value={clientId} onChange={(event) => setClientId(event.target.value)}>
              <option value="">{labels.allClients}</option>
              {clientOptions.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
            </select>}
            {engineerOptions.length > 0 && <select className="filter-select" value={engineerId} onChange={(event) => setEngineerId(event.target.value)}>
              <option value="">{labels.allEngineers}</option>
              {engineerOptions.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
            </select>}
          </div>
          <div className="project-register-toolbar__meta">
            <span><bdi>{visibleProjects.length}</bdi> {visibleProjects.length === 1 ? labels.result : labels.results}</span>
            <a className="project-register-clear" href={dataOpsExportUrl("projects", "xlsx")} title={labels.export}>
              <Download size={13} /> {labels.export}
            </a>
            {hasFilters && <button type="button" className="project-register-clear" onClick={clearFilters}><RotateCcw size={13} /> {labels.clear}</button>}
          </div>
        </div>

        {error && <div className="form-error project-register-message">{error}</div>}
        {loading && <LoadingState label={labels.loadingLabel} />}
        {!loading && visibleProjects.length === 0 && (
          <EmptyState icon={<FolderKanban size={20} />} title={labels.empty} description={labels.emptyHint} className="project-register-empty" />
        )}

        {!loading && visibleProjects.length > 0 && (
          <div className="project-register">
            <div className="project-register-head" aria-hidden="true">
              <span>{labels.name}</span><span>{labels.client}</span><span>{labels.engineer}</span><span>{labels.location}</span><span>{labels.phase}</span><span>{labels.status}</span><span>{labels.progress}</span><span>{labels.schedule}</span><span />
            </div>
            {visibleProjects.map((project, index) => (
              <article className="project-register-row" key={project.id}>
                <div className="project-register-cell project-register-cell--identity" data-label={labels.name}>
                  <span className="project-register-row__index mono">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <Link href={href(`/app/projects/${project.id}`)}><strong>{project.name}</strong></Link>
                    <span className="project-code-tag mono"><bdi>{project.code ?? "—"}</bdi></span>
                    <small>{categoryLabel(project.category, locale)}</small>
                  </div>
                </div>
                <div className="project-register-cell" data-label={labels.client}><strong><bdi>{project.client?.user.displayName ?? "—"}</bdi></strong></div>
                <div className="project-register-cell" data-label={labels.engineer}><strong><bdi>{project.engineer?.displayName ?? "—"}</bdi></strong></div>
                <div className="project-register-cell project-register-cell--location" data-label={labels.location}><MapPin size={13} /><span>{project.location ?? "—"}</span></div>
                <div className="project-register-cell" data-label={labels.phase}><Badge tone="navy">{phaseLabel(project.phase, locale)}</Badge></div>
                <div className="project-register-cell" data-label={labels.status}><Badge tone={statusTone(project.status)}>{statusLabel(project.status, locale)}</Badge></div>
                <div className="project-register-cell project-register-cell--progress" data-label={labels.progress}>
                  <div><strong className="mono"><bdi>{project.progress}%</bdi></strong><ProgressBar value={project.progress} tone={project.progress >= 70 ? "success" : "orange"} /></div>
                </div>
                <div className="project-register-cell project-register-cell--date" data-label={labels.schedule}><CalendarDays size={13} /><bdi>{formatDate(project.targetDate)}</bdi></div>
                <div className="project-register-cell project-register-cell--action" data-label={labels.open}><Link className="project-register-open" href={href(`/app/projects/${project.id}`)} aria-label={`${labels.open}: ${project.name}`}>{labels.openShort}</Link></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
