"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChangeEvent, DragEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Badge, EmptyState, LoadingState } from "@elhabak/ui";
import { FilePlus2, Filter, FolderOpen, Search, UploadCloud, X } from "lucide-react";
import { ProjectWorkspace } from "../../../components/project-workspace";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_STATUSES,
  apiRequest,
  documentCategoryLabel,
  documentFormatCode,
  documentStatusLabel,
  documentStatusTone,
  documentVisibilityLabel,
  documentVisibilityTone,
  formatFileSize,
  uploadRequest,
  type DocumentCategory,
  type DocumentRecordStatus,
  type ProjectDocumentRecord,
  type ProjectRecord
} from "../../../lib/api";
import { useCurrentUser } from "../../../lib/user-context";

export function DocumentsHub({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const user = useCurrentUser();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    apiRequest<ProjectRecord>(`/projects/${projectId}`)
      .then((projectResult) => {
        if (alive) {
          setProject(projectResult);
        }
      })
      .catch((requestError: Error) => {
        if (alive) setError(requestError.message);
      });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const ar = locale === "ar";
  const labels = ar
    ? { loading: "جاري تحميل المستندات...", denied: "لا يمكنك الوصول إلى هذا القسم", deniedHint: "هذا القسم غير متاح لدورك الحالي." }
    : { loading: "Loading documents...", denied: "You don't have access to this section", deniedHint: "This section is not available for your current role." };

  if (!project) {
    if (error) {
      return (
        <section className="app-page">
          <EmptyState icon={<FolderOpen size={20} />} title={labels.denied} description={error} />
        </section>
      );
    }
    return (
      <section className="app-page">
        <LoadingState label={labels.loading} />
      </section>
    );
  }

  return (
    <section className="app-page project-workspace-page">
      <ProjectWorkspace project={project} locale={locale} role={user.role} active="documents" />
      {user.role === "ADMIN" || user.role === "ENGINEER" ? (
        <InternalDocumentRegister projectId={projectId} locale={locale} />
      ) : user.role === "CLIENT" ? (
        <ClientDocuments projectId={projectId} locale={locale} />
      ) : (
        <EmptyState icon={<FolderOpen size={20} />} title={labels.denied} description={labels.deniedHint} />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ Admin/Engineer register */

function InternalDocumentRegister({ projectId, locale }: { projectId: string; locale: "ar" | "en" }) {
  const ar = locale === "ar";
  const [documents, setDocuments] = useState<ProjectDocumentRecord[]>([]);
  const [metrics, setMetrics] = useState({ total: 0, shared: 0, archived: 0 });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DocumentCategory | "">("");
  const [status, setStatus] = useState<DocumentRecordStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const labels = ar
    ? {
        title: "سجل المستندات", lead: "مركز التحكم بالمستندات العامة للمشروع - عقود، تصاريح، تقارير، ومراسلات.",
        add: "تسجيل مستند جديد", search: "بحث بالمرجع أو العنوان أو اسم الملف...", allCategories: "كل الفئات", allStatuses: "كل الحالات",
        empty: "لا توجد مستندات مسجلة", emptyHint: "ابدأ بتسجيل أول مستند لهذا المشروع.", noResults: "لا توجد نتائج مطابقة", noResultsHint: "غيّر البحث أو المرشحات الحالية.",
        document: "المرجع والمستند", category: "الفئة", version: "النسخة", format: "الصيغة", visibility: "المشاركة", status: "الحالة", updated: "التحديث",
        action: "الإجراء", open: "فتح المستند", total: "إجمالي المستندات", shared: "مشتركة مع العميل", archived: "مؤرشفة", loading: "جاري تحميل السجل..."
      }
    : {
        title: "Document Register", lead: "Control center for general project records - contracts, permits, reports, and correspondence.",
        add: "Register Document", search: "Search by reference, title, or filename...", allCategories: "All Categories", allStatuses: "All Statuses",
        empty: "No documents registered", emptyHint: "Register the first document for this project.", noResults: "No matching documents", noResultsHint: "Change search query or filter criteria.",
        document: "Reference & Document", category: "Category", version: "Version", format: "Format", visibility: "Visibility", status: "Status", updated: "Updated",
        action: "Action", open: "Open Document", total: "Total Documents", shared: "Client Shared", archived: "Archived", loading: "Loading register..."
      };

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    const suffix = params.size ? `?${params.toString()}` : "";
    setLoading(true);
    try {
      const result = await apiRequest<ProjectDocumentRecord[]>(`/projects/${projectId}/documents${suffix}`);
      setDocuments(result);
      if (!query.trim() && !category && !status) {
        setMetrics({
          total: result.length,
          shared: result.filter((doc) => doc.isClientVisible).length,
          archived: result.filter((doc) => doc.status === "ARCHIVED").length
        });
      }
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }, [category, projectId, query, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 220);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function refreshMetrics() {
    const result = await apiRequest<ProjectDocumentRecord[]>(`/projects/${projectId}/documents`);
    setMetrics({ total: result.length, shared: result.filter((doc) => doc.isClientVisible).length, archived: result.filter((doc) => doc.status === "ARCHIVED").length });
  }

  function href(path: string) {
    return ar ? path : `${path}?lang=en`;
  }

  const filtered = Boolean(query.trim() || category || status);

  return (
    <>
      <div className="design-hub-heading">
        <div>
          <span className="section-kicker">{ar ? "مراقبة المستندات" : "DOCUMENT CONTROL"}</span>
          <h2>{labels.title}</h2>
          <p>{labels.lead}</p>
        </div>
        <button className="ui-button ui-button--accent" type="button" onClick={() => setShowCreate(true)}>
          <FilePlus2 size={16} />
          {labels.add}
        </button>
      </div>

      <div className="design-kpi-strip">
        <span>
          <small>{labels.total}</small>
          <strong><bdi>{metrics.total}</bdi></strong>
        </span>
        <span>
          <small>{labels.shared}</small>
          <strong><bdi>{metrics.shared}</bdi></strong>
        </span>
        <span>
          <small>{labels.archived}</small>
          <strong><bdi>{metrics.archived}</bdi></strong>
        </span>
      </div>

      <div className="design-toolbar">
        <label className="design-search">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} />
        </label>
        <label className="design-filter">
          <Filter size={14} />
          <select value={category} onChange={(event) => setCategory(event.target.value as DocumentCategory | "")}>
            <option value="">{labels.allCategories}</option>
            {DOCUMENT_CATEGORIES.map((item) => (
              <option key={item} value={item}>{documentCategoryLabel(item, locale)}</option>
            ))}
          </select>
        </label>
        <label className="design-filter">
          <select value={status} onChange={(event) => setStatus(event.target.value as DocumentRecordStatus | "")}>
            <option value="">{labels.allStatuses}</option>
            {DOCUMENT_STATUSES.map((item) => (
              <option key={item} value={item}>{documentStatusLabel(item, locale)}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}
      {loading && <div className="design-register design-register--loading" aria-label="Loading"><span /><span /><span /><span /></div>}
      {!loading && documents.length === 0 && (
        <EmptyState
          icon={<FolderOpen size={21} />}
          title={filtered ? labels.noResults : labels.empty}
          description={filtered ? labels.noResultsHint : labels.emptyHint}
          action={!filtered ? <button className="ui-button ui-button--accent ui-button--sm" type="button" onClick={() => setShowCreate(true)}>{labels.add}</button> : undefined}
        />
      )}
      {!loading && documents.length > 0 && (
        <div className="finance-register" style={{ "--finance-cols": "minmax(220px,2fr) 120px 80px 70px 130px 90px minmax(120px,1fr) 90px" } as React.CSSProperties}>
          <div className="finance-register__head">
            <span>{labels.document}</span>
            <span>{labels.category}</span>
            <span>{labels.version}</span>
            <span>{labels.format}</span>
            <span>{labels.visibility}</span>
            <span>{labels.status}</span>
            <span>{labels.updated}</span>
            <span>{labels.action}</span>
          </div>
          {documents.map((document) => {
            const format = document.currentVersion ? documentFormatCode(document.currentVersion.mimeType, document.currentVersion.originalFilename) : "—";
            return (
              <div className={`finance-register__row ${document.status === "ARCHIVED" ? "finance-void-row" : ""}`} key={document.id}>
                <div className="finance-register__identity" data-label={labels.document}>
                  <span className="mono" style={{ fontSize: "0.68rem", color: "var(--muted)" }}><bdi>{document.reference}</bdi></span>
                  <strong>{document.title}</strong>
                </div>
                <span className="finance-register__cell" data-label={labels.category}>{documentCategoryLabel(document.category, locale)}</span>
                <span className="finance-register__cell finance-register__cell--amount" data-label={labels.version}>
                  <bdi className="revision-badge mono">{document.currentVersion?.versionCode ?? "—"}</bdi>
                </span>
                <span className="finance-register__cell" data-label={labels.format}>{format}</span>
                <span className="finance-register__cell" data-label={labels.visibility}>
                  <Badge tone={documentVisibilityTone(document.isClientVisible)}>{documentVisibilityLabel(document.isClientVisible, locale)}</Badge>
                </span>
                <span className="finance-register__cell" data-label={labels.status}>
                  <Badge tone={documentStatusTone(document.status)}>{documentStatusLabel(document.status, locale)}</Badge>
                </span>
                <span className="finance-register__cell finance-register__cell--muted" data-label={labels.updated}>
                  <bdi>{new Date(document.updatedAt).toLocaleDateString(ar ? "ar-EG" : "en-US")}</bdi>
                </span>
                <div className="finance-register__actions">
                  <Link className="ui-button ui-button--secondary ui-button--sm" href={href(`/app/projects/${projectId}/documents/${document.id}`)}>
                    {labels.open}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateDocumentDialog
          projectId={projectId}
          locale={locale}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            setSuccess(ar ? "تمت إضافة المستند إلى السجل." : "Document added to register.");
            void Promise.all([load(), refreshMetrics()]);
          }}
        />
      )}
    </>
  );
}

function CreateDocumentDialog({ projectId, locale, onClose, onCreated }: { projectId: string; locale: "ar" | "en"; onClose: () => void; onCreated: () => void }) {
  const ar = locale === "ar";
  const [reference, setReference] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("REPORT");
  const [description, setDescription] = useState("");
  const [isClientVisible, setIsClientVisible] = useState(false);
  const [versionNote, setVersionNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const labels = ar
    ? {
        heading: "تسجيل مستند جديد", info: "بيانات المستند", reference: "المرجع", title: "العنوان", category: "الفئة", description: "الوصف (اختياري)",
        visibility: "مشاركة مع العميل", visibilityHint: "بشكل افتراضي، المستندات الجديدة داخلية فقط.", file: "الملف الأول (النسخة الأولى)",
        drop: "اسحب الملف هنا أو اختر من جهازك", support: "PDF، PNG، JPG/JPEG، DOCX، أو XLSX", notes: "ملاحظة على النسخة (اختياري)",
        save: "تسجيل المستند", close: "إغلاق", required: "أدخل المرجع والعنوان واختر ملفاً صالحاً.", uploading: "جاري الرفع"
      }
    : {
        heading: "Register Document", info: "Document information", reference: "Reference", title: "Title", category: "Category", description: "Description (optional)",
        visibility: "Share with Client", visibilityHint: "New documents default to internal-only.", file: "First file (version 1)",
        drop: "Drop file here or choose from device", support: "PDF, PNG, JPG/JPEG, DOCX, or XLSX", notes: "Version note (optional)",
        save: "Register Document", close: "Close", required: "Enter a reference, title, and choose a valid file.", uploading: "Uploading"
      };

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
    if (!reference.trim() || !title.trim() || !file) {
      setError(labels.required);
      return;
    }
    setUploading(true);
    setError("");
    setProgress(0);
    const body = new FormData();
    body.set("reference", reference);
    body.set("title", title);
    body.set("category", category);
    body.set("description", description);
    body.set("isClientVisible", String(isClientVisible));
    body.set("versionNote", versionNote);
    body.set("file", file);
    try {
      await uploadRequest(`/projects/${projectId}/documents`, body, setProgress);
      onCreated();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
      setUploading(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !uploading) onClose(); }}>
      <section className="design-dialog" role="dialog" aria-modal="true" aria-labelledby="document-create-title">
        <header>
          <div><span>{ar ? "سجل المستندات" : "DOCUMENT REGISTER"}</span><h2 id="document-create-title">{labels.heading}</h2></div>
          <button type="button" className="icon-button" onClick={onClose} disabled={uploading} aria-label={labels.close}><X size={20} /></button>
        </header>
        <form onSubmit={(event) => void submit(event)}>
          <fieldset disabled={uploading}>
            <legend>{labels.info}</legend>
            <label className="ui-field">{labels.reference}<input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={60} required autoFocus placeholder="DOC-001" /></label>
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
            <label className="check-field full-span">
              <input type="checkbox" checked={isClientVisible} onChange={(event) => setIsClientVisible(event.target.checked)} />
              <span>{labels.visibility}<small style={{ display: "block", color: "var(--muted)" }}>{labels.visibilityHint}</small></span>
            </label>
          </fieldset>
          <fieldset disabled={uploading}>
            <legend>{labels.file}</legend>
            <div className="upload-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={drop} onClick={() => inputRef.current?.click()} role="button" tabIndex={0}>
              <UploadCloud size={28} />
              <strong>{labels.drop}</strong>
              <span>{labels.support}</span>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event: ChangeEvent<HTMLInputElement>) => choose(event.target.files?.[0])}
                hidden
              />
            </div>
            {file && (
              <div className="selected-file">
                <span><bdi>{file.name}</bdi><small><bdi>{formatFileSize(file.size, locale)}</bdi></small></span>
                <button type="button" onClick={() => choose()} aria-label={labels.close}><X size={16} /></button>
              </div>
            )}
            <label className="ui-field full-span">{labels.notes}<textarea value={versionNote} onChange={(event) => setVersionNote(event.target.value)} maxLength={2000} /></label>
          </fieldset>
          {error && <div className="form-error">{error}</div>}
          {uploading && <div className="upload-progress"><span>{labels.uploading} <bdi>{progress}%</bdi></span><div><i style={{ width: `${progress}%` }} /></div></div>}
          <footer><button className="ui-button ui-button--accent" type="submit" disabled={uploading}>{labels.save}</button></footer>
        </form>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ Client experience */

function ClientDocuments({ projectId, locale }: { projectId: string; locale: "ar" | "en" }) {
  const ar = locale === "ar";
  const [documents, setDocuments] = useState<ProjectDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const labels = ar
    ? {
        title: "المستندات المشتركة", lead: "المستندات التي شاركها معك فريق المشروع.", empty: "لا توجد مستندات مشتركة بعد",
        emptyHint: "ستظهر هنا أي مستندات يشاركها معك فريق المشروع.", category: "الفئة", version: "النسخة", updated: "آخر تحديث",
        preview: "معاينة", download: "تنزيل", loading: "جاري تحميل المستندات..."
      }
    : {
        title: "Shared Documents", lead: "Documents the project team has shared with you.", empty: "No documents shared yet",
        emptyHint: "Any document your project team shares with you will appear here.", category: "Category", version: "Version", updated: "Last updated",
        preview: "Preview", download: "Download", loading: "Loading documents..."
      };

  useEffect(() => {
    let alive = true;
    apiRequest<ProjectDocumentRecord[]>(`/projects/${projectId}/documents`)
      .then((result) => {
        if (alive) setDocuments(result);
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
  }, [projectId]);

  if (loading) return <LoadingState label={labels.loading} />;

  return (
    <section>
      <div className="finance-panel-heading">
        <div>
          <span className="section-kicker">{ar ? "مستنداتك" : "YOUR DOCUMENTS"}</span>
          <h2>{labels.title}</h2>
          <p>{labels.lead}</p>
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
      {documents.length === 0 && <EmptyState icon={<FolderOpen size={20} />} title={labels.empty} description={labels.emptyHint} />}
      {documents.length > 0 && (
        <div className="finance-register" style={{ "--finance-cols": "minmax(200px,2fr) 140px 90px 120px 160px" } as React.CSSProperties}>
          <div className="finance-register__head">
            <span>{ar ? "المستند" : "Document"}</span>
            <span>{labels.category}</span>
            <span>{labels.version}</span>
            <span>{labels.updated}</span>
            <span>{labels.preview}</span>
          </div>
          {documents.map((document) => (
            <div className="finance-register__row" key={document.id}>
              <div className="finance-register__identity" data-label={ar ? "المستند" : "Document"}>
                <strong>{document.title}</strong>
                {document.description && <span className="finance-register__cell--muted">{document.description}</span>}
              </div>
              <span className="finance-register__cell" data-label={labels.category}>{documentCategoryLabel(document.category, locale)}</span>
              <span className="finance-register__cell" data-label={labels.version}>
                <bdi className="revision-badge mono">{document.currentVersion?.versionCode ?? "—"}</bdi>
              </span>
              <span className="finance-register__cell finance-register__cell--muted" data-label={labels.updated}>
                <bdi>{new Date(document.updatedAt).toLocaleDateString(ar ? "ar-EG" : "en-US")}</bdi>
              </span>
              <div className="finance-register__actions">
                <Link className="ui-button ui-button--secondary ui-button--sm" href={ar ? `/app/projects/${projectId}/documents/${document.id}` : `/app/projects/${projectId}/documents/${document.id}?lang=en`}>
                  {labels.preview}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
