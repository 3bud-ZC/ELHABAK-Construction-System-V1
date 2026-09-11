"use client";

import { useSearchParams } from "next/navigation";
import { ChangeEvent, DragEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Badge, EmptyState, LoadingState } from "@elhabak/ui";
import { Archive, ArchiveRestore, Download, Eye, EyeOff, FileClock, FileText, Pencil, UploadCloud, X } from "lucide-react";
import { ProjectWorkspace } from "../../../components/project-workspace";
import {
  apiRequest,
  documentActionLabel,
  documentCategoryLabel,
  documentFileUrl,
  documentFormatCode,
  documentStatusLabel,
  documentStatusTone,
  documentVisibilityLabel,
  documentVisibilityTone,
  formatFileSize,
  roleLabel,
  uploadRequest,
  DOCUMENT_CATEGORIES,
  type DocumentCategory,
  type DocumentVersionRecord,
  type ProjectDocumentRecord,
  type ProjectRecord,
  type UserRecord
} from "../../../lib/api";
import { useCurrentUser } from "../../../lib/user-context";

type HistoryEvent = {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  actor: { id: string; displayName: string; role: string } | null;
  createdAt: string;
};

export function DocumentDetail({ projectId, documentId }: { projectId: string; documentId: string }) {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const user = useCurrentUser();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [document, setDocument] = useState<ProjectDocumentRecord | null>(null);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mutating, setMutating] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showVersion, setShowVersion] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const labels = ar
    ? {
        loading: "جاري تحميل تفاصيل المستند...", back: "سجل المستندات", current: "النسخة الحالية", category: "الفئة", uploader: "رافع الملف", uploaded: "تاريخ الرفع",
        description: "الوصف", file: "ملف النسخة", preview: "معاينة الملف", download: "تنزيل", versionHistory: "سجل النسخ", newest: "الأحدث",
        activity: "سجل التدقيق والنشاط", newVersion: "رفع نسخة جديدة", edit: "تعديل البيانات", save: "حفظ التعديلات", title: "عنوان المستند",
        updated: "تم تحديث بيانات المستند.", pdfFallback: "إذا لم تظهر المعاينة، نزّل الملف لفتحه.", fileMeta: "بيانات الملف", checksum: "بصمة الملف (SHA-256)",
        share: "مشاركة مع العميل", hide: "إخفاء عن العميل", shareConfirm: "تمت مشاركة المستند مع العميل.", hideConfirm: "تم إخفاء المستند عن العميل.",
        archive: "أرشفة", restore: "استعادة", archiveConfirm: "هل تريد أرشفة هذا المستند؟ سيبقى متاحاً للمستخدمين الداخليين المخوّلين.",
        cancel: "إلغاء", confirmArchive: "تأكيد الأرشفة", archived: "تمت أرشفة المستند.", restored: "تمت استعادة المستند.", noHistory: "لا يوجد سجل نشاط بعد."
      }
    : {
        loading: "Loading document detail...", back: "Document register", current: "Current version", category: "Category", uploader: "Uploader", uploaded: "Uploaded",
        description: "Description", file: "Version file", preview: "File preview", download: "Download", versionHistory: "Version history", newest: "Newest",
        activity: "Audit & Activity History", newVersion: "Upload new version", edit: "Edit details", save: "Save changes", title: "Document title",
        updated: "Document details updated.", pdfFallback: "If preview does not load, download the file to open it.", fileMeta: "File metadata", checksum: "File checksum (SHA-256)",
        share: "Share with Client", hide: "Hide from Client", shareConfirm: "Document shared with the Client.", hideConfirm: "Document hidden from the Client.",
        archive: "Archive", restore: "Restore", archiveConfirm: "Archive this document? It stays available to authorized internal users.",
        cancel: "Cancel", confirmArchive: "Confirm Archive", archived: "Document archived.", restored: "Document restored.", noHistory: "No activity history yet."
      };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projectResult, documentResult] = await Promise.all([
        apiRequest<ProjectRecord>(`/projects/${projectId}`),
        apiRequest<ProjectDocumentRecord>(`/projects/${projectId}/documents/${documentId}`)
      ]);
      setProject(projectResult);
      setDocument(documentResult);
      setSelectedVersionId((current) => (current && documentResult.versions.some((item) => item.id === current) ? current : documentResult.currentVersion?.id ?? ""));
      if (user.role === "ADMIN" || user.role === "ENGINEER") {
        apiRequest<HistoryEvent[]>(`/projects/${projectId}/documents/${documentId}/history`)
          .then(setHistory)
          .catch(() => undefined);
      }
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }, [documentId, projectId, user.role]);

  useEffect(() => {
    void load();
  }, [load]);

  async function mutate(path: string, method: "PATCH" | "POST", body: object | undefined, message: string) {
    setMutating(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<ProjectDocumentRecord>(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
      setDocument(updated);
      setSuccess(message);
      setConfirmArchive(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
    } finally {
      setMutating(false);
    }
  }

  if (loading || !project || !document) {
    return (
      <section className="app-page">
        <LoadingState label={labels.loading} />
        {error && <div className="form-error">{error}</div>}
      </section>
    );
  }

  const selected = document.versions.find((version) => version.id === selectedVersionId) ?? document.currentVersion;
  const canManage = user.role === "ADMIN" || user.role === "ENGINEER";
  const dateTime = (value: string) => new Date(value).toLocaleString(ar ? "ar-EG" : "en-US", { dateStyle: "medium", timeStyle: "short" });

  return (
    <section className="app-page project-workspace-page">
      <ProjectWorkspace project={project} locale={locale} role={user.role} active="documents" />
      <div className="design-detail-heading">
        <div className="design-detail-identity">
          <span className="section-kicker">
            {ar ? "مراقبة المستندات" : "DOCUMENT CONTROL"} // <bdi className="mono">{document.reference}</bdi>
          </span>
          <h2>{document.title}</h2>
          <div className="design-detail-badges">
            <Badge tone={documentStatusTone(document.status)}>{documentStatusLabel(document.status, locale)}</Badge>
            <Badge tone={documentVisibilityTone(document.isClientVisible)}>{documentVisibilityLabel(document.isClientVisible, locale)}</Badge>
            <span className="discipline-tag mono">{documentCategoryLabel(document.category, locale)}</span>
          </div>
        </div>
        {canManage && (
          <div className="design-detail-actions">
            <button className="ui-button ui-button--secondary ui-button--sm" type="button" onClick={() => setShowEdit(true)} disabled={mutating}>
              <Pencil size={15} />{labels.edit}
            </button>
            <button className="ui-button ui-button--secondary ui-button--sm" type="button" disabled={mutating} onClick={() => void mutate(`/projects/${projectId}/documents/${documentId}/visibility`, "PATCH", { isClientVisible: !document.isClientVisible }, document.isClientVisible ? labels.hideConfirm : labels.shareConfirm)}>
              {document.isClientVisible ? <EyeOff size={15} /> : <Eye size={15} />}
              {document.isClientVisible ? labels.hide : labels.share}
            </button>
            <button className="ui-button ui-button--accent ui-button--sm" type="button" onClick={() => setShowVersion(true)} disabled={mutating || document.status === "ARCHIVED"}>
              <UploadCloud size={15} />{labels.newVersion}
            </button>
            {document.status === "ACTIVE" ? (
              <button className="ui-button ui-button--secondary ui-button--sm" type="button" onClick={() => setConfirmArchive(true)} disabled={mutating}>
                <Archive size={15} />{labels.archive}
              </button>
            ) : (
              <button className="ui-button ui-button--secondary ui-button--sm" type="button" disabled={mutating} onClick={() => void mutate(`/projects/${projectId}/documents/${documentId}/restore`, "POST", undefined, labels.restored)}>
                <ArchiveRestore size={15} />{labels.restore}
              </button>
            )}
          </div>
        )}
      </div>
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}
      {confirmArchive && (
        <div className="inline-confirm">
          <strong>{labels.archiveConfirm}</strong>
          <div>
            <button className="ui-button ui-button--secondary ui-button--sm" type="button" onClick={() => setConfirmArchive(false)} disabled={mutating}>{labels.cancel}</button>
            <button className="ui-button ui-button--accent ui-button--sm" type="button" disabled={mutating} onClick={() => void mutate(`/projects/${projectId}/documents/${documentId}/archive`, "POST", undefined, labels.archived)}>{labels.confirmArchive}</button>
          </div>
        </div>
      )}

      <div className="design-detail-layout">
        <main className="design-preview-column">
          {selected && (
            <section className="workspace-panel design-file-panel">
              <div className="workspace-panel__title">
                <div className="workspace-panel__title-left">
                  <FileText size={16} />
                  <h3>{labels.preview}</h3>
                  <span className="drawing-sheet-tag mono"><bdi>{selected.versionCode} · {documentFormatCode(selected.mimeType, selected.originalFilename)}</bdi></span>
                </div>
                <a className="ui-button ui-button--secondary ui-button--sm" href={documentFileUrl(projectId, documentId, selected.id, true)}>
                  <Download size={14} />{labels.download} ({formatFileSize(selected.fileSize, locale)})
                </a>
              </div>
              <div className="cad-preview-frame">
                <FilePreview projectId={projectId} documentId={documentId} version={selected} fallback={labels.pdfFallback} />
              </div>
              <div className="drawing-titleblock">
                <div className="drawing-titleblock__cell">
                  <span className="titleblock-label">{labels.file}</span>
                  <strong className="mono"><bdi>{selected.originalFilename}</bdi></strong>
                </div>
                <div className="drawing-titleblock__cell">
                  <span className="titleblock-label">{labels.category}</span>
                  <strong>{documentCategoryLabel(document.category, locale)}</strong>
                </div>
                <div className="drawing-titleblock__cell">
                  <span className="titleblock-label">{labels.current}</span>
                  <strong className="mono"><bdi>{selected.versionCode}</bdi></strong>
                </div>
                <div className="drawing-titleblock__cell">
                  <span className="titleblock-label">{labels.fileMeta}</span>
                  <strong className="mono"><bdi>{selected.mimeType} · {formatFileSize(selected.fileSize, locale)}</bdi></strong>
                </div>
              </div>
              {canManage && selected.checksumSha256 && (
                <p className="field-hint mono" style={{ wordBreak: "break-all" }}>
                  {labels.checksum}: <bdi>{selected.checksumSha256}</bdi>
                </p>
              )}
            </section>
          )}

          {canManage && (
            <section className="workspace-panel">
              <div className="workspace-panel__title">
                <FileClock size={16} />
                <h3>{labels.activity}</h3>
              </div>
              {history.length === 0 ? (
                <EmptyState icon={<FileClock size={18} />} title={labels.noHistory} />
              ) : (
                <div className="activity-timeline">
                  {history.map((event) => (
                    <article key={event.id} className="activity-item">
                      <i className="activity-node" aria-hidden="true" />
                      <div className="activity-content">
                        <div className="activity-header">
                          <strong>{documentActionLabel(event.action, locale)}</strong>
                        </div>
                        {event.actor && <span className="activity-actor">{event.actor.displayName} · {roleLabel(event.actor.role as UserRecord["role"], locale)}</span>}
                        <time className="activity-time mono"><bdi>{dateTime(event.createdAt)}</bdi></time>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>

        <aside className="design-detail-sidebar">
          <section className="workspace-panel">
            <div className="workspace-panel__title">
              <FileText size={16} />
              <h3>{labels.current}</h3>
            </div>
            <dl className="detail-list compact">
              <div><dt>{labels.current}</dt><dd><bdi className="revision-badge mono">{document.currentVersion?.versionCode ?? "—"}</bdi></dd></div>
              <div><dt>{labels.category}</dt><dd>{documentCategoryLabel(document.category, locale)}</dd></div>
              <div><dt>{labels.uploader}</dt><dd>{selected?.uploadedBy.displayName ?? "—"}</dd></div>
              <div><dt>{labels.uploaded}</dt><dd><bdi className="mono">{selected ? dateTime(selected.createdAt) : "—"}</bdi></dd></div>
              <div><dt>{labels.description}</dt><dd>{document.description || "—"}</dd></div>
            </dl>
          </section>

          <section className="workspace-panel">
            <div className="workspace-panel__title">
              <FileClock size={16} />
              <h3>{labels.versionHistory}</h3>
            </div>
            <div className="revision-list">
              {document.versions.map((version, index) => (
                <button className={`revision-card ${selected?.id === version.id ? "active" : ""}`} type="button" key={version.id} onClick={() => setSelectedVersionId(version.id)}>
                  <div className="revision-card__header">
                    <span className="revision-badge mono"><bdi>{version.versionCode}</bdi></span>
                    {index === 0 && <span className="revision-tag revision-tag--newest">{labels.newest}</span>}
                  </div>
                  <time className="mono"><bdi>{dateTime(version.createdAt)}</bdi></time>
                  <span className="revision-card__filename mono"><bdi>{version.originalFilename}</bdi></span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {showVersion && (
        <VersionUploadDialog
          projectId={projectId}
          document={document}
          locale={locale}
          onClose={() => setShowVersion(false)}
          onUpdated={(updated) => {
            setDocument(updated);
            setSelectedVersionId(updated.currentVersion?.id ?? "");
            setShowVersion(false);
            setSuccess(ar ? "تم رفع النسخة الجديدة." : "New version uploaded.");
          }}
        />
      )}
      {showEdit && (
        <EditDocumentDialog
          projectId={projectId}
          document={document}
          locale={locale}
          onClose={() => setShowEdit(false)}
          onUpdated={(updated) => {
            setDocument(updated);
            setShowEdit(false);
            setSuccess(labels.updated);
          }}
        />
      )}
    </section>
  );
}

function FilePreview({ projectId, documentId, version, fallback }: { projectId: string; documentId: string; version: DocumentVersionRecord; fallback: string }) {
  const src = documentFileUrl(projectId, documentId, version.id);
  if (version.mimeType.startsWith("image/")) return <div className="file-preview file-preview--image"><img src={src} alt={version.originalFilename} /></div>;
  if (version.mimeType === "application/pdf") return <div className="file-preview file-preview--pdf"><iframe src={src} title={version.originalFilename} /><p>{fallback}</p></div>;
  return (
    <div className="file-preview file-preview--pdf">
      <div className="empty-state">
        <FileText size={28} />
        <strong>{version.originalFilename}</strong>
        <span>{fallback}</span>
      </div>
    </div>
  );
}

function VersionUploadDialog({ projectId, document, locale, onClose, onUpdated }: { projectId: string; document: ProjectDocumentRecord; locale: "ar" | "en"; onClose: () => void; onUpdated: (document: ProjectDocumentRecord) => void }) {
  const ar = locale === "ar";
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const labels = ar
    ? { title: "رفع نسخة جديدة", next: "النسخة التالية", notes: "ملاحظة النسخة", choose: "اسحب الملف هنا أو اختر من جهازك", support: "PDF، PNG، JPG/JPEG، DOCX، أو XLSX", save: "رفع النسخة", close: "إغلاق", required: "اختر ملفاً صالحاً.", uploading: "جاري الرفع" }
    : { title: "Upload new version", next: "Next version", notes: "Version note", choose: "Drop file here or choose from device", support: "PDF, PNG, JPG/JPEG, DOCX, or XLSX", save: "Upload Version", close: "Close", required: "Choose a valid file.", uploading: "Uploading" };

  function choose(selected?: File) {
    setFile(selected ?? null);
    setError("");
  }
  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    choose(event.dataTransfer.files[0]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError(labels.required);
      return;
    }
    setUploading(true);
    setError("");
    const body = new FormData();
    body.set("note", note);
    body.set("file", file);
    try {
      onUpdated(await uploadRequest(`/projects/${projectId}/documents/${document.id}/versions`, body, setProgress));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
      setUploading(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !uploading) onClose(); }}>
      <section className="design-dialog design-dialog--compact" role="dialog" aria-modal="true">
        <header>
          <div><span>{labels.next}</span><h2>{labels.title}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} disabled={uploading} aria-label={labels.close}><X size={20} /></button>
        </header>
        <form onSubmit={(event) => void submit(event)}>
          <div className="next-revision"><bdi>V{String(document.currentVersionNumber + 1).padStart(2, "0")}</bdi></div>
          <div className="upload-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={drop} onClick={() => inputRef.current?.click()} role="button" tabIndex={0}>
            <UploadCloud size={27} />
            <strong>{labels.choose}</strong>
            <span>{labels.support}</span>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              hidden
              onChange={(event: ChangeEvent<HTMLInputElement>) => choose(event.target.files?.[0])}
            />
          </div>
          {file && (
            <div className="selected-file">
              <span><bdi>{file.name}</bdi><small>{formatFileSize(file.size, locale)}</small></span>
              <button type="button" onClick={() => choose()}><X size={16} /></button>
            </div>
          )}
          <label className="ui-field">{labels.notes}<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} /></label>
          {error && <div className="form-error">{error}</div>}
          {uploading && <div className="upload-progress"><span>{labels.uploading} <bdi>{progress}%</bdi></span><div><i style={{ width: `${progress}%` }} /></div></div>}
          <footer><button className="ui-button ui-button--accent" type="submit" disabled={uploading}>{labels.save}</button></footer>
        </form>
      </section>
    </div>
  );
}

function EditDocumentDialog({ projectId, document, locale, onClose, onUpdated }: { projectId: string; document: ProjectDocumentRecord; locale: "ar" | "en"; onClose: () => void; onUpdated: (document: ProjectDocumentRecord) => void }) {
  const ar = locale === "ar";
  const [reference, setReference] = useState(document.reference);
  const [title, setTitle] = useState(document.title);
  const [description, setDescription] = useState(document.description ?? "");
  const [category, setCategory] = useState<DocumentCategory>(document.category);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const labels = ar
    ? { heading: "تعديل بيانات المستند", reference: "المرجع", title: "العنوان", description: "الوصف", category: "الفئة", save: "حفظ", cancel: "إلغاء" }
    : { heading: "Edit document details", reference: "Reference", title: "Title", description: "Description", category: "Category", save: "Save", cancel: "Cancel" };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      onUpdated(await apiRequest(`/projects/${projectId}/documents/${document.id}`, { method: "PATCH", body: JSON.stringify({ reference, title, description, category }) }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !saving) onClose(); }}>
      <section className="design-dialog design-dialog--compact" role="dialog" aria-modal="true">
        <header>
          <h2>{labels.heading}</h2>
          <button className="icon-button" type="button" onClick={onClose} disabled={saving} aria-label={labels.cancel}><X size={20} /></button>
        </header>
        <form onSubmit={(event) => void submit(event)}>
          <fieldset disabled={saving}>
            <label className="ui-field">{labels.reference}<input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={60} required /></label>
            <label className="ui-field">
              {labels.category}
              <select value={category} onChange={(event) => setCategory(event.target.value as DocumentCategory)}>
                {DOCUMENT_CATEGORIES.map((item) => (
                  <option key={item} value={item}>{documentCategoryLabel(item, locale)}</option>
                ))}
              </select>
            </label>
            <label className="ui-field full-span">{labels.title}<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} required /></label>
            <label className="ui-field full-span">{labels.description}<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={3000} /></label>
          </fieldset>
          {error && <div className="form-error">{error}</div>}
          <footer>
            <button className="ui-button ui-button--secondary" type="button" onClick={onClose}>{labels.cancel}</button>
            <button className="ui-button ui-button--primary" type="submit" disabled={saving}>{labels.save}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
