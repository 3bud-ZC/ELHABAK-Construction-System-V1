"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { dataOpsExportUrl } from "../../../lib/api";

type Dataset = "projects" | "clients" | "users" | "boq" | "payments" | "documents" | "designs";

const PROJECT_SCOPED: Dataset[] = ["boq", "payments", "documents", "designs"];

type ExportsPanelProps = {
  locale: "ar" | "en";
  role: string;
  projects: Array<{ id: string; code: string | null; name: string }>;
};

export function ExportsPanel({ locale, role, projects }: ExportsPanelProps) {
  const ar = locale === "ar";
  const isAdmin = role === "ADMIN";
  const isAccountant = role === "ACCOUNTANT";
  const isEngineer = role === "ENGINEER";
  const isClient = role === "CLIENT";

  const datasets = useMemo(() => {
    const list: Array<{ id: Dataset; label: string; hint: string }> = [];
    if (isAdmin) {
      list.push(
        { id: "projects", label: ar ? "سجل المشاريع" : "Projects register", hint: ar ? "كل المشاريع مع العميل والمهندس والمرحلة" : "All projects with client, engineer, phase" },
        { id: "clients", label: ar ? "سجل العملاء" : "Clients register", hint: ar ? "العملاء مع بيانات الاتصال وعدد المشاريع" : "Clients with contact data and project counts" },
        { id: "users", label: ar ? "سجل المستخدمين" : "Users register", hint: ar ? "المستخدمون مع الأدوار وحالة الحساب" : "Users with roles and account status" }
      );
    }
    if (isAdmin || isAccountant || isEngineer || isClient) {
      list.push(
        { id: "boq", label: ar ? "جدول الكميات" : "Bill of quantities", hint: ar ? "بنود مشروع محدد بقيم دقيقة" : "Exact-valued items for a chosen project" },
        { id: "documents", label: ar ? "سجل المستندات" : "Documents register", hint: ar ? "فهرس المستندات مع الإصدار والحالة" : "Document index with version and status" },
        { id: "designs", label: ar ? "سجل التصميمات" : "Designs register", hint: ar ? "عناصر التصميم مع آخر مراجعة" : "Design items with latest revision" }
      );
    }
    if (isAdmin || isAccountant) {
      list.push({ id: "payments", label: ar ? "سجل المدفوعات" : "Payments register", hint: ar ? "مدفوعات العميل والمقاولين لمشروع" : "Client and contractor payments for a project" });
    }
    return list;
  }, [ar, isAdmin, isAccountant, isEngineer, isClient]);

  const labels = useMemo(
    () =>
      ar
        ? {
          dataset: "مجموعة البيانات",
          format: "الصيغة",
          project: "المشروع",
          chooseProject: "اختر مشروعاً",
          download: "تنزيل",
          note: "التصدير يحترم صلاحياتك — لا تُصدَّر بيانات داخلية للعميل أبداً.",
          pickProject: "اختر مشروعاً لتفعيل التنزيل"
        }
        : {
          dataset: "Dataset",
          format: "Format",
          project: "Project",
          chooseProject: "Choose a project",
          download: "Download",
          note: "Exports respect your permissions — internal data is never exported to clients.",
          pickProject: "Choose a project to enable download"
        },
    [ar]
  );

  const [dataset, setDataset] = useState<Dataset>(datasets[0]?.id ?? "boq");
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [projectId, setProjectId] = useState("");

  const needsProject = PROJECT_SCOPED.includes(dataset);
  const ready = !needsProject || !!projectId;

  return (
    <div className="import-wizard">
      <div className="form-grid">
        <label className="ui-field">
          <span>{labels.dataset}</span>
          <select value={dataset} onChange={(event) => setDataset(event.target.value as Dataset)}>
            {datasets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span>{labels.format}</span>
          <select value={format} onChange={(event) => setFormat(event.target.value as "xlsx" | "csv")}>
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="csv">CSV (.csv)</option>
          </select>
        </label>
        {needsProject && (
          <label className="ui-field">
            <span>
              {labels.project} <strong className="required-star">*</strong>
            </span>
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              <option value="">{labels.chooseProject}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code ? `${project.code} · ` : ""}
                  {project.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <p className="field-hint">{datasets.find((item) => item.id === dataset)?.hint}</p>
      <p className="field-hint">{labels.note}</p>

      <div className="form-actions-bar">
        {ready ? (
          <a
            className="ui-button ui-button--primary"
            href={dataOpsExportUrl(dataset, format, needsProject ? projectId : undefined)}
          >
            <FileSpreadsheet size={14} /> {labels.download}
          </a>
        ) : (
          <span className="field-hint">{labels.pickProject}</span>
        )}
      </div>
    </div>
  );
}
