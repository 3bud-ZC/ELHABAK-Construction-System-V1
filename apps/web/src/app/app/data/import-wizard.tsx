"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  XCircle
} from "lucide-react";
import {
  dataOpsImportBody,
  dataOpsTemplateUrl,
  uploadRequest,
  type DataOpsCommitResult,
  type DataOpsDuplicateStrategy,
  type DataOpsImportType,
  type DataOpsPreview
} from "../../../lib/api";
import { FileDropzone, ImportStepper, UploadProgress } from "@elhabak/ui";

type WizardStep = "file" | "map" | "preview" | "commit";

const STEPS = ["file", "map", "preview", "commit"] as const;

type FieldSpec = { key: string; required: boolean; labelAr: string; labelEn: string };

const FIELDS: Record<DataOpsImportType, FieldSpec[]> = {
  clients: [
    { key: "name", required: true, labelAr: "الاسم", labelEn: "Name" },
    { key: "email", required: true, labelAr: "البريد الإلكتروني", labelEn: "Email" },
    { key: "phone", required: false, labelAr: "الهاتف", labelEn: "Phone" },
    { key: "notes", required: false, labelAr: "ملاحظات", labelEn: "Notes" },
    { key: "active", required: false, labelAr: "نشط", labelEn: "Active" }
  ],
  projects: [
    { key: "code", required: true, labelAr: "كود المشروع", labelEn: "Project code" },
    { key: "name", required: true, labelAr: "اسم المشروع", labelEn: "Name" },
    { key: "category", required: true, labelAr: "الفئة", labelEn: "Category" },
    { key: "clientEmail", required: true, labelAr: "بريد العميل", labelEn: "Client email" },
    { key: "engineerEmail", required: true, labelAr: "بريد المهندس", labelEn: "Engineer email" },
    { key: "location", required: false, labelAr: "الموقع", labelEn: "Location" },
    { key: "startDate", required: false, labelAr: "تاريخ البدء", labelEn: "Start date" },
    { key: "targetDate", required: false, labelAr: "تاريخ التسليم", labelEn: "Target date" },
    { key: "phase", required: false, labelAr: "المرحلة", labelEn: "Phase" },
    { key: "progress", required: false, labelAr: "الإنجاز %", labelEn: "Progress %" },
    { key: "status", required: false, labelAr: "الحالة", labelEn: "Status" },
    { key: "notes", required: false, labelAr: "ملاحظات", labelEn: "Notes" }
  ],
  boq: [
    { key: "code", required: true, labelAr: "كود البند", labelEn: "Item code" },
    { key: "section", required: false, labelAr: "القسم", labelEn: "Section" },
    { key: "description", required: true, labelAr: "الوصف", labelEn: "Description" },
    { key: "unit", required: true, labelAr: "الوحدة", labelEn: "Unit" },
    { key: "quantity", required: true, labelAr: "الكمية", labelEn: "Quantity" },
    { key: "unitRate", required: true, labelAr: "سعر الوحدة", labelEn: "Unit rate" },
    { key: "note", required: false, labelAr: "ملاحظة", labelEn: "Note" },
    { key: "sortOrder", required: false, labelAr: "الترتيب", labelEn: "Sort order" }
  ]
};

type WizardLabels = {
  steps: string[];
  dropTitle: string;
  dropHint: string;
  template: string;
  sheet: string;
  mappingTitle: string;
  mappingLead: string;
  unmapped: string;
  skipColumn: string;
  back: string;
  continueToPreview: string;
  previewing: string;
  strategy: string;
  strategyError: string;
  strategySkip: string;
  strategyUpdate: string;
  commit: string;
  committing: string;
  done: string;
  startOver: string;
  total: string;
  valid: string;
  duplicates: string;
  errors: string;
  missing: string;
  row: string;
  issues: string;
  created: string;
  updated: string;
  skipped: string;
  failed: string;
  failures: string;
  duplicateNote: string;
  errorNote: string;
  selectProject: string;
  previewRows: string;
  rePreview: string;
};

