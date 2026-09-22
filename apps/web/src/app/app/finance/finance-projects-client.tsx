"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, MetricCard, PageHeader, ProgressBar } from "@elhabak/ui";
import { BriefcaseBusiness, CheckCircle2, FolderKanban, TrendingUp, Wallet } from "lucide-react";
import {
  apiRequest,
  formatMoney,
  phaseLabel,
  statusLabel,
  statusTone,
  type FinanceProjectListItem
} from "../../../lib/api";

export function FinanceProjectsClient() {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const [projects, setProjects] = useState<FinanceProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const labels = useMemo(
    () =>
      ar
        ? {
          title: "الشؤون المالية للمشاريع",
          lead: "اختر مشروعاً لعرض المقايسة وجدول الكميات والمصروفات والدفعات.",
          empty: "لا توجد مشاريع مسجلة",
          emptyHint: "سيظهر هنا أي مشروع بعد إنشائه.",
          client: "العميل",
          loading: "جاري تحميل المشاريع...",
          contract: "العقد", paid: "المحصل", outstanding: "المتبقي", notSet: "غير محدد", overpaid: "تحصيل زائد"
        }
        : {
          title: "Project Finance",
          lead: "Choose a project to review its estimate, BOQ, expenses, and payments.",
          empty: "No projects registered",
          emptyHint: "Any created project will appear here.",
          client: "Client",
          loading: "Loading projects...",
          contract: "Contract", paid: "Collected", outstanding: "Outstanding", notSet: "Not set", overpaid: "Overpaid"
        },
    [ar]
  );

  useEffect(() => {
    let alive = true;
    apiRequest<FinanceProjectListItem[]>("/finance/projects")
      .then((result) => {
        if (alive) setProjects(result);
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
    return ar ? path : `${path}?lang=en`;
  }

  const activeCount = projects.filter((project) => project.status === "ACTIVE").length;
  const completedCount = projects.filter((project) => project.status === "COMPLETED").length;
  const averageProgress = projects.length ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length) : 0;

  return (
    <section className="app-page finance-portfolio-page">
      <PageHeader eyebrow={<span className="page-header__eyebrow-code">{ar ? "المتابعة المالية للمشاريع" : "Cost Control & Portfolio"}</span>} title={labels.title} description={labels.lead} />
      {error && <div className="form-error">{error}</div>}
      {loading && <LoadingState label={labels.loading} />}
      {!loading && projects.length === 0 && (
        <EmptyState icon={<Wallet size={20} />} title={labels.empty} description={labels.emptyHint} />
      )}
      {!loading && projects.length > 0 && <>
        <div className="finance-portfolio-kpis">
          <MetricCard icon={<FolderKanban size={18} />} tone="navy" label={ar ? "المشاريع المالية" : "Finance workspaces"} value={projects.length} />
          <MetricCard icon={<BriefcaseBusiness size={18} />} tone="orange" label={ar ? "مشاريع نشطة" : "Active projects"} value={activeCount} />
          <MetricCard icon={<TrendingUp size={18} />} tone="info" label={ar ? "متوسط تقدم التنفيذ" : "Average delivery progress"} value={`${averageProgress}%`} />
          <MetricCard icon={<CheckCircle2 size={18} />} tone="success" label={ar ? "مشاريع مكتملة" : "Completed projects"} value={completedCount} />
        </div>
        <div className="finance-portfolio-heading">
          <div><span className="section-kicker">{ar ? "محافظ التكلفة" : "COST PORTFOLIOS"}</span><h2>{ar ? "اختر مساحة العمل المالية" : "Select a financial workspace"}</h2></div>
          <span>{projects.length} {ar ? "مشروع" : "projects"}</span>
        </div>
        <div className="finance-portfolio-grid finance-portfolio-register">
          {projects.map((project) => {
            const overpaid = project.outstandingBalance !== null && project.outstandingBalance.trim().startsWith("-");
            return (
              <Link href={href(`/app/projects/${project.id}/finance`)} key={project.id}>
                <div className="finance-portfolio-card__identity"><span className="mono"><bdi>{project.code}</bdi></span><h3>{project.name}</h3></div>
                <Badge tone={statusTone(project.status)}>{statusLabel(project.status, locale)}</Badge>
                <span>{labels.client}: {project.client?.user.displayName ?? "—"}</span>
                <div className="finance-portfolio-card__finance">
                  <span><small>{labels.contract}</small><bdi className="mono">{project.contractValue !== null ? formatMoney(project.contractValue, "EGP", locale) : labels.notSet}</bdi></span>
                  <span><small>{labels.paid}</small><bdi className="mono">{formatMoney(project.clientPaymentsTotal, "EGP", locale)}</bdi></span>
                  <span className={overpaid ? "finance-portfolio-card__overpaid" : ""}>
                    <small>{overpaid ? labels.overpaid : labels.outstanding}</small>
                    <bdi className="mono">{project.outstandingBalance !== null ? formatMoney(project.outstandingBalance, "EGP", locale) : "—"}</bdi>
                  </span>
                </div>
                <div className="finance-portfolio-card__phase"><span>{phaseLabel(project.phase, locale)}</span><strong>{project.progress}%</strong></div>
                <ProgressBar value={project.progress} />
                <b>{ar ? "فتح التحكم المالي" : "Open cost control"}</b>
              </Link>
            );
          })}
        </div>
      </>}
    </section>
  );
}
