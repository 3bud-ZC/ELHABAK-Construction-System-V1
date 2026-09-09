"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Badge, EmptyState, LoadingState, PageHeader } from "@elhabak/ui";
import { Calendar, Camera, FolderKanban, Info, UsersRound } from "lucide-react";
import {
  apiRequest,
  categoryLabel,
  mediaUrl,
  phaseLabel,
  roleLabel,
  statusLabel,
  statusTone,
  type ProjectRecord,
  type UserRecord
} from "../../../lib/api";
import { Lifecycle } from "../../../components/lifecycle";
import { ProjectWorkspace } from "../../../components/project-workspace";

type PortalProps = { projectId?: string; view?: "overview" | "site" };

export function ProjectPortal({ projectId, view = "overview" }: PortalProps) {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const [user, setUser] = useState<UserRecord | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const labels = useMemo(() => locale === "ar" ? {
    title: "مشاريعي", workerTitle: "تحديثات الموقع", lead: "المشاريع المصرح لك بالوصول إليها.", workerLead: "اختر مشروعاً لرفع تحديث ميداني جديد.",
    empty: "لا توجد مشاريع مخصصة لك", emptyHint: "سيظهر هنا أي مشروع يتم تعيينك عليه.", summary: "ملخص المشروع", dates: "الجدول الزمني",
    team: "فريق المشروع", notes: "ملاحظات المشروع", noNotes: "لا توجد ملاحظات مسجلة.", updates: "سجل نشاط الموقع",
    updatesLead: "تحديثات ميدانية موثقة زمنياً من فريق التنفيذ.", noUpdates: "لا توجد تحديثات موقع بعد", noUpdatesHintWorker: "ارفع أول تحديث ميداني لهذا المشروع.",
    noUpdatesHintClient: "ستظهر هنا تحديثات فريق العمل أولاً بأول.", note: "ملاحظة قصيرة (اختياري)", files: "صور أو فيديو", submit: "إرسال التحديث",
    uploaded: "تم إرسال تحديث الموقع بنجاح.", noDates: "غير محدد", loadingLabel: "جاري تحميل مساحة المشروع...", start: "تاريخ البدء",
    target: "التسليم المستهدف", category: "فئة المشروع", phase: "مرحلة العمل", workers: "الفريق الميداني", none: "غير معين"
  } : {
    title: "My Projects", workerTitle: "Site Updates", lead: "Projects you are authorized to access.", workerLead: "Choose a project to upload a new field update.",
    empty: "No assigned projects", emptyHint: "Any project you are assigned to will appear here.", summary: "Project summary", dates: "Schedule",
    team: "Project team", notes: "Project notes", noNotes: "No project notes recorded.", updates: "Site activity register",
    updatesLead: "Timestamped field updates from the delivery team.", noUpdates: "No site updates yet", noUpdatesHintWorker: "Upload the first field update for this project.",
    noUpdatesHintClient: "Updates from the field team will appear here as they happen.", note: "Short note (optional)", files: "Photos or video", submit: "Submit update",
    uploaded: "Site update submitted successfully.", noDates: "Not set", loadingLabel: "Loading project workspace...", start: "Start date",
    target: "Target delivery", category: "Project category", phase: "Work phase", workers: "Field team", none: "Unassigned"
  }, [locale]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      apiRequest<{ user: UserRecord }>("/auth/me"),
      projectId ? apiRequest<ProjectRecord>(`/projects/${projectId}`) : apiRequest<ProjectRecord[]>("/projects")
    ]).then(([me, result]) => {
      if (!alive) return;
      setUser(me.user);
      if (Array.isArray(result)) { setProjects(result); setProject(null); }
      else { setProject(result); setProjects([]); }
      setError("");
    }).catch((requestError: Error) => { if (alive) setError(requestError.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [projectId]);

  function href(path: string) { return locale === "ar" ? path : `${path}?lang=en`; }

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files ?? []));
    setSuccess("");
  }

  async function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    setUploading(true); setError(""); setSuccess("");
    const body = new FormData();
    body.set("note", note);
    files.forEach((file) => body.append("media", file));
    try {
      await apiRequest(`/projects/${project.id}/site-updates`, { method: "POST", body });
      setProject(await apiRequest<ProjectRecord>(`/projects/${project.id}`));
      setFiles([]); setNote("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccess(labels.uploaded);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
    } finally { setUploading(false); }
  }

  if (loading) return <section className="app-page"><LoadingState label={labels.loadingLabel} /></section>;

  const isWorker = user?.role === "WORKER";
  const dateFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium" });

  if (project && user) {
    return (
      <section className={`app-page project-workspace-page ${isWorker ? "worker-shell" : ""}`}>
        <ProjectWorkspace project={project} locale={locale} role={user.role} active={view === "site" ? "site" : "overview"} />
        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        {view === "overview" && <div className="project-overview-v2">
          <Lifecycle phase={project.phase} locale={locale} />
          <div className="workspace-grid">
            <section className="workspace-panel">
              <div className="workspace-panel__title"><Info size={17} /><h2>{labels.summary}</h2></div>
              <dl className="detail-list">
                <div><dt>{labels.category}</dt><dd>{categoryLabel(project.category, locale)}</dd></div>
                <div><dt>{labels.phase}</dt><dd><Badge tone="navy">{phaseLabel(project.phase, locale)}</Badge></dd></div>
                <div><dt>{labels.notes}</dt><dd>{project.notes ?? labels.noNotes}</dd></div>
              </dl>
            </section>
            <section className="workspace-panel">
              <div className="workspace-panel__title"><Calendar size={17} /><h2>{labels.dates}</h2></div>
              <dl className="detail-list">
                <div><dt>{labels.start}</dt><dd><bdi>{project.startDate ? dateFormatter.format(new Date(project.startDate)) : labels.noDates}</bdi></dd></div>
                <div><dt>{labels.target}</dt><dd><bdi>{project.targetDate ? dateFormatter.format(new Date(project.targetDate)) : labels.noDates}</bdi></dd></div>
              </dl>
            </section>
            <section className="workspace-panel workspace-panel--wide">
              <div className="workspace-panel__title"><UsersRound size={17} /><h2>{labels.team}</h2></div>
              <div className="team-strip">
                <span><small>{locale === "ar" ? "المهندس المسؤول" : "Responsible engineer"}</small><strong>{project.engineer?.displayName ?? labels.none}</strong></span>
                <span><small>{labels.workers}</small><strong>{project.workers.map((worker) => worker.displayName).join(locale === "ar" ? "، " : ", ") || labels.none}</strong></span>
              </div>
            </section>
          </div>
        </div>}

        {view === "site" && <>
          <div className="section-title section-title--with-lead"><div><h2>{labels.updates}</h2><p>{labels.updatesLead}</p></div></div>
          {(isWorker || user.role === "ENGINEER") && <form className="admin-form upload-form site-upload-panel" onSubmit={(event) => void submitUpdate(event)}>
            <label className="ui-field full-span">{labels.note}<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label>
            <label className="ui-field full-span">{labels.files}<input ref={fileInputRef} type="file" accept="image/*,video/mp4,video/webm" multiple onChange={chooseFiles} required /></label>
            {files.length > 0 && <div className="preview-grid full-span">{files.map((file) => <bdi key={`${file.name}-${file.size}`}>{file.name}</bdi>)}</div>}
            <button className="ui-button ui-button--primary full-span" type="submit" disabled={uploading || files.length === 0}>{uploading ? (locale === "ar" ? "جاري الإرسال..." : "Uploading...") : labels.submit}</button>
          </form>}
          <section className="updates-panel">
            {project.siteUpdates.length === 0 && <EmptyState icon={<Camera size={20} />} title={labels.noUpdates} description={isWorker ? labels.noUpdatesHintWorker : labels.noUpdatesHintClient} />}
            {project.siteUpdates.map((update) => <article className="update-card" key={update.id}>
              <div className="update-card__head">
                <div className="update-card__author"><span className="update-card__avatar">{update.author.displayName.slice(0, 2).toUpperCase()}</span><span><strong>{update.author.displayName}</strong><span>{roleLabel(update.author.role, locale)}</span></span></div>
                <time><bdi>{new Date(update.createdAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}</bdi></time>
              </div>
              {update.note && <p>{update.note}</p>}
              {update.media.length > 0 && <div className="media-grid">{update.media.map((media) => <figure key={media.id}>{media.mediaType === "IMAGE" ? <img src={mediaUrl(project.id, media.id)} alt={media.originalFilename} loading="lazy" /> : <video src={mediaUrl(project.id, media.id)} controls preload="metadata" />}</figure>)}</div>}
            </article>)}
          </section>
        </>}
      </section>
    );
  }

  return <section className="app-page">
    <PageHeader title={isWorker ? labels.workerTitle : labels.title} description={isWorker ? labels.workerLead : labels.lead} />
    {error && <div className="form-error">{error}</div>}
    {projects.length === 0 && <EmptyState icon={<FolderKanban size={20} />} title={labels.empty} description={labels.emptyHint} />}
    {projects.length > 0 && <div className="data-table">{projects.map((item) => <Link className="mini-project-row" href={href(`/app/projects/${item.id}${isWorker ? "/site-activity" : ""}`)} key={item.id}>
      <div className="mini-project-row__id"><strong>{item.name}</strong><bdi className="mono">{item.code}</bdi></div>
      <div className="mini-project-row__phase">{phaseLabel(item.phase, locale)}</div>
      <div className="mini-project-row__progress"><div className="progress-track"><span style={{ width: `${item.progress}%` }} /></div><strong><bdi>{item.progress}%</bdi></strong></div>
      <Badge tone={statusTone(item.status)}>{statusLabel(item.status, locale)}</Badge>
    </Link>)}</div>}
  </section>;
}