function labelsFor(locale: "ar" | "en"): WizardLabels {
  if (locale === "ar") {
    return {
      steps: ["الملف", "الأعمدة", "المعاينة", "التنفيذ"],
      dropTitle: "اختر ملف Excel أو CSV",
      dropHint: "xlsx أو csv — بحد أقصى 8MB و2000 صف",
      template: "تنزيل القالب",
      sheet: "الورقة",
      mappingTitle: "مطابقة الأعمدة",
      mappingLead: "طابق كل حقل مطلوب مع عمود في الملف. الأعمدة غير المطابقة يتم تجاهلها.",
      unmapped: "أعمدة غير مستخدمة",
      skipColumn: "— تجاهل —",
      back: "رجوع",
      continueToPreview: "معاينة الاستيراد",
      previewing: "جاري التحقق...",
      strategy: "استراتيجية التكرار",
      strategyError: "إيقاف عند التكرار",
      strategySkip: "تخطي المكررات",
      strategyUpdate: "تحديث المكررات",
      commit: "تنفيذ الاستيراد",
      committing: "جاري التنفيذ...",
      done: "اكتمل الاستيراد",
      startOver: "استيراد ملف آخر",
      total: "إجمالي الصفوف",
      valid: "صالحة",
      duplicates: "مكررة",
      errors: "بها أخطاء",
      missing: "حقول مطلوبة غير مطابقة",
      row: "الصف",
      issues: "الملاحظات",
      created: "أُنشئ",
      updated: "حُدّث",
      skipped: "تُخطي",
      failed: "فشل",
      failures: "صفوف فشلت",
      duplicateNote: "توجد سجلات مكررة — اختر استراتيجية للمتابعة.",
      errorNote: "لا يمكن التنفيذ ووجود صفوف بها أخطاء. صحّح الملف وأعد المحاولة.",
      selectProject: "المشروع المستهدف",
      previewRows: "أول 100 صف معروضة",
      rePreview: "تحديث المعاينة"
    };
  }
  return {
    steps: ["File", "Columns", "Preview", "Commit"],
    dropTitle: "Choose an Excel or CSV file",
    dropHint: "xlsx or csv — up to 8MB and 2,000 rows",
    template: "Download template",
    sheet: "Sheet",
    mappingTitle: "Column mapping",
    mappingLead: "Match each required field to a file column. Unmapped columns are ignored.",
    unmapped: "Unused columns",
    skipColumn: "— ignore —",
    back: "Back",
    continueToPreview: "Preview import",
    previewing: "Validating...",
    strategy: "Duplicate strategy",
    strategyError: "Stop on duplicates",
    strategySkip: "Skip duplicates",
    strategyUpdate: "Update duplicates",
    commit: "Run import",
    committing: "Importing...",
    done: "Import complete",
    startOver: "Import another file",
    total: "Total rows",
    valid: "Valid",
    duplicates: "Duplicates",
    errors: "Errors",
    missing: "Unmapped required fields",
    row: "Row",
    issues: "Issues",
    created: "Created",
    updated: "Updated",
    skipped: "Skipped",
    failed: "Failed",
    failures: "Failed rows",
    duplicateNote: "Duplicate records found — pick a strategy to proceed.",
    errorNote: "Cannot commit while rows contain errors. Fix the file and retry.",
    selectProject: "Target project",
    previewRows: "First 100 rows shown",
    rePreview: "Refresh preview"
  };
}

export type ImportWizardProps = {
  type: DataOpsImportType;
  locale: "ar" | "en";
  projects: Array<{ id: string; code: string | null; name: string }>;
  onDone?: () => void;
};

