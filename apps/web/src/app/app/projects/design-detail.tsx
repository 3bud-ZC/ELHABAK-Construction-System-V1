"use client";

import { useSearchParams } from "next/navigation";
import { ChangeEvent, DragEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, LoadingState } from "@elhabak/ui";
import { Check, Download, FileClock, FileText, MessageSquare, Pencil, Send, UploadCloud, X, XCircle } from "lucide-react";
import { ProjectWorkspace } from "../../../components/project-workspace";
import {
  DESIGN_DISCIPLINES,
  apiRequest,
  designEventLabel,
  designFileUrl,
  designStatusLabel,
  designStatusTone,
  disciplineLabel,
  formatFileSize,
  roleLabel,
  uploadRequest,
  type DesignDiscipline,
  type DesignRecord,
  type DesignRevisionRecord,
  type ProjectRecord,
  type UserRecord
} from "../../../lib/api";

export function DesignDetail({ projectId, designId }: { projectId: string; designId: string }) {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const [user, setUser] = useState<UserRecord | null>(null);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [design, setDesign] = useState<DesignRecord | null>(null);
  const [selectedRevisionId, setSelectedRevisionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mutating, setMutating] = useState(false);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT" | null>(null);
  const [decisionComment, setDecisionComment] = useState("");
  const [comment, setComment] = useState("");
  const [showRevision, setShowRevision] = useState(false);
  const [editing, setEditing] = useState(false);

  const labels = useMemo(() => ar ? {
    loading: "جاري تحميل تفاصيل التصميم...", back: "سجل التصميمات", current: "المراجعة الحالية", discipline: "التخصص", uploader: "رافع الملف", uploaded: "تاريخ الرفع",
    description: "وصف التصميم", file: "ملف المراجعة", preview: "معاينة الملف", download: "تنزيل", revisionHistory: "سجل المراجعات", newest: "الأحدث",
    activity: "سجل الاعتماد والنشاط", noComment: "دون تعليق", newRevision: "رفع مراجعة جديدة", submit: "إرسال للمراجعة", submitConfirm: "تأكيد إرسال هذه المراجعة للعميل؟",
    cancel: "إلغاء", confirm: "تأكيد", approve: "اعتماد", reject: "رفض", approvalTitle: "قرار العميل", approvalLead: "راجع الملف والبيانات قبل تسجيل القرار النهائي.",
    commentOptional: "تعليق (اختياري عند الاعتماد)", rejectionRequired: "سبب الرفض مطلوب", addComment: "إضافة تعليق", commentPlaceholder: "اكتب تعليقاً مرتبطاً بهذه المراجعة...",
    commentSaved: "تمت إضافة التعليق.", approved: "تم اعتماد المراجعة وتسجيل القرار.", rejected: "تم رفض المراجعة وحفظ التعليق.", submitted: "تم إرسال المراجعة للعميل.",
    edit: "تعديل البيانات", save: "حفظ التعديلات", title: "عنوان التصميم", updated: "تم تحديث بيانات التصميم.", pdfFallback: "إذا لم تظهر المعاينة، نزّل الملف لفتحه.", fileMeta: "بيانات الملف"
  } : {
    loading: "Loading design detail...", back: "Design register", current: "Current revision", discipline: "Discipline", uploader: "Uploader", uploaded: "Uploaded",
    description: "Design description", file: "Revision file", preview: "File preview", download: "Download", revisionHistory: "Revision history", newest: "Newest",
    activity: "Approval and activity history", noComment: "No comment", newRevision: "Upload revision", submit: "Submit for review", submitConfirm: "Submit this revision to the client for review?",
    cancel: "Cancel", confirm: "Confirm", approve: "Approve", reject: "Reject", approvalTitle: "Client decision", approvalLead: "Inspect the file and metadata before recording a final decision.",
    commentOptional: "Comment (optional for approval)", rejectionRequired: "Rejection reason is required", addComment: "Add comment", commentPlaceholder: "Write a comment linked to this revision...",
    commentSaved: "Comment added.", approved: "Revision approved and decision recorded.", rejected: "Revision rejected and comment preserved.", submitted: "Revision submitted to client.",
    edit: "Edit details", save: "Save changes", title: "Design title", updated: "Design details updated.", pdfFallback: "If preview does not load, download the file to open it.", fileMeta: "File metadata"
  }, [ar]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [me, projectResult, designResult] = await Promise.all([
        apiRequest<{ user: UserRecord }>("/auth/me"), apiRequest<ProjectRecord>(`/projects/${projectId}`), apiRequest<DesignRecord>(`/projects/${projectId}/designs/${designId}`)
      ]);
      setUser(me.user); setProject(projectResult); setDesign(designResult);
      setSelectedRevisionId((current) => current && designResult.revisions.some((item) => item.id === current) ? current : designResult.currentRevision.id);
      setError("");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Request failed."); }
    finally { setLoading(false); }
  }, [designId, projectId]);

  useEffect(() => { void load(); }, [load]);

  async function mutate(path: string, body: object, message: string) {
    setMutating(true); setError(""); setSuccess("");
    try {
      const updated = await apiRequest<DesignRecord>(path, { method: "POST", body: JSON.stringify(body) });
      setDesign(updated); setSelectedRevisionId(updated.currentRevision.id); setSuccess(message); setDecision(null); setDecisionComment("");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Request failed."); }
    finally { setMutating(false); }
  }

  if (loading || !project || !user || !design) return <section className="app-page"><LoadingState label={labels.loading} />{error && <div className="form-error">{error}</div>}</section>;

  const selected = design.revisions.find((revision) => revision.id === selectedRevisionId) ?? design.currentRevision;
  const canManage = user.role === "ADMIN" || user.role === "ENGINEER";
  const canDecide = user.role === "CLIENT" && design.currentRevision.status === "IN_REVIEW" && selected.id === design.currentRevision.id;
  const dateTime = (value: string) => new Date(value).toLocaleString(ar ? "ar-EG" : "en-US", { dateStyle: "medium", timeStyle: "short" });

  async function addComment(event: FormEvent) {
    event.preventDefault();
    if (!comment.trim()) return;
    await mutate(`/projects/${projectId}/designs/${designId}/comments`, { revisionId: selected.id, comment }, labels.commentSaved);
    setComment("");
  }

  return <section className="app-page project-workspace-page">
    <ProjectWorkspace project={project} locale={locale} role={user.role} active="design" />
    <div className="design-detail-heading">
      <div className="design-detail-identity">
        <span className="section-kicker">{ar ? "مراقبة المستندات الهندسية" : "ENGINEERING DOCUMENT CONTROL"} // <bdi className="mono">{selected.revisionCode}</bdi></span>
        <h2>{design.title}</h2>
        <div className="design-detail-badges">
          <Badge tone={designStatusTone(selected.status)}>{designStatusLabel(selected.status, locale)}</Badge>
          <span className="discipline-tag mono">{disciplineLabel(design.discipline, locale)}</span>
        </div>
      </div>
      <div className="design-detail-actions">
        {canManage && (
          <>
            <button className="ui-button ui-button--secondary ui-button--sm" type="button" onClick={() => setEditing(true)}>
              <Pencil size={15} />{labels.edit}
            </button>
            <button className="ui-button ui-button--accent ui-button--sm" type="button" onClick={() => setShowRevision(true)}>
              <UploadCloud size={15} />{labels.newRevision}
            </button>
          </>
        )}
      </div>
    </div>
    {error && <div className="form-error">{error}</div>}
    {success && <div className="form-success">{success}</div>}

    <div className="design-detail-layout">
      <main className="design-preview-column">
        <section className="workspace-panel design-file-panel">
          <div className="workspace-panel__title">
            <div className="workspace-panel__title-left">
              <FileText size={16} />
              <h3>{labels.preview}</h3>
              <span className="drawing-sheet-tag mono"><bdi>{selected.revisionCode} · {selected.mimeType === "application/pdf" ? "PDF" : "IMG"}</bdi></span>
            </div>
            <a className="ui-button ui-button--secondary ui-button--sm" href={designFileUrl(projectId, designId, selected.id, true)}>
              <Download size={14} />{labels.download} ({formatFileSize(selected.fileSize, locale)})
            </a>
          </div>
          <div className="cad-preview-frame">
            <FilePreview projectId={projectId} designId={designId} revision={selected} fallback={labels.pdfFallback} />
          </div>
          <div className="drawing-titleblock">
            <div className="drawing-titleblock__cell">
              <span className="titleblock-label">{labels.file}</span>
              <strong className="mono"><bdi>{selected.originalFilename}</bdi></strong>
            </div>
            <div className="drawing-titleblock__cell">
              <span className="titleblock-label">{labels.discipline}</span>
              <strong>{disciplineLabel(design.discipline, locale)}</strong>
            </div>
            <div className="drawing-titleblock__cell">
              <span className="titleblock-label">{labels.current}</span>
              <strong className="mono"><bdi>{selected.revisionCode}</bdi></strong>
            </div>
            <div className="drawing-titleblock__cell">
              <span className="titleblock-label">{labels.fileMeta}</span>
              <strong className="mono"><bdi>{selected.mimeType} · {formatFileSize(selected.fileSize, locale)}</bdi></strong>
            </div>
          </div>
        </section>

        {canDecide && (
          <section className="approval-panel">
            <div className="approval-panel__head">
              <span className="approval-panel__icon"><FileClock size={20} /></span>
              <div>
                <h3>{labels.approvalTitle}</h3>
                <p>{labels.approvalLead}</p>
              </div>
            </div>
            {!decision && (
              <div className="approval-panel__actions">
                <button className="ui-button ui-button--success" type="button" onClick={() => setDecision("APPROVE")}>
                  <Check size={16} />{labels.approve}
                </button>
                <button className="ui-button ui-button--danger" type="button" onClick={() => setDecision("REJECT")}>
                  <XCircle size={16} />{labels.reject}
                </button>
              </div>
            )}
            {decision && (
              <div className="approval-confirm">
                <label className="ui-field">
                  <span>{decision === "REJECT" ? labels.rejectionRequired : labels.commentOptional}</span>
                  <textarea value={decisionComment} onChange={(event) => setDecisionComment(event.target.value)} required={decision === "REJECT"} placeholder={decision === "REJECT" ? (ar ? "اذكر سبب رفض المراجعة والملاحظات المطلوبة..." : "State reason for rejection and required changes...") : ""} />
                </label>
                <div className="approval-confirm__actions">
                  <button className="ui-button ui-button--secondary ui-button--sm" type="button" onClick={() => setDecision(null)} disabled={mutating}>
                    {labels.cancel}
                  </button>
                  <button className={`ui-button ui-button--sm ${decision === "APPROVE" ? "ui-button--success" : "ui-button--danger"}`} type="button" disabled={mutating || (decision === "REJECT" && !decisionComment.trim())} onClick={() => void mutate(`/projects/${projectId}/designs/${designId}/revisions/${selected.id}/decision`, { action: decision, comment: decisionComment }, decision === "APPROVE" ? labels.approved : labels.rejected)}>
                    {labels.confirm} {decision === "APPROVE" ? labels.approve : labels.reject}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="workspace-panel">
          <div className="workspace-panel__title">
            <MessageSquare size={16} />
            <h3>{labels.addComment}</h3>
          </div>
          <form className="comment-form" onSubmit={(event) => void addComment(event)}>
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder={labels.commentPlaceholder} maxLength={2000} />
            <div className="comment-form__footer">
              <button className="ui-button ui-button--primary ui-button--sm" type="submit" disabled={mutating || !comment.trim()}>
                <Send size={14} />{labels.addComment}
              </button>
            </div>
          </form>
        </section>
      </main>

      <aside className="design-detail-sidebar">
        <section className="workspace-panel">
          <div className="workspace-panel__title">
            <FileText size={16} />
            <h3>{labels.current}</h3>
          </div>
          <dl className="detail-list compact">
            <div><dt>{labels.current}</dt><dd><bdi className="revision-badge mono">{design.currentRevision.revisionCode}</bdi></dd></div>
            <div><dt>{labels.discipline}</dt><dd>{disciplineLabel(design.discipline, locale)}</dd></div>
            <div><dt>{labels.uploader}</dt><dd>{selected.uploader.displayName}</dd></div>
            <div><dt>{labels.uploaded}</dt><dd><bdi className="mono">{dateTime(selected.createdAt)}</bdi></dd></div>
            <div><dt>{labels.description}</dt><dd>{design.description || "—"}</dd></div>
          </dl>
          {canManage && design.currentRevision.status === "DRAFT" && (
            <SubmitRevisionButton labels={labels} disabled={mutating} onConfirm={() => void mutate(`/projects/${projectId}/designs/${designId}/revisions/${design.currentRevision.id}/submit`, {}, labels.submitted)} />
          )}
        </section>

        <section className="workspace-panel">
          <div className="workspace-panel__title">
            <FileClock size={16} />
            <h3>{labels.revisionHistory}</h3>
          </div>
          <div className="revision-list">
            {design.revisions.map((revision, index) => (
              <button className={`revision-card ${selected.id === revision.id ? "active" : ""}`} type="button" key={revision.id} onClick={() => setSelectedRevisionId(revision.id)}>
                <div className="revision-card__header">
                  <span className="revision-badge mono"><bdi>{revision.revisionCode}</bdi></span>
                  {index === 0 && <span className="revision-tag revision-tag--newest">{labels.newest}</span>}
                  <Badge tone={designStatusTone(revision.status)}>{designStatusLabel(revision.status, locale)}</Badge>
                </div>
                <time className="mono"><bdi>{dateTime(revision.createdAt)}</bdi></time>
                <span className="revision-card__filename mono"><bdi>{revision.originalFilename}</bdi></span>
              </button>
            ))}
          </div>
        </section>

        <section className="workspace-panel">
          <div className="workspace-panel__title">
            <FileClock size={16} />
            <h3>{labels.activity}</h3>
          </div>
          <div className="activity-timeline">
            {design.events.map((event) => {
              const revision = design.revisions.find((item) => item.id === event.revisionId);
              return (
                <article key={event.id} className="activity-item">
                  <i className="activity-node" aria-hidden="true" />
                  <div className="activity-content">
                    <div className="activity-header">
                      <strong>{designEventLabel(event.action, locale)}</strong>
                      {revision && <span className="activity-revision mono"><bdi>{revision.revisionCode}</bdi></span>}
                    </div>
                    <span className="activity-actor">{event.actor.displayName} · {roleLabel(event.actor.role, locale)}</span>
                    <time className="activity-time mono"><bdi>{dateTime(event.createdAt)}</bdi></time>
                    {event.comment && <p className="activity-comment">{event.comment}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </aside>
    </div>
    {showRevision && <RevisionUploadDialog projectId={projectId} design={design} locale={locale} onClose={() => setShowRevision(false)} onUpdated={(updated) => { setDesign(updated); setSelectedRevisionId(updated.currentRevision.id); setShowRevision(false); setSuccess(ar ? "تم رفع المراجعة الجديدة." : "New revision uploaded."); }} />}
    {editing && <EditDesignDialog projectId={projectId} design={design} locale={locale} onClose={() => setEditing(false)} onUpdated={(updated) => { setDesign(updated); setEditing(false); setSuccess(labels.updated); }} />}
  </section>;
}

function FilePreview({ projectId, designId, revision, fallback }: { projectId: string; designId: string; revision: DesignRevisionRecord; fallback: string }) {
  const src = designFileUrl(projectId, designId, revision.id);
  if (revision.mimeType.startsWith("image/")) return <div className="file-preview file-preview--image"><img src={src} alt={revision.originalFilename} /></div>;
  return <div className="file-preview file-preview--pdf"><iframe src={src} title={revision.originalFilename} /><p>{fallback}</p></div>;
}

function SubmitRevisionButton({ labels, disabled, onConfirm }: { labels: Record<string, string>; disabled: boolean; onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) return <button className="ui-button ui-button--accent full-width" type="button" onClick={() => setConfirming(true)}><Send size={15} />{labels.submit}</button>;
  return <div className="inline-confirm"><strong>{labels.submitConfirm}</strong><div><button className="ui-button ui-button--secondary ui-button--sm" type="button" onClick={() => setConfirming(false)}>{labels.cancel}</button><button className="ui-button ui-button--accent ui-button--sm" type="button" onClick={onConfirm} disabled={disabled}>{labels.confirm}</button></div></div>;
}

function RevisionUploadDialog({ projectId, design, locale, onClose, onUpdated }: { projectId: string; design: DesignRecord; locale: "ar" | "en"; onClose: () => void; onUpdated: (design: DesignRecord) => void }) {
  const ar = locale === "ar"; const [file, setFile] = useState<File | null>(null); const [notes, setNotes] = useState(""); const [error, setError] = useState(""); const [uploading, setUploading] = useState(false); const [progress, setProgress] = useState(0); const inputRef = useRef<HTMLInputElement>(null);
  const labels = ar ? { title: "رفع مراجعة جديدة", next: "المراجعة التالية", notes: "ملاحظات المراجعة", choose: "اسحب الملف هنا أو اختر من جهازك", support: "PDF أو PNG أو JPG/JPEG", draft: "حفظ كمسودة", review: "رفع وإرسال للمراجعة", close: "إغلاق", required: "اختر ملفاً صالحاً.", uploading: "جاري الرفع" } : { title: "Upload new revision", next: "Next revision", notes: "Revision notes", choose: "Drop file here or choose from device", support: "PDF, PNG, or JPG/JPEG", draft: "Save draft", review: "Upload & submit for review", close: "Close", required: "Choose a valid file.", uploading: "Uploading" };
  function choose(selected?: File) { setFile(selected ?? null); setError(""); }
  function drop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); choose(event.dataTransfer.files[0]); }
  async function submit(event: FormEvent, submitForReview: boolean) { event.preventDefault(); if (!file) { setError(labels.required); return; } setUploading(true); const body = new FormData(); body.set("notes", notes); body.set("submitForReview", String(submitForReview)); body.set("file", file); try { onUpdated(await uploadRequest(`/projects/${projectId}/designs/${design.id}/revisions`, body, setProgress)); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Request failed."); setUploading(false); } }
  return <div className="modal-backdrop"><section className="design-dialog design-dialog--compact" role="dialog" aria-modal="true"><header><div><span>{labels.next}</span><h2>{labels.title}</h2></div><button className="icon-button" type="button" onClick={onClose} disabled={uploading} aria-label={labels.close}><X size={20} /></button></header><form onSubmit={(event) => void submit(event, false)}><div className="next-revision"><bdi>REV {String(design.currentRevisionNumber + 1).padStart(2, "0")}</bdi></div><div className="upload-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={drop} onClick={() => inputRef.current?.click()} role="button" tabIndex={0}><UploadCloud size={27} /><strong>{labels.choose}</strong><span>{labels.support}</span><input ref={inputRef} type="file" accept="application/pdf,image/png,image/jpeg" hidden onChange={(event: ChangeEvent<HTMLInputElement>) => choose(event.target.files?.[0])} /></div>{file && <div className="selected-file"><span><bdi>{file.name}</bdi><small>{formatFileSize(file.size, locale)}</small></span><button type="button" onClick={() => choose()}><X size={16} /></button></div>}<label className="ui-field">{labels.notes}<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>{error && <div className="form-error">{error}</div>}{uploading && <div className="upload-progress"><span>{labels.uploading} <bdi>{progress}%</bdi></span><div><i style={{ width: `${progress}%` }} /></div></div>}<footer><button className="ui-button ui-button--secondary" type="submit" disabled={uploading}>{labels.draft}</button><button className="ui-button ui-button--primary" type="button" disabled={uploading} onClick={(event) => void submit(event, true)}>{labels.review}</button></footer></form></section></div>;
}

function EditDesignDialog({ projectId, design, locale, onClose, onUpdated }: { projectId: string; design: DesignRecord; locale: "ar" | "en"; onClose: () => void; onUpdated: (design: DesignRecord) => void }) {
  const ar = locale === "ar"; const [title, setTitle] = useState(design.title); const [description, setDescription] = useState(design.description ?? ""); const [discipline, setDiscipline] = useState<DesignDiscipline>(design.discipline); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const labels = ar ? { heading: "تعديل بيانات التصميم", title: "العنوان", description: "الوصف", discipline: "التخصص", save: "حفظ", cancel: "إلغاء" } : { heading: "Edit design details", title: "Title", description: "Description", discipline: "Discipline", save: "Save", cancel: "Cancel" };
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); try { onUpdated(await apiRequest(`/projects/${projectId}/designs/${design.id}`, { method: "PATCH", body: JSON.stringify({ title, description, discipline }) })); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Request failed."); setSaving(false); } }
  return <div className="modal-backdrop"><section className="design-dialog design-dialog--compact" role="dialog" aria-modal="true"><header><h2>{labels.heading}</h2><button className="icon-button" type="button" onClick={onClose}><X size={20} /></button></header><form onSubmit={(event) => void submit(event)}><fieldset disabled={saving}><label className="ui-field">{labels.title}<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label><label className="ui-field">{labels.discipline}<select value={discipline} onChange={(event) => setDiscipline(event.target.value as DesignDiscipline)}>{DESIGN_DISCIPLINES.map((item) => <option key={item} value={item}>{disciplineLabel(item, locale)}</option>)}</select></label><label className="ui-field full-span">{labels.description}<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label></fieldset>{error && <div className="form-error">{error}</div>}<footer><button className="ui-button ui-button--secondary" type="button" onClick={onClose}>{labels.cancel}</button><button className="ui-button ui-button--primary" type="submit" disabled={saving}>{labels.save}</button></footer></form></section></div>;
}
