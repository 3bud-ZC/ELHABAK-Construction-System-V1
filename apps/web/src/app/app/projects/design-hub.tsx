"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChangeEvent, DragEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, EmptyState, LoadingState } from "@elhabak/ui";
import { FilePlus2, Filter, Search, UploadCloud, X } from "lucide-react";
import { ProjectWorkspace } from "../../../components/project-workspace";
import {
  DESIGN_DISCIPLINES,
  DESIGN_STATUSES,
  apiRequest,
  designStatusLabel,
  designStatusTone,
  disciplineLabel,
  formatFileSize,
  uploadRequest,
  type DesignDiscipline,
  type DesignRecord,
  type DesignStatus,
  type ProjectRecord,
  type UserRecord
} from "../../../lib/api";

export function DesignHub({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const [user, setUser] = useState<UserRecord | null>(null);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [designs, setDesigns] = useState<DesignRecord[]>([]);
  const [metrics, setMetrics] = useState({ total: 0, pending: 0, approved: 0 });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<DesignStatus | "">("");
  const [discipline, setDiscipline] = useState<DesignDiscipline | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  const ar = locale === "ar";
  const labels = useMemo(() => ar ? {
    title: "سجل التصميمات", lead: "إدارة الرسومات والمخرجات التصميمية ومراجعاتها واعتمادات العميل.",
    upload: "إضافة تصميم", search: "بحث بالعنوان أو المراجعة أو اسم الملف", allStatuses: "كل الحالات", allDisciplines: "كل التخصصات",
    empty: "لا توجد تصميمات مسجلة", emptyHint: "ابدأ بإضافة أول ملف تصميم لهذا المشروع.", noResults: "لا توجد نتائج مطابقة", noResultsHint: "غيّر البحث أو المرشحات الحالية.",
    design: "التصميم", discipline: "التخصص", revision: "المراجعة", status: "الحالة", updated: "آخر تحديث", owner: "رافع الملف", action: "الإجراء", open: "فتح",
    pending: "بانتظار اعتمادك", inReview: "قيد المراجعة", pendingHint: "مراجعات جاهزة للفحص والاعتماد أو الرفض.", total: "إجمالي التصميمات", approved: "معتمد", loading: "جاري تحميل سجل التصميمات..."
  } : {
    title: "Design register", lead: "Control project drawings, deliverables, revisions, and client approvals.",
    upload: "Add design", search: "Search title, revision, or filename", allStatuses: "All statuses", allDisciplines: "All disciplines",
    empty: "No designs registered", emptyHint: "Add the first design file for this project.", noResults: "No matching designs", noResultsHint: "Change your search or current filters.",
    design: "Design", discipline: "Discipline", revision: "Revision", status: "Status", updated: "Updated", owner: "Uploader", action: "Action", open: "Open",
    pending: "Awaiting your approval", inReview: "In review", pendingHint: "Revisions ready to inspect, approve, or reject.", total: "Total designs", approved: "Approved", loading: "Loading design register..."
  }, [ar]);

  const loadDesigns = useCallback(async () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    if (status) params.set("status", status);
    if (discipline) params.set("discipline", discipline);
    const suffix = params.size ? `?${params.toString()}` : "";
    setLoading(true);
    try {
      const result = await apiRequest<DesignRecord[]>(`/projects/${projectId}/designs${suffix}`);
      setDesigns(result);
      if (!query.trim() && !status && !discipline) {
        setMetrics({
          total: result.length,
          pending: result.filter((design) => design.status === "IN_REVIEW").length,
          approved: result.filter((design) => design.status === "APPROVED").length
        });
      }
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
    } finally { setLoading(false); }
  }, [discipline, projectId, query, status]);

  useEffect(() => {
    let alive = true;
    Promise.all([apiRequest<{ user: UserRecord }>("/auth/me"), apiRequest<ProjectRecord>(`/projects/${projectId}`)])
      .then(([me, projectResult]) => { if (alive) { setUser(me.user); setProject(projectResult); } })
      .catch((requestError: Error) => { if (alive) setError(requestError.message); });
    return () => { alive = false; };
  }, [projectId]);

  useEffect(() => { const timer = window.setTimeout(() => void loadDesigns(), 220); return () => window.clearTimeout(timer); }, [loadDesigns]);

  function href(path: string) { return ar ? path : `${path}?lang=en`; }
  async function refreshMetrics() {
    const result = await apiRequest<DesignRecord[]>(`/projects/${projectId}/designs`);
    setMetrics({ total: result.length, pending: result.filter((design) => design.status === "IN_REVIEW").length, approved: result.filter((design) => design.status === "APPROVED").length });
  }
  const canManage = user?.role === "ADMIN" || user?.role === "ENGINEER";
  const filtered = Boolean(query.trim() || status || discipline);

  if (!project || !user) return <section className="app-page"><LoadingState label={labels.loading} />{error && <div className="form-error">{error}</div>}</section>;

  return <section className="app-page project-workspace-page">
    <ProjectWorkspace project={project} locale={locale} role={user.role} active="design" />

    <div className="design-hub-heading">
      <div><span className="section-kicker">{ar ? "مراقبة المستندات" : "DOCUMENT CONTROL"}</span><h2>{labels.title}</h2><p>{labels.lead}</p></div>
      {canManage && <button className="ui-button ui-button--accent" type="button" onClick={() => setShowUpload(true)}><FilePlus2 size={17} />{labels.upload}</button>}
    </div>

    <div className="design-kpi-strip">
      <span><small>{labels.total}</small><strong><bdi>{metrics.total}</bdi></strong></span>
      <span className={user.role === "CLIENT" && metrics.pending > 0 ? "attention" : ""}><small>{user.role === "CLIENT" ? labels.pending : labels.inReview}</small><strong><bdi>{metrics.pending}</bdi></strong></span>
      <span><small>{labels.approved}</small><strong><bdi>{metrics.approved}</bdi></strong></span>
      {user.role === "CLIENT" && metrics.pending > 0 && <p>{labels.pendingHint}</p>}
    </div>

    <div className="design-toolbar">
      <label className="design-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} /></label>
      <label className="design-filter"><Filter size={15} /><select value={status} onChange={(event) => setStatus(event.target.value as DesignStatus | "")}><option value="">{labels.allStatuses}</option>{DESIGN_STATUSES.map((item) => <option key={item} value={item}>{designStatusLabel(item, locale)}</option>)}</select></label>
      <label className="design-filter"><select value={discipline} onChange={(event) => setDiscipline(event.target.value as DesignDiscipline | "")}><option value="">{labels.allDisciplines}</option>{DESIGN_DISCIPLINES.map((item) => <option key={item} value={item}>{disciplineLabel(item, locale)}</option>)}</select></label>
    </div>

    {error && <div className="form-error">{error}</div>}
    {success && <div className="form-success">{success}</div>}
    {loading && <DesignRegisterSkeleton />}
    {!loading && designs.length === 0 && <EmptyState icon={<FilePlus2 size={21} />} title={filtered ? labels.noResults : labels.empty} description={filtered ? labels.noResultsHint : labels.emptyHint} action={!filtered && canManage ? <button className="ui-button ui-button--accent ui-button--sm" type="button" onClick={() => setShowUpload(true)}>{labels.upload}</button> : undefined} />}
    {!loading && designs.length > 0 && <div className="design-register">
      <div className="design-register__head"><span>{labels.design}</span><span>{labels.discipline}</span><span>{labels.revision}</span><span>{labels.status}</span><span>{labels.updated}</span><span>{labels.owner}</span><span>{labels.action}</span></div>
      {designs.map((design) => <article className="design-register__row" key={design.id}>
        <div className="design-register__identity"><strong>{design.title}</strong><bdi>{design.currentRevision.originalFilename}</bdi></div>
        <span data-label={labels.discipline}>{disciplineLabel(design.discipline, locale)}</span>
        <span data-label={labels.revision}><bdi className="revision-badge">{design.currentRevision.revisionCode}</bdi></span>
        <span data-label={labels.status}><Badge tone={designStatusTone(design.status)}>{designStatusLabel(design.status, locale)}</Badge></span>
        <time data-label={labels.updated}><bdi>{new Date(design.updatedAt).toLocaleDateString(ar ? "ar-EG" : "en-US")}</bdi></time>
        <span data-label={labels.owner}>{design.currentRevision.uploader.displayName}</span>
        <Link className="ui-button ui-button--secondary ui-button--sm" href={href(`/app/projects/${projectId}/design/${design.id}`)}>{labels.open}</Link>
      </article>)}
    </div>}

    {showUpload && <DesignUploadDialog projectId={projectId} locale={locale} onClose={() => setShowUpload(false)} onCreated={() => { setShowUpload(false); setSuccess(ar ? "تمت إضافة التصميم إلى السجل." : "Design added to register."); void Promise.all([loadDesigns(), refreshMetrics()]); }} />}
  </section>;
}