export function ImportWizard({ type, locale, projects, onDone }: ImportWizardProps) {
  const labels = useMemo(() => labelsFor(locale), [locale]);
  const fields = FIELDS[type];

  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<WizardStep>("file");
  const [sheet, setSheet] = useState<string>("");
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [strategy, setStrategy] = useState<DataOpsDuplicateStrategy>("error");
  const [projectId, setProjectId] = useState<string>("");
  const [preview, setPreview] = useState<DataOpsPreview | null>(null);
  const [result, setResult] = useState<DataOpsCommitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const previewRequest = useRef(0);

  const needsProject = type === "boq";

  const requestPreview = useCallback(
    async (overrides?: { sheet?: string; mapping?: Record<string, number>; projectId?: string }) => {
      if (!file) return;
      const requestId = ++previewRequest.current;
      setBusy(true);
      setProgress(0);
      setError(null);
      const form = dataOpsImportBody({
        sheet: overrides?.sheet ?? sheet,
        mapping: overrides?.mapping ?? mapping,
        projectId: needsProject ? overrides?.projectId ?? projectId : undefined
      });
      form.set("file", file);
      try {
        const next = await uploadRequest<DataOpsPreview>(
          `/data-ops/imports/${type}/preview`,
          form,
          setProgress
        );
        if (previewRequest.current === requestId) {
          setPreview(next);
          if (!overrides?.sheet) setSheet(next.sheet);
          if (!overrides?.mapping) setMapping(next.mapping);
        }
      } catch (err) {
        if (previewRequest.current === requestId) {
          setError(err instanceof Error ? err.message : "Preview failed.");
        }
      } finally {
        if (previewRequest.current === requestId) setBusy(false);
      }
    },
    [file, sheet, mapping, needsProject, projectId, type]
  );

  useEffect(() => {
    if ((step === "preview" || step === "map") && file && !preview && !busy) {
      void requestPreview();
    }
  }, [step, file, preview, busy, requestPreview]);

  function pickFile(next: File | null) {
    setFile(next);
    setPreview(null);
    setResult(null);
    setError(null);
    setMapping({});
    setSheet("");
    setStep(next ? "map" : "file");
  }

  async function commit() {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    setError(null);
    const form = dataOpsImportBody({
      sheet,
      mapping,
      strategy,
      projectId: needsProject ? projectId : undefined
    });
    form.set("file", file);
    try {
      const outcome = await uploadRequest<DataOpsCommitResult>(
        `/data-ops/imports/${type}/commit`,
        form,
        setProgress
      );
      setResult(outcome);
      setStep("commit");
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  const stepIndex = STEPS.indexOf(step === "commit" ? "commit" : step);
  const canPreview =
    !!file &&
    fields.filter((field) => field.required).every((field) => (mapping[field.key] ?? -1) >= 0) &&
    (!needsProject || !!projectId);
  const canCommit =
    !!preview && preview.summary.errors === 0 && (preview.summary.duplicates === 0 || strategy !== "error");

  const previewRows = preview?.rows.slice(0, 100) ?? [];
  const dataFields = fields.filter((field) => (mapping[field.key] ?? -1) >= 0);

  return (
    <div className="import-wizard">
      <ImportStepper steps={labels.steps} current={stepIndex} />

      {error ? <div className="form-error">{error}</div> : null}

      {step === "file" && (
        <div className="import-wizard__stage">
          <FileDropzone
            label={labels.dropTitle}
            hint={labels.dropHint}
            accept=".xlsx,.csv"
            multiple={false}
            onFiles={(files) => pickFile(files[0] ?? null)}
          />
          <a className="ui-button ui-button--secondary ui-button--sm" href={dataOpsTemplateUrl(type)}>
            <Download size={14} /> {labels.template}
          </a>
        </div>
      )}

      {step === "map" && file && (
        <div className="import-wizard__stage">
          <div className="job-row">
            <FileSpreadsheet size={18} />
            <div className="job-row__meta">
              <strong>{file.name}</strong>
              <span>{Math.max(1, Math.round(file.size / 1024))} KB</span>
            </div>
            <button type="button" className="ui-icon-button" onClick={() => pickFile(null)} aria-label="Remove file">
              <XCircle size={16} />
            </button>
          </div>

          {needsProject && (
            <label className="ui-field">
              <span>
                {labels.selectProject} <strong className="required-star">*</strong>
              </span>
              <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                <option value="">—</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code ? `${project.code} · ` : ""}
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <h3>{labels.mappingTitle}</h3>
          <p className="field-hint">{labels.mappingLead}</p>
          <div className="import-mapping-grid">
            {fields.map((field) => (
              <label className="import-mapping-row" key={field.key}>
                <span>
                  {locale === "ar" ? field.labelAr : field.labelEn}
                  {field.required ? <strong className="required-star">*</strong> : null}
                </span>
                <MappingSelect
                  value={mapping[field.key] ?? -1}
                  headers={preview?.headers ?? []}
                  skipLabel={labels.skipColumn}
                  onChange={(value) => setMapping((current) => ({ ...current, [field.key]: value }))}
                />
              </label>
            ))}
          </div>

          <div className="form-actions-bar">
            <button type="button" className="ui-button ui-button--secondary" onClick={() => pickFile(null)}>
              {labels.back}
            </button>
            <button
              type="button"
              className="ui-button ui-button--primary"
              disabled={!canPreview || busy}
              onClick={() => {
                setPreview(null);
                setStep("preview");
              }}
            >
              {labels.continueToPreview}
            </button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="import-wizard__stage">
          {busy && !preview ? (
            <div className="import-wizard__busy">
              <UploadProgress value={progress} label={labels.previewing} />
            </div>
          ) : null}

          {preview && (
            <>
              <div className="import-summary-strip">
                <span className="import-summary-chip">
                  {labels.total} <strong>{preview.summary.total}</strong>
                </span>
                <span className="import-summary-chip import-summary-chip--valid">
                  <CheckCircle2 size={14} /> {labels.valid} <strong>{preview.summary.valid}</strong>
                </span>
                <span className="import-summary-chip import-summary-chip--duplicate">
                  <AlertTriangle size={14} /> {labels.duplicates} <strong>{preview.summary.duplicates}</strong>
                </span>
                <span className="import-summary-chip import-summary-chip--error">
                  <XCircle size={14} /> {labels.errors} <strong>{preview.summary.errors}</strong>
                </span>
              </div>

              {preview.sheets.length > 1 && (
                <label className="ui-field">
                  <span>{labels.sheet}</span>
                  <select
                    value={sheet}
                    onChange={(event) => {
                      const next = event.target.value;
                      setSheet(next);
                      setPreview(null);
                      void requestPreview({ sheet: next });
                    }}
                  >
                    {preview.sheets.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {preview.summary.missingFields.length > 0 && (
                <div className="form-error">
                  {labels.missing}: {preview.summary.missingFields.join(", ")}
                </div>
              )}
              {preview.summary.errors > 0 && <div className="form-error">{labels.errorNote}</div>}
              {preview.summary.errors === 0 && preview.summary.duplicates > 0 && (
                <div className="form-success">{labels.duplicateNote}</div>
              )}

              {preview.summary.errors === 0 && preview.summary.duplicates > 0 && (
                <label className="ui-field">
                  <span>{labels.strategy}</span>
                  <select
                    value={strategy}
                    onChange={(event) => setStrategy(event.target.value as DataOpsDuplicateStrategy)}
                  >
                    <option value="error">{labels.strategyError}</option>
                    <option value="skip">{labels.strategySkip}</option>
                    <option value="update">{labels.strategyUpdate}</option>
                  </select>
                </label>
              )}

              <div className="import-preview-table">
                <table>
                  <thead>
                    <tr>
                      <th>{labels.row}</th>
                      {dataFields.map((field) => (
                        <th key={field.key}>{locale === "ar" ? field.labelAr : field.labelEn}</th>
                      ))}
                      <th>{labels.issues}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => (
                      <tr
                        key={row.index}
                        className={
                          row.status === "error"
                            ? "import-row--error"
                            : row.status === "duplicate"
                              ? "import-row--duplicate"
                              : ""
                        }
                      >
                        <td className="mono">{row.index}</td>
                        {dataFields.map((field) => {
                          const value = row.data?.[field.key];
                          const text = typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "";
                          return <td key={field.key}>{text}</td>;
                        })}
                        <td>
                          {row.issues.map((issue, i) => (
                            <span
                              key={i}
                              className={
                                issue.code === "existing_client" ||
                                issue.code === "existing_account" ||
                                issue.code === "existing_code" ||
                                issue.code === "duplicate_in_file"
                                  ? "import-issue import-issue--duplicate"
                                  : "import-issue"
                              }
                            >
                              {issue.message}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="field-hint">{labels.previewRows}</p>

              <div className="form-actions-bar">
                <button type="button" className="ui-button ui-button--secondary" onClick={() => setStep("map")}>
                  {labels.back}
                </button>
                <button type="button" className="ui-button ui-button--secondary" disabled={busy} onClick={() => void requestPreview()}>
                  {labels.rePreview}
                </button>
                <button
                  type="button"
                  className="ui-button ui-button--primary"
                  disabled={!canCommit || busy}
                  onClick={() => void commit()}
                >
                  <Upload size={14} /> {busy ? labels.committing : labels.commit}
                </button>
              </div>
              {busy && progress > 0 ? <UploadProgress value={progress} label={labels.committing} /> : null}
            </>
          )}
        </div>
      )}

      {step === "commit" && result && (
        <div className={`import-result-panel ${result.failed > 0 ? "import-result-panel--partial" : ""}`}>
          <h3>
            <CheckCircle2 size={18} /> {labels.done}
          </h3>
          <div className="import-summary-strip">
            <span className="import-summary-chip import-summary-chip--valid">
              {labels.created} <strong>{result.created}</strong>
            </span>
            <span className="import-summary-chip">
              {labels.updated} <strong>{result.updated}</strong>
            </span>
            <span className="import-summary-chip">
              {labels.skipped} <strong>{result.skipped}</strong>
            </span>
            {result.failed > 0 && (
              <span className="import-summary-chip import-summary-chip--error">
                {labels.failed} <strong>{result.failed}</strong>
              </span>
            )}
          </div>
          {result.failures.length > 0 && (
            <div className="import-preview-table">
              <table>
                <thead>
                  <tr>
                    <th>{labels.row}</th>
                    <th>{labels.failures}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.failures.map((failure) => (
                    <tr key={failure.index} className="import-row--error">
                      <td className="mono">{failure.index}</td>
                      <td>{failure.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="form-actions-bar">
            <button type="button" className="ui-button ui-button--primary" onClick={() => pickFile(null)}>
              {labels.startOver}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MappingSelect({
  value,
  headers,
  skipLabel,
  onChange
}: {
  value: number;
  headers: string[];
  skipLabel: string;
  onChange: (value: number) => void;
}) {
  return (
    <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
      <option value={-1}>{skipLabel}</option>
      {headers.map((header, index) => (
        <option key={index} value={index}>
          {header || `#${index + 1}`}
        </option>
      ))}
    </select>
  );
}
