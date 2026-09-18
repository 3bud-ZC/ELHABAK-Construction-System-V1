"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Images, Upload, XCircle } from "lucide-react";
import {
  dataOpsImportBody,
  formatFileSize,
  SITE_UPDATE_TYPES,
  siteUpdateTypeLabel,
  uploadRequest,
  type DataOpsMediaBatchResult,
  type SiteUpdateType
} from "../../../lib/api";
import { FileDropzone, UploadProgress } from "@elhabak/ui";

type MediaBatchProps = {
  locale: "ar" | "en";
  projects: Array<{ id: string; code: string | null; name: string }>;
  onDone?: () => void;
};

export function MediaBatchPanel({ locale, projects, onDone }: MediaBatchProps) {
  const ar = locale === "ar";
  const labels = useMemo(
    () =>
      ar
        ? {
          selectProject: "المشروع المستهدف",
          chooseProject: "اختر مشروعاً",
          dropTitle: "أضف ملفات الصور أو الفيديو",
          dropHint: "حتى 30 ملفاً في الدفعة الواحدة",
          manifestTitle: "ملف manifest اختياري (xlsx/csv)",
          manifestHint: "يربط كل اسم ملف بنوعه وملاحظته وظهوره للعميل",
          sharedType: "نوع التحديث",
          sharedNote: "ملاحظة مشتركة",
          notePlaceholder: "وصف الدفعة...",
          clientVisible: "ظاهر للعميل",
          strictManifest: "وضع manifest صارم (رفض الملفات غير المذكورة)",
          files: "ملف",
          run: "استيراد الدفعة",
          running: "جاري الاستيراد...",
          done: "اكتمل استيراد الوسائط",
          imported: "ملفات مستوردة",
          updates: "تحديثات منشأة",
          reset: "دفعة جديدة",
          remove: "إزالة"
        }
        : {
          selectProject: "Target project",
          chooseProject: "Choose a project",
          dropTitle: "Add image or video files",
          dropHint: "Up to 30 files per batch",
          manifestTitle: "Optional manifest file (xlsx/csv)",
          manifestHint: "Maps each filename to its type, note, and client visibility",
          sharedType: "Update type",
          sharedNote: "Shared note",
          notePlaceholder: "Batch description...",
          clientVisible: "Client visible",
          strictManifest: "Strict manifest mode (reject unlisted files)",
          files: "files",
          run: "Run batch import",
          running: "Importing...",
          done: "Media import complete",
          imported: "Files imported",
          updates: "Updates created",
          reset: "New batch",
          remove: "Remove"
        },
    [ar]
  );

  const [projectId, setProjectId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [manifest, setManifest] = useState<File | null>(null);
  const [type, setType] = useState<SiteUpdateType>("PROGRESS");
  const [note, setNote] = useState("");
  const [clientVisible, setClientVisible] = useState(true);
  const [strict, setStrict] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DataOpsMediaBatchResult | null>(null);

  const canRun = !!projectId && files.length > 0 && !busy;

  async function run() {
    if (!canRun) return;
    setBusy(true);
    setProgress(0);
    setError(null);
    const form = dataOpsImportBody({ projectId });
    form.set("type", type);
    form.set("isClientVisible", String(clientVisible));
    if (note.trim()) form.set("note", note.trim());
    if (strict) form.set("strictManifest", "true");
    for (const file of files) form.append("media", file);
    if (manifest) form.set("manifest", manifest);
    try {
      const outcome = await uploadRequest<DataOpsMediaBatchResult>("/data-ops/media-batch", form, setProgress);
      setResult(outcome);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch import failed.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFiles([]);
    setManifest(null);
    setResult(null);
    setError(null);
    setProgress(0);
  }

  if (result) {
    return (
      <div className={`import-result-panel ${result.updates === 0 ? "import-result-panel--partial" : ""}`}>
        <h3>
          <CheckCircle2 size={18} /> {labels.done}
        </h3>
        <div className="import-summary-strip">
          <span className="import-summary-chip import-summary-chip--valid">
            {labels.imported} <strong>{result.imported}</strong>
          </span>
          <span className="import-summary-chip">
            {labels.updates} <strong>{result.updates}</strong>
          </span>
        </div>
        <div className="form-actions-bar">
          <button type="button" className="ui-button ui-button--primary" onClick={reset}>
            {labels.reset}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="import-wizard">
      {error ? <div className="form-error">{error}</div> : null}

      <label className="ui-field">
        <span>
          {labels.selectProject} <strong className="required-star">*</strong>
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

      <FileDropzone
        label={labels.dropTitle}
        hint={labels.dropHint}
        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
        multiple
        onFiles={(next) => setFiles((current) => [...current, ...next].slice(0, 30))}
      />

      {files.length > 0 && (
        <div className="jobs-list">
          {files.map((file, index) => (
            <div className="job-row" key={`${file.name}-${index}`}>
              <Images size={16} />
              <div className="job-row__meta">
                <strong>{file.name}</strong>
                <span>{formatFileSize(file.size, locale)}</span>
              </div>
              <button
                type="button"
                className="ui-icon-button"
                aria-label={labels.remove}
                onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
              >
                <XCircle size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <FileDropzone
        compact
        label={labels.manifestTitle}
        hint={labels.manifestHint}
        accept=".xlsx,.csv"
        multiple={false}
        onFiles={(next) => setManifest(next[0] ?? null)}
      />
      {manifest && (
        <div className="job-row">
          <FileSpreadsheet size={16} />
          <div className="job-row__meta">
            <strong>{manifest.name}</strong>
          </div>
          <button type="button" className="ui-icon-button" aria-label={labels.remove} onClick={() => setManifest(null)}>
            <XCircle size={15} />
          </button>
        </div>
      )}

      <div className="form-grid">
        <label className="ui-field">
          <span>{labels.sharedType}</span>
          <select value={type} onChange={(event) => setType(event.target.value as SiteUpdateType)}>
            {SITE_UPDATE_TYPES.map((item) => (
              <option key={item} value={item}>
                {siteUpdateTypeLabel(item, locale)}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          <span>{labels.sharedNote}</span>
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder={labels.notePlaceholder} />
        </label>
        <div className="field-group-center">
          <label className="check-field check-field--toggle">
            <input type="checkbox" checked={clientVisible} onChange={(event) => setClientVisible(event.target.checked)} />
            <span>{labels.clientVisible}</span>
          </label>
        </div>
        <div className="field-group-center">
          <label className="check-field check-field--toggle">
            <input type="checkbox" checked={strict} onChange={(event) => setStrict(event.target.checked)} />
            <span>{labels.strictManifest}</span>
          </label>
        </div>
      </div>

      {busy && progress > 0 ? <UploadProgress value={progress} label={labels.running} /> : null}

      <div className="form-actions-bar">
        <button type="button" className="ui-button ui-button--primary" disabled={!canRun} onClick={() => void run()}>
          <Upload size={14} /> {busy ? labels.running : labels.run}
        </button>
      </div>
    </div>
  );
}
