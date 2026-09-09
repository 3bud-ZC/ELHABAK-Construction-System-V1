"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  apiRequest,
  categoryLabel,
  mediaUrl,
  phaseLabel,
  statusLabel,
  type ProjectRecord,
  type UserRecord
} from "../../../lib/api";

type PortalProps = {
  projectId?: string;
};

export function ProjectPortal({ projectId }: PortalProps) {
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

  const labels = useMemo(
    () =>
      locale === "ar"
        ? {
            title: "مشاريعي",
            workerTitle: "تحديثات الموقع",
            lead: "المشاريع المصرح لك بها فقط.",
            empty: "لا توجد مشاريع مخصصة لك.",
            open: "فتح المشروع",
            back: "العودة للمشاريع",
            category: "الفئة",
            phase: "المرحلة",
            status: "الحالة",
            progress: "التقدم",
            dates: "التواريخ",
            updates: "تحديثات الموقع",
            noUpdates: "لا توجد تحديثات موقع بعد.",
            note: "ملاحظة قصيرة",
            files: "صور أو فيديو",
            submit: "إرسال التحديث",
            uploaded: "تم إرسال تحديث الموقع.",
            choose: "اختر مشروعاً للعرض."
          }
        : {
            title: "My Projects",
            workerTitle: "Site Updates",
            lead: "Only projects you are allowed to access.",
            empty: "No assigned projects.",
            open: "Open project",
            back: "Back to projects",
            category: "Category",
            phase: "Phase",
            status: "Status",
            progress: "Progress",
            dates: "Dates",
            updates: "Site updates",
            noUpdates: "No site updates yet.",
            note: "Short note",
            files: "Photos or video",
            submit: "Submit update",
            uploaded: "Site update submitted.",
            choose: "Choose a project to view."
          },
    [locale]
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      apiRequest<{ user: UserRecord }>("/auth/me"),
      projectId ? apiRequest<ProjectRecord>(`/projects/${projectId}`) : apiRequest<ProjectRecord[]>("/projects")
    ])
      .then(([me, result]) => {
        if (!alive) return;
        setUser(me.user);
        if (Array.isArray(result)) {
          setProjects(result);
          setProject(null);
        } else {
          setProject(result);
          setProjects([]);
        }
        setError("");
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

  function href(path: string) {
    return locale === "ar" ? path : `${path}?lang=en`;
  }

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files ?? []));
    setSuccess("");
  }

  async function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    setUploading(true);
    setError("");
    setSuccess("");
    const body = new FormData();
    body.set("note", note);
    files.forEach((file) => body.append("media", file));
    try {
      await apiRequest(`/projects/${project.id}/site-updates`, { method: "POST", body });
      const refreshed = await apiRequest<ProjectRecord>(`/projects/${project.id}`);
      setProject(refreshed);
      setFiles([]);
      setNote("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccess(labels.uploaded);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <section className="app-page"><div className="empty-state">{locale === "ar" ? "جاري التحميل..." : "Loading..."}</div></section>;
  }

  if (project) {
    const isWorker = user?.role === "WORKER";
    return (
      <section className="app-page worker-page">
        <div className="page-heading page-heading--row">
          <div>
            <h1>{project.name}</h1>
            <p>{project.code}</p>
          </div>
          <Link className="ui-button ui-button--secondary" href={href("/app/projects")}>{labels.back}</Link>
        </div>
        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}
        <div className="project-overview-grid">
          <div className="empty-state"><strong>{labels.category}</strong><span>{categoryLabel(project.category, locale)}</span></div>
          <div className="empty-state"><strong>{labels.phase}</strong><span>{phaseLabel(project.phase, locale)}</span></div>
          <div className="empty-state"><strong>{labels.status}</strong><span>{statusLabel(project.status, locale)}</span></div>
          <div className="empty-state"><strong>{labels.progress}</strong><span>{project.progress}%</span></div>
        </div>
        <div className="progress-track"><span style={{ width: `${project.progress}%` }} /></div>
        <div className="lifecycle-strip">
          {["SITE_INSPECTION", "DESIGN", "PRELIMINARY_ESTIMATION", "EXECUTION", "INITIAL_HANDOVER", "FINAL_HANDOVER"].map((phase) => {
            const phases = ["SITE_INSPECTION", "DESIGN", "PRELIMINARY_ESTIMATION", "EXECUTION", "INITIAL_HANDOVER", "FINAL_HANDOVER"];
            const state = phases.indexOf(phase) < phases.indexOf(project.phase) ? "done" : phase === project.phase ? "current" : "upcoming";
            return <span className={state} key={phase}>{phaseLabel(phase as ProjectRecord["phase"], locale)}</span>;
          })}
        </div>

        {isWorker && (
          <form className="admin-form upload-form" onSubmit={(event) => void submitUpdate(event)}>
            <label className="ui-field full-span">
              {labels.note}
              <textarea value={note} onChange={(event) => setNote(event.target.value)} />
            </label>
            <label className="ui-field full-span">
              {labels.files}
              <input ref={fileInputRef} type="file" accept="image/*,video/mp4,video/webm" multiple onChange={chooseFiles} required />
            </label>
            {files.length > 0 && (
              <div className="preview-grid full-span">
                {files.map((file) => (
                  <span key={`${file.name}-${file.size}`}>{file.name}</span>
                ))}
              </div>
            )}
            <button className="ui-button ui-button--primary full-span" type="submit" disabled={uploading || files.length === 0}>
              {uploading ? (locale === "ar" ? "جاري الإرسال..." : "Uploading...") : labels.submit}
            </button>
          </form>
        )}

        <section className="updates-panel">
          <h2>{labels.updates}</h2>
          {project.siteUpdates.length === 0 && <div className="empty-state">{labels.noUpdates}</div>}
          {project.siteUpdates.map((update) => (
            <article className="update-card" key={update.id}>
              <strong>{update.author.displayName}</strong>
              <span>{new Date(update.createdAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}</span>
              <p>{update.note || "-"}</p>
              <div className="media-grid">
                {update.media.map((media) =>
                  media.mediaType === "IMAGE" ? (
                    <img src={mediaUrl(project.id, media.id)} alt={media.originalFilename} key={media.id} />
                  ) : (
                    <video src={mediaUrl(project.id, media.id)} controls key={media.id} />
                  )
                )}
              </div>
            </article>
          ))}
        </section>
      </section>
    );
  }

  return (
    <section className="app-page">
      <div className="page-heading">
        <h1>{user?.role === "WORKER" ? labels.workerTitle : labels.title}</h1>
        <p>{labels.lead}</p>
      </div>
      {error && <div className="form-error">{error}</div>}
      {projects.length === 0 && <div className="empty-state">{labels.empty}</div>}
      <div className="data-table">
        {projects.map((item) => (
          <article className="data-row project-row" key={item.id}>
            <div><strong>{item.name}</strong><span>{item.code}</span></div>
            <div><strong>{labels.phase}</strong><span>{phaseLabel(item.phase, locale)}</span></div>
            <div><strong>{labels.progress}</strong><span>{item.progress}%</span></div>
            <Link className="ui-button ui-button--secondary" href={href(`/app/projects/${item.id}`)}>{labels.open}</Link>
          </article>
        ))}
      </div>
      {projects.length > 0 && <p className="muted-line">{labels.choose}</p>}
    </section>
  );
}
