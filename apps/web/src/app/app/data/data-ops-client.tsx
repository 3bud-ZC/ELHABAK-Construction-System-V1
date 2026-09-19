"use client";

import { useSearchParams } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  Database,
  FileSpreadsheet,
  Images,
  RefreshCw,
  Table2,
  UploadCloud,
  UserRoundPlus,
  Wallet
} from "lucide-react";
import { Badge, EmptyState, LoadingState, PageHeader } from "@elhabak/ui";
import {
  apiRequest,
  dataOpsJobLabel,
  type DataOpsJob,
  type DataOpsOverview
} from "../../../lib/api";
import { useCurrentUser } from "../../../lib/user-context";
import { ImportWizard } from "./import-wizard";
import { MediaBatchPanel } from "./media-batch";
import { ExportsPanel } from "./exports-panel";

type Tool = "hub" | "clients" | "projects" | "boq" | "media" | "exports";

export function DataOpsClient() {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const user = useCurrentUser();

  const labels = useMemo(
    () =>
      ar
        ? {
          title: "عمليات البيانات",
          lead: "استيراد وتصدير بيانات التشغيل بأمان — معاينة كاملة قبل أي تغيير.",
          back: "مركز البيانات",
          importClients: "استيراد العملاء",
          importClientsHint: "إنشاء حسابات عملاء من Excel/CSV مع كشف التكرار.",
          importProjects: "استيراد المشاريع",
          importProjectsHint: "إنشاء سجلات مشاريع مع ربط العميل والمهندس.",
          importBoq: "استيراد جدول الكميات",
          importBoqHint: "بنود BOQ بدقة حسابية كاملة لمشروع محدد.",
          importMedia: "استيراد وسائط مجمعة",
          importMediaHint: "رفع صور وفيديوهات الموقع دفعة واحدة مع manifest اختياري.",
          exports: "التصدير",
          exportsHint: "تنزيل سجلات التشغيل بصيغة Excel أو CSV.",
          jobs: "سجل الاستيراد",
          jobsLead: "آخر عمليات الاستيراد المسجلة في النظام.",
          noJobs: "لا توجد عمليات استيراد بعد",
          noJobsHint: "ستظهر هنا عمليات الاستيراد فور تنفيذها.",
          refresh: "تحديث",
          adminOnly: "هذه الأداة متاحة للمديرين فقط.",
          loadingLabel: "جاري تحميل مركز البيانات...",
          mediaAction: "media-batch",
          importAction: "import",
          actor: "بواسطة"
        }
        : {
          title: "Data Operations",
          lead: "Safely import and export operational data — full preview before any change.",
          back: "Data hub",
          importClients: "Import clients",
          importClientsHint: "Create client accounts from Excel/CSV with duplicate detection.",
          importProjects: "Import projects",
          importProjectsHint: "Create project registers with client and engineer mapping.",
          importBoq: "Import BOQ",
          importBoqHint: "BOQ items with exact arithmetic for a chosen project.",
          importMedia: "Batch media import",
          importMediaHint: "Upload site photos and videos in one batch with an optional manifest.",
          exports: "Exports",
          exportsHint: "Download operational registers as Excel or CSV.",
          jobs: "Import history",
          jobsLead: "Latest import operations recorded by the system.",
          noJobs: "No import operations yet",
          noJobsHint: "Import runs will appear here once executed.",
          refresh: "Refresh",
          adminOnly: "This tool is available to administrators only.",
          loadingLabel: "Loading data center...",
          mediaAction: "media batch",
          importAction: "import",
          actor: "by"
        },
    [ar]
  );

  const [overview, setOverview] = useState<DataOpsOverview | null>(null);
  const [jobs, setJobs] = useState<DataOpsJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("hub");

  const load = useCallback(async () => {
    try {
      const [nextOverview, nextJobs] = await Promise.all([
        apiRequest<DataOpsOverview>("/data-ops/overview"),
        apiRequest<DataOpsJob[]>("/data-ops/jobs").catch(() => [] as DataOpsJob[])
      ]);
      setOverview(nextOverview);
      setJobs(nextJobs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = useMemo(() => {
    if (!overview) return [];
    const caps = overview.capabilities;
    const list: Array<{ id: Tool; icon: ReactNode; iconClass: string; title: string; hint: string }> = [];
    if (caps.clients) {
      list.push({
        id: "clients",
        icon: <UserRoundPlus size={19} />,
        iconClass: "",
        title: labels.importClients,
        hint: labels.importClientsHint
      });
    }
    if (caps.projects) {
      list.push({
        id: "projects",
        icon: <Table2 size={19} />,
        iconClass: "dataops-card__icon--info",
        title: labels.importProjects,
        hint: labels.importProjectsHint
      });
    }
    if (caps.boq) {
      list.push({
        id: "boq",
        icon: <FileSpreadsheet size={19} />,
        iconClass: "dataops-card__icon--orange",
        title: labels.importBoq,
        hint: labels.importBoqHint
      });
    }
    if (caps.media) {
      list.push({
        id: "media",
        icon: <Images size={19} />,
        iconClass: "dataops-card__icon--success",
        title: labels.importMedia,
        hint: labels.importMediaHint
      });
    }
    if (caps.exports) {
      list.push({
        id: "exports",
        icon: <UploadCloud size={19} />,
        iconClass: "dataops-card__icon--orange",
        title: labels.exports,
        hint: labels.exportsHint
      });
    }
    return list;
  }, [overview, labels]);

  const toolTitle = useMemo(() => {
    const found = cards.find((card) => card.id === tool);
    return found?.title ?? labels.title;
  }, [cards, tool, labels.title]);

  function formatTimestamp(value: string) {
    return new Intl.DateTimeFormat(ar ? "ar-EG-u-nu-latn" : "en-US", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  }

  if (loading) {
    return (
      <section className="app-page">
        <LoadingState label={labels.loadingLabel} />
      </section>
    );
  }

  if (error) {
    return (
      <section className="app-page">
        <EmptyState icon={<Database size={20} />} title={error} description={labels.adminOnly} />
      </section>
    );
  }

  const projectOptions = overview?.projects ?? [];

  return (
    <section className="app-page">
      <PageHeader
        eyebrow="ELHABAK DATA OPS"
        title={tool === "hub" ? labels.title : toolTitle}
        description={labels.lead}
        actions={
          tool !== "hub" ? (
            <button type="button" className="ui-button ui-button--secondary" onClick={() => setTool("hub")}>
              {labels.back}
            </button>
          ) : undefined
        }
      />

      {tool === "hub" && (
        <>
          <div className="dataops-grid">
            {cards.map((card) => (
              <button type="button" className="dataops-card" key={card.id} onClick={() => setTool(card.id)}>
                <span className={`dataops-card__icon ${card.iconClass}`}>{card.icon}</span>
                <h3>{card.title}</h3>
                <p>{card.hint}</p>
              </button>
            ))}
          </div>

          <section className="console-surface">
            <header className="dashboard-section-heading dashboard-section-heading--compact">
              <div>
                <h2>{labels.jobs}</h2>
                <p>{labels.jobsLead}</p>
              </div>
              <button type="button" className="ui-button ui-button--ghost ui-button--sm" onClick={() => void load()}>
                <RefreshCw size={14} /> {labels.refresh}
              </button>
            </header>
            {jobs.length === 0 ? (
              <EmptyState icon={<Database size={18} />} title={labels.noJobs} description={labels.noJobsHint} />
            ) : (
              <div className="jobs-list">
                {jobs.map((job) => (
                  <div className="job-row" key={job.id}>
                    <Wallet size={16} />
                    <div className="job-row__meta">
                      <strong>{dataOpsJobLabel(job.action, locale)}</strong>
                      <span>
                        {job.project ? `${job.project.name} · ` : ""}
                        {labels.actor} {job.actor?.displayName ?? "—"}
                        {typeof job.metadata?.fileName === "string" ? ` · ${job.metadata.fileName}` : ""}
                      </span>
                    </div>
                    <Badge tone={job.action.endsWith("_failed") ? "danger" : "success"}>
                      {job.action.endsWith("_failed") ? (ar ? "فشل" : "Failed") : ar ? "تم" : "Done"}
                    </Badge>
                    <time>{formatTimestamp(job.createdAt)}</time>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {(tool === "clients" || tool === "projects" || tool === "boq") && (
        <div className="console-surface">
          <ImportWizard
            type={tool}
            locale={locale}
            projects={projectOptions}
            onDone={() => void load()}
          />
        </div>
      )}

      {tool === "media" && (
        <div className="console-surface">
          <MediaBatchPanel locale={locale} projects={projectOptions} onDone={() => void load()} />
        </div>
      )}

      {tool === "exports" && (
        <div className="console-surface">
          <ExportsPanel locale={locale} role={user.role} projects={projectOptions} />
        </div>
      )}
    </section>
  );
}
