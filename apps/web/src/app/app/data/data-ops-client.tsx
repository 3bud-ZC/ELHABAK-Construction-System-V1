"use client";

import { useSearchParams } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Database,
  FileSpreadsheet,
  Images,
  RefreshCw,
  Table2,
  UploadCloud,
  UserRoundPlus
} from "lucide-react";
import { Badge, EmptyState, LoadingState, PageHeader } from "@elhabak/ui";
import {
  apiRequest,
  dataOpsJobLabel,
  formatAppDate,
  type DataOpsJob,
  type DataOpsOverview
} from "../../../lib/api";
import { useCurrentUser } from "../../../lib/user-context";
import { textDirections } from "../../../i18n/translations";
import { ImportWizard } from "./import-wizard";
import { MediaBatchPanel } from "./media-batch";
import { ExportsPanel } from "./exports-panel";

type Tool = "hub" | "clients" | "projects" | "boq" | "media" | "exports";

type ToolCard = {
  id: Tool;
  icon: ReactNode;
  iconClass: string;
  title: string;
  hint: string;
  format: string;
};

export function DataOpsClient() {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const dir = textDirections[locale];
  const user = useCurrentUser();
  const arrow = dir === "rtl" ? <ArrowLeft size={14} /> : <ArrowRight size={14} />;

  const labels = useMemo(
    () =>
      ar
        ? {
          title: "عمليات البيانات",
          lead: "استيراد وتصدير سجلات التشغيل بأمان — معاينة وتحقق قبل أي تغيير.",
          back: "مركز البيانات",
          importClients: "استيراد العملاء",
          importClientsHint: "إنشاء حسابات عملاء من Excel/CSV مع كشف التكرار.",
          importProjects: "استيراد المشاريع",
          importProjectsHint: "إنشاء سجلات مشاريع مع ربط العميل والمهندس.",
          importBoq: "استيراد جدول الكميات",
          importBoqHint: "بنود BOQ بدقة حسابية كاملة لمشروع محدد.",
          importMedia: "استيراد وسائط مجمعة",
          importMediaHint: "رفع صور وفيديوهات الموقع دفعة واحدة مع manifest اختياري.",
          exports: "تصدير السجلات",
          exportsHint: "سجلات المشاريع والعملاء والفريق والكميات والمستندات والتصميمات والمدفوعات — وفق صلاحياتك.",
          exportLead: "سجلات التشغيل جاهزة للتنزيل بصيغ Excel أو CSV.",
          openExports: "فتح التصدير",
          jobs: "سجل الاستيراد",
          jobsLead: "آخر عمليات الاستيراد المسجلة في النظام.",
          noJobs: "لا توجد عمليات استيراد بعد",
          noJobsHint: "ستظهر هنا نتائج الاستيراد والتحقق فور تنفيذها.",
          startImport: "بدء عملية استيراد",
          refresh: "تحديث",
          adminOnly: "هذه الأداة متاحة للمديرين فقط.",
          loadingLabel: "جاري تحميل مركز البيانات...",
          importGroup: "عمليات الاستيراد",
          importLead: "اختيار الملف ← معاينة ← تحقق ← تأكيد",
          exportGroup: "عمليات التصدير",
          toolsMetric: "أدوات استيراد",
          projectsCount: "مشاريع في السجل",
          doneOps: "عمليات مكتملة",
          failedOps: "عمليات فاشلة",
          start: "بدء",
          colOperation: "العملية",
          colResult: "النتيجة",
          colWhen: "التاريخ",
          created: "أُنشئ",
          updated: "حُدّث",
          skipped: "تخطّي",
          failed: "فشل",
          mediaFiles: "ملف",
          siteUpdates: "تحديث",
          actor: "بواسطة"
        }
        : {
          title: "Data Operations",
          lead: "Safely import and export operational registers — preview and validation before any change.",
          back: "Data hub",
          importClients: "Import clients",
          importClientsHint: "Create client accounts from Excel/CSV with duplicate detection.",
          importProjects: "Import projects",
          importProjectsHint: "Create project registers with client and engineer mapping.",
          importBoq: "Import BOQ",
          importBoqHint: "BOQ items with exact arithmetic for a chosen project.",
          importMedia: "Batch media import",
          importMediaHint: "Upload site photos and videos in one batch with an optional manifest.",
          exports: "Export registers",
          exportsHint: "Projects, clients, team, BOQ, documents, designs, and payments registers — within your permissions.",
          exportLead: "Operational registers ready to download as Excel or CSV.",
          openExports: "Open exports",
          jobs: "Import history",
          jobsLead: "Latest import operations recorded by the system.",
          noJobs: "No import operations recorded yet",
          noJobsHint: "Completed import jobs and validation results will appear here.",
          startImport: "Start an import",
          refresh: "Refresh",
          adminOnly: "This tool is available to administrators only.",
          loadingLabel: "Loading data center...",
          importGroup: "Import operations",
          importLead: "Select file → preview → validate → confirm",
          exportGroup: "Export operations",
          toolsMetric: "Import tools",
          projectsCount: "Projects in register",
          doneOps: "Completed operations",
          failedOps: "Failed operations",
          start: "Start",
          colOperation: "Operation",
          colResult: "Result",
          colWhen: "Date",
          created: "created",
          updated: "updated",
          skipped: "skipped",
          failed: "failed",
          mediaFiles: "files",
          siteUpdates: "updates",
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

  const importCards = useMemo(() => {
    if (!overview) return [] as ToolCard[];
    const caps = overview.capabilities;
    const list: ToolCard[] = [];
    if (caps.clients) {
      list.push({
        id: "clients",
        icon: <UserRoundPlus size={18} />,
        iconClass: "",
        title: labels.importClients,
        hint: labels.importClientsHint,
        format: "Excel · CSV"
      });
    }
    if (caps.projects) {
      list.push({
        id: "projects",
        icon: <Table2 size={18} />,
        iconClass: "dataops-tool__icon--info",
        title: labels.importProjects,
        hint: labels.importProjectsHint,
        format: "Excel · CSV"
      });
    }
    if (caps.boq) {
      list.push({
        id: "boq",
        icon: <FileSpreadsheet size={18} />,
        iconClass: "dataops-tool__icon--orange",
        title: labels.importBoq,
        hint: labels.importBoqHint,
        format: "Excel · CSV"
      });
    }
    if (caps.media) {
      list.push({
        id: "media",
        icon: <Images size={18} />,
        iconClass: "dataops-tool__icon--success",
        title: labels.importMedia,
        hint: labels.importMediaHint,
        format: ar ? "صور · فيديو" : "Images · Video"
      });
    }
    return list;
  }, [overview, labels, ar]);

  const canExport = overview?.capabilities.exports === true;

  const failedCount = useMemo(
    () => jobs.filter((job) => job.action.endsWith("_failed")).length,
    [jobs]
  );

  const metrics = useMemo(
    () => [
      { label: labels.toolsMetric, value: importCards.length, tone: undefined as string | undefined },
      { label: labels.projectsCount, value: overview?.projects.length ?? 0, tone: undefined },
      { label: labels.doneOps, value: jobs.length - failedCount, tone: undefined },
      { label: labels.failedOps, value: failedCount, tone: failedCount > 0 ? "danger" : undefined }
    ],
    [labels, importCards.length, overview, jobs.length, failedCount]
  );

  const toolTitle = useMemo(() => {
    const found = importCards.find((card) => card.id === tool);
    if (found) return found.title;
    return tool === "exports" ? labels.exports : labels.title;
  }, [importCards, tool, labels]);

  function jobIcon(action: string) {
    if (action.includes("clients")) return <UserRoundPlus size={15} />;
    if (action.includes("projects")) return <Table2 size={15} />;
    if (action.includes("boq")) return <FileSpreadsheet size={15} />;
    if (action.includes("media")) return <Images size={15} />;
    return <Database size={15} />;
  }

  function jobCounts(job: DataOpsJob): string {
    const meta = job.metadata ?? {};
    const parts: string[] = [];
    const num = (key: string) => (typeof meta[key] === "number" ? (meta[key]) : null);
    const mediaCount = num("mediaCount");
    if (mediaCount !== null) {
      parts.push(`${mediaCount} ${labels.mediaFiles}`);
      const updates = num("updateCount");
      if (updates !== null) parts.push(`${updates} ${labels.siteUpdates}`);
      return parts.join(" · ");
    }
    const pairs: Array<[string, number | null]> = [
      [labels.created, num("created")],
      [labels.updated, num("updated")],
      [labels.skipped, num("skipped")],
      [labels.failed, num("failed")]
    ];
    for (const [label, value] of pairs) {
      if (value !== null && value > 0) parts.push(`${value} ${label}`);
    }
    return parts.join(" · ");
  }

  function formatTimestamp(value: string) {
    return formatAppDate(value, locale, true);
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
        <div className="dataops-console">
          <dl className="dataops-metrics" aria-label={labels.title}>
            {metrics.map((metric) => (
              <div className="dataops-metric" data-tone={metric.tone} key={metric.label}>
                <dt>{metric.label}</dt>
                <dd>{metric.value}</dd>
              </div>
            ))}
          </dl>

          {importCards.length > 0 && (
            <section className="dataops-section" aria-labelledby="dataops-import-h">
              <header className="dataops-section__head">
                <div>
                  <h2 id="dataops-import-h">{labels.importGroup}</h2>
                  <p>{labels.importLead}</p>
                </div>
              </header>
              <div className="dataops-tools">
                {importCards.map((card) => (
                  <button type="button" className="dataops-tool" key={card.id} onClick={() => setTool(card.id)}>
                    <span className={`dataops-tool__icon ${card.iconClass}`}>{card.icon}</span>
                    <span className="dataops-tool__body">
                      <h3>{card.title}</h3>
                      <p>{card.hint}</p>
                    </span>
                    <span className="dataops-tool__foot">
                      <span className="dataops-tool__format">{card.format}</span>
                      <span className="dataops-tool__cta">
                        {labels.start} {arrow}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {canExport && (
            <section className="dataops-section" aria-labelledby="dataops-export-h">
              <header className="dataops-section__head">
                <div>
                  <h2 id="dataops-export-h">{labels.exportGroup}</h2>
                  <p>{labels.exportLead}</p>
                </div>
              </header>
              <div className="dataops-export">
                <span className="dataops-tool__icon dataops-tool__icon--orange">
                  <UploadCloud size={18} />
                </span>
                <div className="dataops-export__body">
                  <h3>{labels.exports}</h3>
                  <p>{labels.exportsHint}</p>
                  <div className="dataops-export__meta">
                    <span className="dataops-chip">Excel (.xlsx)</span>
                    <span className="dataops-chip">CSV</span>
                  </div>
                </div>
                <button type="button" className="ui-button ui-button--primary" onClick={() => setTool("exports")}>
                  {labels.openExports} {arrow}
                </button>
              </div>
            </section>
          )}

          <section className="dataops-section" aria-labelledby="dataops-history-h">
            <header className="dataops-section__head">
              <div>
                <h2 id="dataops-history-h">{labels.jobs}</h2>
                <p>{labels.jobsLead}</p>
              </div>
              <button type="button" className="ui-button ui-button--ghost ui-button--sm" onClick={() => void load()}>
                <RefreshCw size={14} /> {labels.refresh}
              </button>
            </header>
            {jobs.length === 0 ? (
              <div className="dataops-empty">
                <span className="dataops-empty__icon">
                  <Database size={18} />
                </span>
                <div className="dataops-empty__body">
                  <strong>{labels.noJobs}</strong>
                  <p>{labels.noJobsHint}</p>
                </div>
                {importCards.length > 0 && (
                  <button
                    type="button"
                    className="ui-button ui-button--secondary ui-button--sm"
                    onClick={() => setTool(importCards[0]!.id)}
                  >
                    {labels.startImport}
                  </button>
                )}
              </div>
            ) : (
              <div className="jobs-register">
                <div className="jobs-register__head" aria-hidden="true">
                  <span>{labels.colOperation}</span>
                  <span>{labels.colResult}</span>
                  <span>{labels.colWhen}</span>
                </div>
                {jobs.map((job) => {
                  const failedJob = job.action.endsWith("_failed");
                  const counts = jobCounts(job);
                  return (
                    <div className="jobs-register__row" key={job.id}>
                      <span className={`jobs-register__icon${failedJob ? " jobs-register__icon--danger" : ""}`}>
                        {jobIcon(job.action)}
                      </span>
                      <div className="jobs-register__meta">
                        <strong>{dataOpsJobLabel(job.action, locale)}</strong>
                        <span>
                          {job.project ? `${job.project.code ? `${job.project.code} · ` : ""}${job.project.name} · ` : ""}
                          {labels.actor} {job.actor?.displayName ?? "—"}
                          {typeof job.metadata?.fileName === "string" && job.metadata.fileName
                            ? ` · ${job.metadata.fileName}`
                            : ""}
                        </span>
                      </div>
                      {counts ? <span className="jobs-register__counts">{counts}</span> : <span className="jobs-register__counts" />}
                      <Badge tone={failedJob ? "danger" : "success"}>
                        {failedJob ? (ar ? "فشل" : "Failed") : ar ? "تم" : "Done"}
                      </Badge>
                      <time>{formatTimestamp(job.createdAt)}</time>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {(tool === "clients" || tool === "projects" || tool === "boq") && (
        <div className="dataops-workspace">
          <ImportWizard
            type={tool}
            locale={locale}
            projects={projectOptions}
            onDone={() => void load()}
          />
        </div>
      )}

      {tool === "media" && (
        <div className="dataops-workspace">
          <MediaBatchPanel locale={locale} projects={projectOptions} onDone={() => void load()} />
        </div>
      )}

      {tool === "exports" && (
        <div className="dataops-workspace">
          <ExportsPanel locale={locale} role={user.role} projects={projectOptions} />
        </div>
      )}
    </section>
  );
}
