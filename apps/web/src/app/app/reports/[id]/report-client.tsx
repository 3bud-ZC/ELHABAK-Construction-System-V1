"use client";

import { Download, FileText } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, ProgressBar } from "@elhabak/ui";
import {
  activityLabel,
  apiRequest,
  categoryLabel,
  designStatusLabel,
  disciplineLabel,
  documentCategoryLabel,
  documentStatusLabel,
  formatAppDate,
  formatMoney,
  phaseLabel,
  reportPdfUrl,
  siteUpdateTypeLabel,
  statusLabel,
  statusTone,
  type ProjectReport
} from "../../../../lib/api";

export function ReportClient() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const [report, setReport] = useState<ProjectReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // null = every section; a Set holds the explicit inclusion list for refetch.
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const labels = useMemo(
    () =>
      ar
        ? {
            title: "تقرير المشروع",
            lead: "عرض موحد وآمن للبيانات المسجلة في وحدات المشروع.",
            export: "تصدير PDF بالعربية",
            identity: "بيانات المشروع",
            operations: "عمليات الموقع",
            updates: "تحديثات الموقع",
            design: "التصميمات",
            finance: "الملخص المالي",
            documents: "المستندات",
            activity: "سجل النشاط",
            communication: "بيانات التواصل",
            client: "العميل",
            engineer: "المهندس",
            location: "الموقع",
            category: "التصنيف",
            phase: "المرحلة",
            status: "الحالة",
            start: "البدء",
            target: "المستهدف",
            revision: "المراجعة",
            messages: "عدد الرسائل",
            lastMessage: "آخر رسالة",
            noData: "لا توجد بيانات مسجلة لهذا القسم.",
            sectionPicker: "أقسام التقرير",
            failed: "تعذر تحميل التقرير أو لا تملك صلاحية عرضه.",
            loading: "جاري إعداد التقرير...",
            internal: "داخلي",
            shared: "متاح للعميل",
            executiveSummary: "الملخص التنفيذي",
            projectInformation: "بيانات المشروع",
            financialPosition: "الموقف المالي",
            activityCommunication: "النشاط / التواصل",
            timelineAudit: "الجدول الزمني / التدقيق"
          }
        : {
            title: "Project Report",
            lead: "A consolidated, permission-safe view of persisted project module data.",
            export: "Export English PDF",
            identity: "Project Identity",
            operations: "Site Operations",
            updates: "Site updates",
            design: "Design Register",
            finance: "Financial Summary",
            documents: "Document Register",
            activity: "Activity History",
            communication: "Communication Metadata",
            client: "Client",
            engineer: "Engineer",
            location: "Location",
            category: "Category",
            phase: "Phase",
            status: "Status",
            start: "Start",
            target: "Target",
            revision: "Revision",
            messages: "Message count",
            lastMessage: "Last message",
            noData: "No persisted data is available for this section.",
            sectionPicker: "Report sections",
            failed: "The report could not be loaded or you are not authorized to view it.",
            loading: "Preparing report...",
            internal: "Internal",
            shared: "Client shared",
            executiveSummary: "Executive Summary",
            projectInformation: "Project Information",
            financialPosition: "Financial Position",
            activityCommunication: "Activity / Communication",
            timelineAudit: "Timeline / Audit"
          },
    [ar]
  );

  const optionalKeys = useMemo(
    () => ["operations", "designs", "finance", "documents", "communication", "activity"],
    []
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    const included = optionalKeys.filter((key) => !excluded.has(key));
    const suffix = included.length === optionalKeys.length ? "" : `?sections=${included.join(",")}`;
    apiRequest<ProjectReport>(`/reports/projects/${params.id}${suffix}`)
      .then((result) => {
        if (active) {
          setReport(result);
          setError("");
        }
      })
      .catch(() => {
        if (active) setError(labels.failed);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [labels.failed, params.id, excluded, optionalKeys]);

  const sectionChips: Array<{ key: string; label: string; gated: boolean }> = [
    { key: "operations", label: labels.operations, gated: false },
    { key: "designs", label: labels.design, gated: false },
    { key: "finance", label: labels.finance, gated: true },
    { key: "documents", label: labels.documents, gated: false },
    { key: "communication", label: labels.communication, gated: false },
    { key: "activity", label: labels.activity, gated: false }
  ];
  const canSeeFinance = report?.viewerRole === "ADMIN" || report?.viewerRole === "ACCOUNTANT";
  const includedKeys = optionalKeys.filter((key) => !excluded.has(key));

  if (loading)
    return (
      <section className="app-page">
        <LoadingState label={labels.loading} />
      </section>
    );
  if (!report)
    return (
      <section className="app-page">
        <div className="form-error" role="alert">
          {error || labels.failed}
        </div>
      </section>
    );
  const p = report.project;
  const date = (value: string | null) => (value ? formatAppDate(value, locale) : "—");
  const financeRows = financeEntries(report, locale);

  return (
    <section className="app-page project-report-page">
      <div className="admin-command-strip">
        <div>
          <span className="section-kicker">{ar ? "التقرير التنفيذي للمشروع" : "Project Executive Report"}</span>
          <strong>{`${labels.title}: ${p.name}`}</strong>
          <span className="admin-command-strip__subtitle">{labels.lead}</span>
        </div>
        <a
          className="ui-button ui-button--primary"
          href={reportPdfUrl(
            p.id,
            locale,
            includedKeys.length === optionalKeys.length ? undefined : includedKeys
          )}
        >
          <Download size={17} />
          {labels.export}
        </a>
      </div>
      <div className="report-section-picker" role="group" aria-label={labels.sectionPicker}>
        <span className="report-section-picker__label">{labels.sectionPicker}</span>
        {sectionChips
          .filter((chip) => !chip.gated || canSeeFinance)
          .map((chip) => {
            const on = !excluded.has(chip.key);
            return (
              <button
                key={chip.key}
                type="button"
                aria-pressed={on}
                className={`report-section-chip${on ? " report-section-chip--on" : ""}`}
                onClick={() =>
                  setExcluded((current) => {
                    const next = new Set(current);
                    if (next.has(chip.key)) next.delete(chip.key);
                    else next.add(chip.key);
                    return next;
                  })
                }
              >
                {chip.label}
              </button>
            );
          })}
      </div>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <ReportSection title={labels.executiveSummary} index="01">
        <div className="report-summary-grid">
          <Summary label={labels.status} value={statusLabel(p.status, locale)} />
          <Summary label={labels.phase} value={phaseLabel(p.phase, locale)} />
          <Summary label={ar ? "نسبة الإنجاز" : "Progress"} value={`${p.progress}%`} mono />
          <Summary label={labels.target} value={date(p.targetDate)} mono />
        </div>
      </ReportSection>

      <ReportSection title={labels.projectInformation} index="02">
        <div className="report-identity-card">
          <div className="report-identity-card__title">
            <div>
              <strong>{p.name}</strong>
              <bdi className="mono">{p.code ?? "—"}</bdi>
            </div>
            <Badge tone={statusTone(p.status)}>{statusLabel(p.status, locale)}</Badge>
          </div>
          <div className="report-progress">
            <span>{phaseLabel(p.phase, locale)}</span>
            <ProgressBar value={p.progress} />
            <strong>
              <bdi>{p.progress}%</bdi>
            </strong>
          </div>
          <dl className="report-facts">
            <Fact label={labels.client} value={p.client?.user.displayName} />
            <Fact label={labels.engineer} value={p.engineer?.displayName} />
            <Fact label={labels.location} value={p.location} />
            <Fact label={labels.category} value={categoryLabel(p.category, locale)} />
            <Fact label={labels.start} value={date(p.startDate)} />
            <Fact label={labels.target} value={date(p.targetDate)} />
          </dl>
        </div>
      </ReportSection>

      {report.siteOperations && (
        <ReportSection title={labels.operations} index="03">
          <div className="report-summary-grid">
            <Summary
              label={labels.phase}
              value={phaseLabel(report.siteOperations.currentPhase, locale)}
            />
            <Summary label={labels.updates} value={String(report.siteOperations.updates.length)} />
          </div>
          {report.siteOperations.updates.length ? (
            <div className="report-list">
              {report.siteOperations.updates.map((item) => (
                <article key={item.id}>
                  <div>
                    <Badge tone="navy">{siteUpdateTypeLabel(item.type, locale)}</Badge>
                    <strong>{item.note || labels.noData}</strong>
                  </div>
                  <span>
                    {item.author.displayName} · <bdi>{date(item.createdAt)}</bdi>
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <Empty text={labels.noData} />
          )}
        </ReportSection>
      )}

      {report.designs && (
        <ReportSection title={labels.design} index="04">
          {report.designs.length ? (
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{ar ? "التصميم" : "Design"}</th>
                    <th>{ar ? "التخصص" : "Discipline"}</th>
                    <th>{labels.status}</th>
                    <th>{labels.revision}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.designs.map((item) => (
                    <tr key={item.id}>
                      <td>{item.title}</td>
                      <td>{disciplineLabel(item.discipline, locale)}</td>
                      <td>{designStatusLabel(item.status, locale)}</td>
                      <td>
                        <bdi>REV {String(item.currentRevisionNumber).padStart(2, "0")}</bdi>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text={labels.noData} />
          )}
        </ReportSection>
      )}

      {report.documents && (
        <ReportSection title={labels.documents} index="05">
          {report.documents.length ? (
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>{ar ? "المرجع" : "Reference"}</th>
                    <th>{ar ? "العنوان" : "Title"}</th>
                    <th>{labels.category}</th>
                    <th>{labels.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.documents.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <bdi>{item.reference}</bdi>
                      </td>
                      <td>{item.title}</td>
                      <td>{documentCategoryLabel(item.category, locale)}</td>
                      <td>
                        {documentStatusLabel(item.status, locale)} ·{" "}
                        {item.isClientVisible ? labels.shared : labels.internal}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text={labels.noData} />
          )}
        </ReportSection>
      )}

      {report.finance && (
        <ReportSection title={labels.financialPosition} index="06">
          {financeRows.length ? (
            <div className="report-summary-grid">
              {financeRows.map(([label, value]) => (
                <Summary key={label} label={label} value={value} mono />
              ))}
            </div>
          ) : (
            <Empty text={labels.noData} />
          )}
        </ReportSection>
      )}

      {report.communication && (
        <ReportSection title={labels.activityCommunication} index="07">
          <div className="report-summary-grid">
            <Summary
              label={labels.messages}
              value={String(report.communication.messageCount)}
              mono
            />
            <Summary
              label={labels.lastMessage}
              value={date(report.communication.lastMessageAt)}
              mono
            />
          </div>
        </ReportSection>
      )}
      {report.activity && (
        <ReportSection title={labels.timelineAudit} index="08">
          {report.activity.length ? (
            <div className="report-list">
              {report.activity.map((item) => (
                <article key={item.id}>
                  <strong>{activityLabel(item.action, locale)}</strong>
                  <span>
                    {item.actorName ?? "—"} · <bdi>{date(item.createdAt)}</bdi>
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <Empty text={labels.noData} />
          )}
        </ReportSection>
      )}
    </section>
  );
}

function ReportSection({ title, index, children }: { title: string; index: string; children: ReactNode }) {
  return (
    <section className="report-section">
      <header className="report-section__head">
        <span className="report-section__index mono">{index}</span>
        <h2>{title}</h2>
      </header>
      <div className="report-section__body">{children}</div>
    </section>
  );
}
function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}
function Summary({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="report-summary-card">
      <span>{label}</span>
      <strong className={mono ? "mono" : undefined}>
        <bdi>{value}</bdi>
      </strong>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <EmptyState icon={<FileText size={18} />} title={text} />;
}
function financeEntries(report: ProjectReport, locale: "ar" | "en"): Array<[string, string]> {
  if (!report.finance) return [];
  const labels: Record<string, { ar: string; en: string }> = {
    contractValue: { ar: "قيمة المشروع", en: "Contract value" },
    paidAmount: { ar: "المدفوع", en: "Paid amount" },
    outstandingBalance: { ar: "المتبقي", en: "Outstanding" },
    boqTotal: { ar: "إجمالي جدول الكميات", en: "BOQ total" },
    estimateTotal: { ar: "إجمالي المقايسة", en: "Estimate total" },
    expensesTotal: { ar: "المصروفات الداخلية", en: "Internal expenses" },
    contractorPaymentsTotal: { ar: "دفعات المقاولين", en: "Contractor payments" },
    committedCostTotal: { ar: "إجمالي التكلفة الملتزمة", en: "Committed cost" }
  };
  return Object.entries(labels).flatMap(([key, label]) => {
    const value = (report.finance as unknown as Record<string, unknown>)[key];
    return typeof value === "string"
      ? [[label[locale], formatMoney(value, report.finance!.currency, locale)] as [string, string]]
      : [];
  });
}
