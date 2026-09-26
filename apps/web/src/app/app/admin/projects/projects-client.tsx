"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdaptiveFilters, Badge, EmptyState, LoadingState, MetricCard, OperationsHeader, OperationsSurface, ProgressBar, Register, RegisterCell, RegisterRow, type FilterChip } from "@elhabak/ui";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CalendarDays, Clock3, Download, FolderKanban, MapPin, Plus, RotateCcw, TrendingUp } from "lucide-react";
import {
  apiRequest,
  categoryLabel,
  dataOpsExportUrl,
  formatAppDate,
  phaseLabel,
  statusLabel,
  statusTone,
  LIFECYCLE_PHASES,
  type ProjectCategory,
  type ProjectPhase,
  type ProjectRecord,
  type ProjectStatus
} from "../../../../lib/api";
import { filterLabels } from "../../../../lib/adaptive";

const statuses: ProjectStatus[] = ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];
const categories: ProjectCategory[] = ["DESIGN", "CONSTRUCTION", "FINISHING", "GENERAL_CONTRACTING", "FURNITURE", "MIXED"];

export function ProjectsClient() {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const ar = locale === "ar";
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
          category: "الفئة",
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
          category: "Category",
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
    return value ? formatAppDate(value, locale) : labels.noDate;
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
  const filterChips: FilterChip[] = [
    status && { key: "status", label: statusLabel(status, locale), onRemove: () => setStatus("") },
    phase && { key: "phase", label: phaseLabel(phase, locale), onRemove: () => setPhase("") },
    category && { key: "category", label: categoryLabel(category, locale), onRemove: () => setCategory("") },
    clientId && { key: "client", label: clientOptions.find(([id]) => id === clientId)?.[1] ?? labels.client, onRemove: () => setClientId("") },
    engineerId && { key: "engineer", label: engineerOptions.find(([id]) => id === engineerId)?.[1] ?? labels.engineer, onRemove: () => setEngineerId("") }
  ].filter(Boolean) as FilterChip[];

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
      <OperationsHeader
        eyebrow={labels.eyebrow}
        title={labels.title}
        description={labels.lead}
        meta={<span><bdi>{visibleProjects.length}</bdi> {visibleProjects.length === 1 ? labels.result : labels.results}</span>}
        actions={
          <Link className="ui-button ui-button--primary" href={href("/app/admin/projects/new")}>
            <Plus size={16} /> {labels.create}
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

      <OperationsSurface className="project-register-surface">
        <AdaptiveFilters
          className="register-filters"
          labels={filterLabels(locale)}
          chips={filterChips}
          onClear={clearFilters}
          search={
            <label className="register-search">
              <span className="sr-only">{labels.search}</span>
              <input className="search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} />
            </label>
          }
          meta={
            <>
              <span><bdi>{visibleProjects.length}</bdi> {visibleProjects.length === 1 ? labels.result : labels.results}</span>
              <a className="register-toolbar-link" href={dataOpsExportUrl("projects", "xlsx")} title={labels.export}>
                <Download size={16} /> {labels.export}
              </a>
              {hasFilters && <button type="button" className="register-toolbar-link" onClick={clearFilters}><RotateCcw size={16} /> {labels.clear}</button>}
            </>
          }
        >
          <label className="adaptive-filter-field">
            <span className="adaptive-filter-field__label">{labels.status}</span>
            <select className="filter-select" value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | "")} aria-label={labels.status}>
              <option value="">{labels.allStatuses}</option>
              {statuses.map((item) => <option value={item} key={item}>{statusLabel(item, locale)}</option>)}
            </select>
          </label>
          <label className="adaptive-filter-field">
            <span className="adaptive-filter-field__label">{labels.phase}</span>
            <select className="filter-select" value={phase} onChange={(event) => setPhase(event.target.value as ProjectPhase | "")} aria-label={labels.phase}>
              <option value="">{labels.allPhases}</option>
              {LIFECYCLE_PHASES.map((item) => <option value={item} key={item}>{phaseLabel(item, locale)}</option>)}
            </select>
          </label>
          <label className="adaptive-filter-field">
            <span className="adaptive-filter-field__label">{labels.category}</span>
            <select className="filter-select" value={category} onChange={(event) => setCategory(event.target.value as ProjectCategory | "")} aria-label={labels.category}>
              <option value="">{labels.allCategories}</option>
              {categories.map((item) => <option value={item} key={item}>{categoryLabel(item, locale)}</option>)}
            </select>
          </label>
          {clientOptions.length > 0 && <label className="adaptive-filter-field">
            <span className="adaptive-filter-field__label">{labels.client}</span>
            <select className="filter-select" value={clientId} onChange={(event) => setClientId(event.target.value)} aria-label={labels.client}>
              <option value="">{labels.allClients}</option>
              {clientOptions.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
            </select>
          </label>}
          {engineerOptions.length > 0 && <label className="adaptive-filter-field">
            <span className="adaptive-filter-field__label">{labels.engineer}</span>
            <select className="filter-select" value={engineerId} onChange={(event) => setEngineerId(event.target.value)} aria-label={labels.engineer}>
              <option value="">{labels.allEngineers}</option>
              {engineerOptions.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
            </select>
          </label>}
        </AdaptiveFilters>

        {error && <div className="form-error project-register-message">{error}</div>}
        {loading && <LoadingState label={labels.loadingLabel} />}
        {!loading && visibleProjects.length === 0 && (
          <EmptyState icon={<FolderKanban size={20} />} title={labels.empty} description={labels.emptyHint} className="project-register-empty" />
        )}

        {!loading && visibleProjects.length > 0 && (
          <Register
            className="project-register ops-register--projects"
            columns="minmax(200px,2fr) minmax(108px,1fr) minmax(108px,1fr) minmax(96px,.9fr) minmax(100px,.9fr) 92px minmax(108px,1fr) minmax(112px,.9fr) 40px"
            head={<><span>{labels.name}</span><span>{labels.client}</span><span>{labels.engineer}</span><span>{labels.location}</span><span>{labels.phase}</span><span>{labels.status}</span><span>{labels.progress}</span><span>{labels.schedule}</span><span /></>}
          >
            {visibleProjects.map((project) => (
              <RegisterRow className="project-register-row project-record" key={project.id}>
                <RegisterCell className="project-register-cell project-register-cell--identity ops-register__cell--identity" label={labels.name}>
                  <div className="project-record__identity">
                    <Link href={href(`/app/projects/${project.id}`)}><strong dir="auto">{project.name}</strong></Link>
                    <span className="project-record__secondary"><bdi className="project-code-tag mono" dir="ltr">{project.code ?? "—"}</bdi><span>{categoryLabel(project.category, locale)}</span></span>
                    <span className="project-record__facts"><span dir="auto">{project.location ?? "—"}</span><span>·</span><time dateTime={project.targetDate ?? undefined}>{formatDate(project.targetDate)}</time></span>
                  </div>
                </RegisterCell>
                <RegisterCell className="project-register-cell project-record__person" label={labels.client}><strong dir="auto">{project.client?.user.displayName ?? "—"}</strong></RegisterCell>
                <RegisterCell className="project-register-cell project-record__person" label={labels.engineer}><strong dir="auto">{project.engineer?.displayName ?? "—"}</strong></RegisterCell>
                <RegisterCell className="project-register-cell project-register-cell--location" label={labels.location}><MapPin size={13} aria-hidden="true" /><span dir="auto">{project.location ?? "—"}</span></RegisterCell>
                <RegisterCell className="project-register-cell project-record__phase" label={labels.phase}><span>{phaseLabel(project.phase, locale)}</span></RegisterCell>
                <RegisterCell className="project-register-cell project-record__status" label={labels.status}><Badge tone={statusTone(project.status)}>{statusLabel(project.status, locale)}</Badge></RegisterCell>
                <RegisterCell className="project-register-cell project-register-cell--progress" label={labels.progress}>
                  <div><strong className="mono" dir="ltr">{project.progress}%</strong><ProgressBar value={project.progress} tone={project.progress >= 70 ? "success" : "orange"} /></div>
                </RegisterCell>
                <RegisterCell className="project-register-cell project-register-cell--date" label={labels.schedule}><CalendarDays size={13} aria-hidden="true" /><time dateTime={project.targetDate ?? undefined} dir="auto">{formatDate(project.targetDate)}</time></RegisterCell>
                <RegisterCell className="project-register-cell project-register-cell--action"><Link className="project-register-open" href={href(`/app/projects/${project.id}`)} aria-label={`${labels.open}: ${project.name}`}><span className="register-open-label">{labels.open}</span>{ar ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}</Link></RegisterCell>
              </RegisterRow>
            ))}
          </Register>
        )}
      </OperationsSurface>
    </section>
  );
}
