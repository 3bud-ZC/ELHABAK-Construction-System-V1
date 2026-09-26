"use client";

import { FileText, Search, Wallet } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, OperationsGrid, OperationsMetric, OperationsPanel, ProgressBar } from "@elhabak/ui";
import {
  apiRequest,
  phaseLabel,
  statusLabel,
  statusTone,
  type ReportProjectIdentity
} from "../../../lib/api";
import { useCurrentUser } from "../../../lib/user-context";
import { FinanceReportBuilder } from "./finance-report-builder";

type CenterTab = "projects" | "finance";

export function ReportsClient() {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const user = useCurrentUser();
  const canFinance = user.role === "ADMIN" || user.role === "ACCOUNTANT";
  const [tab, setTab] = useState<CenterTab>(searchParams.get("builder") === "finance" && canFinance ? "finance" : "projects");
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<ReportProjectIdentity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const labels = useMemo(
    () =>
      ar
        ? {
          title: "مركز التقارير",
          lead: "تقارير هندسية ومالية موحدة مبنية على بيانات النظام المسجلة وصلاحيات حسابك.",
          projectReports: "تقارير المشاريع",
          financeReport: "التقرير المالي",
          search: "ابحث باسم المشروع أو الكود أو العميل أو الموقع",
          empty: "لا توجد مشاريع مطابقة",
          hint: "عدّل عبارة البحث أو تحقق من المشاريع المتاحة لحسابك.",
          loading: "جاري تحميل مركز التقارير...",
          open: "فتح التقرير",
          failed: "تعذر تحميل مركز التقارير. حاول مرة أخرى.",
          projectsLead: "تقرير تنفيذي لكل مشروع: التقدم والتصاميم والمستندات والمالية وفق صلاحياتك.",
          financeLead: "تقرير مالي مرن عبر مشروع أو مجموعة مشاريع أو المحفظة كاملة.",
          siteOps: "عمليات الموقع",
          designReviews: "التصميم / المراجعات",
          documents: "المستندات"
        }
        : {
          title: "Reports Center",
          lead: "Consolidated engineering and financial reports built from persisted system data and your account permissions.",
          projectReports: "Project Reports",
          financeReport: "Financial Report",
          search: "Search project, code, client, or location",
          empty: "No matching projects",
          hint: "Adjust the search or check the projects available to your account.",
          loading: "Loading reports center...",
          open: "Open report",
          failed: "Reports Center could not be loaded. Try again.",
          projectsLead: "An executive report per project: progress, designs, documents, and finance within your permissions.",
          financeLead: "A flexible financial report across one project, a selected set, or the full portfolio.",
          siteOps: "Site Operations",
          designReviews: "Design / Reviews",
          documents: "Documents"
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
      <div className="admin-command-strip">
        <div>
          <span className="section-kicker">{ar ? "مركز التقارير التنفيذية" : "Executive Reports Center"}</span>
          <strong>{labels.title}</strong>
          <span className="admin-command-strip__subtitle">{labels.lead}</span>
        </div>
        {!loading && tab === "projects" && (
          <div className="admin-command-strip__meta">
            <span>{ar ? "مشاريع قابلة للتقرير" : "Reportable projects"}</span>
            <strong>{projects.length}</strong>
          </div>
        )}
      </div>

      {canFinance && (
        <nav className="finance-subtabs finance-module-tabs reports-center__tabs" aria-label={ar ? "أنواع التقارير" : "Report types"}>
          <button type="button" className={tab === "projects" ? "active" : ""} onClick={() => setTab("projects")}>
            <FileText size={14} /> {labels.projectReports}
          </button>
          <button type="button" className={tab === "finance" ? "active" : ""} onClick={() => setTab("finance")}>
            <Wallet size={14} /> {labels.financeReport}
          </button>
        </nav>
      )}

      <OperationsPanel
        className="reports-category-workspace"
        eyebrow={ar ? "تصنيف التقارير" : "REPORT CATEGORIES"}
        title={ar ? "مساحة عمل التقارير" : "Reporting workspace"}
        description={ar ? "اختر التقرير حسب نطاق القرار: مشروع، مالية، موقع، تصميم، أو مستندات." : "Choose the report by decision scope: project, finance, site, design, or documents."}
      >
        <OperationsGrid columns="repeat(5, minmax(140px, 1fr))">
          <OperationsMetric tone={tab === "projects" ? "navy" : "neutral"} label={labels.projectReports} value={<bdi>{projects.length}</bdi>} hint={labels.projectsLead} />
          {canFinance && <OperationsMetric tone={tab === "finance" ? "navy" : "neutral"} label={labels.financeReport} value={ar ? "محفظة" : "Portfolio"} hint={labels.financeLead} />}
          <OperationsMetric tone="neutral" label={labels.siteOps} value={ar ? "ميداني" : "Field"} />
          <OperationsMetric tone="neutral" label={labels.designReviews} value={ar ? "اعتماد" : "Reviews"} />
          <OperationsMetric tone="neutral" label={labels.documents} value={ar ? "تحكم" : "Control"} />
        </OperationsGrid>
      </OperationsPanel>

      {tab === "finance" && canFinance && <FinanceReportBuilder locale={locale} />}

      {tab === "projects" && (
        <>
          <div className="reports-toolbar">
            <label className="global-search-field reports-search-field">
              <Search size={18} aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={labels.search}
                aria-label={labels.search}
              />
            </label>
            <span className="reports-toolbar__hint">{labels.projectsLead}</span>
          </div>
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
                <Link className="report-project-card" href={href(`/app/reports/${project.id}`)} key={project.id}>
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
                  <div className="report-project-card__foot">
                    <span className="report-project-card__client">
                      {project.client?.user.displayName ?? "—"}
                    </span>
                    <span className="report-project-card__cta">{labels.open} {ar ? "←" : "→"}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