function DesignRegisterSkeleton() {
  return <div className="design-register design-register--loading" aria-label="Loading"><span /><span /><span /><span /></div>;
}

function DesignUploadDialog({ projectId, locale, onClose, onCreated }: { projectId: string; locale: "ar" | "en"; onClose: () => void; onCreated: () => void }) {
  const ar = locale === "ar";
  const [title, setTitle] = useState("");
  const [discipline, setDiscipline] = useState<DesignDiscipline>("ARCHITECTURAL");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const labels = ar ? {
    heading: "إضافة تصميم", info: "بيانات التصميم", title: "عنوان التصميم", discipline: "التخصص", description: "الوصف / الملاحظة", file: "ملف التصميم", drop: "اسحب الملف هنا أو اختر من جهازك", support: "PDF أو PNG أو JPG/JPEG", revision: "المراجعة الأولى", revisionHint: "سيتم ترقيم المراجعات التالية تلقائياً", notes: "ملاحظات المراجعة", draft: "حفظ كمسودة", review: "حفظ وإرسال للمراجعة", close: "إغلاق", required: "أدخل العنوان واختر ملفاً صالحاً.", uploading: "جاري الرفع"
  } : {
    heading: "Add design", info: "Design information", title: "Design title", discipline: "Discipline", description: "Description / note", file: "Design file", drop: "Drop file here or choose from device", support: "PDF, PNG, or JPG/JPEG", revision: "First revision", revisionHint: "Later revisions are numbered automatically", notes: "Revision notes", draft: "Save draft", review: "Save & submit for review", close: "Close", required: "Enter a title and choose a valid file.", uploading: "Uploading"
  };

  function choose(selected?: File) { setFile(selected ?? null); setError(""); }
  function drop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); choose(event.dataTransfer.files[0]); }

  async function submit(event: FormEvent, submitForReview: boolean) {
    event.preventDefault();
    if (!title.trim() || !file) { setError(labels.required); return; }
    setUploading(true); setError(""); setProgress(0);
    const body = new FormData();
    body.set("title", title); body.set("discipline", discipline); body.set("description", description); body.set("revisionNotes", notes); body.set("submitForReview", String(submitForReview)); body.set("file", file);
    try { await uploadRequest(`/projects/${projectId}/designs`, body, setProgress); onCreated(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Request failed."); setUploading(false); }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !uploading) onClose(); }}>
    <section className="design-dialog" role="dialog" aria-modal="true" aria-labelledby="design-upload-title">
      <header><div><span>{ar ? "سجل التصميمات" : "DESIGN REGISTER"}</span><h2 id="design-upload-title">{labels.heading}</h2></div><button type="button" className="icon-button" onClick={onClose} disabled={uploading} aria-label={labels.close}><X size={20} /></button></header>
      <form onSubmit={(event) => void submit(event, false)}>
        <fieldset disabled={uploading}><legend>{labels.info}</legend>
          <label className="ui-field">{labels.title}<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} required autoFocus /></label>
          <label className="ui-field">{labels.discipline}<select value={discipline} onChange={(event) => setDiscipline(event.target.value as DesignDiscipline)}>{DESIGN_DISCIPLINES.map((item) => <option key={item} value={item}>{disciplineLabel(item, locale)}</option>)}</select></label>
          <label className="ui-field full-span">{labels.description}<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={3000} /></label>
        </fieldset>
        <fieldset disabled={uploading}><legend>{labels.file}</legend>
          <div className="upload-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={drop} onClick={() => inputRef.current?.click()} role="button" tabIndex={0}>
            <UploadCloud size={28} /><strong>{labels.drop}</strong><span>{labels.support}</span><input ref={inputRef} type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event: ChangeEvent<HTMLInputElement>) => choose(event.target.files?.[0])} hidden />
          </div>
          {file && <div className="selected-file"><span><bdi>{file.name}</bdi><small><bdi>{formatFileSize(file.size, locale)} · {file.type}</bdi></small></span><button type="button" onClick={() => choose()} aria-label={labels.close}><X size={16} /></button></div>}
        </fieldset>
        <fieldset disabled={uploading}><legend>{labels.revision}</legend><p className="field-hint"><bdi>REV 01</bdi> · {labels.revisionHint}</p><label className="ui-field">{labels.notes}<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} /></label></fieldset>
        {error && <div className="form-error">{error}</div>}
        {uploading && <div className="upload-progress"><span>{labels.uploading} <bdi>{progress}%</bdi></span><div><i style={{ width: `${progress}%` }} /></div></div>}
        <footer><button className="ui-button ui-button--secondary" type="submit" disabled={uploading}>{labels.draft}</button><button className="ui-button ui-button--accent" type="button" disabled={uploading} onClick={(event) => void submit(event, true)}>{labels.review}</button></footer>
      </form>
    </section>
  </div>;
}
