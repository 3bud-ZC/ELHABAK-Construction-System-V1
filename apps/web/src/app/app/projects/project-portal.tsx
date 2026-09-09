"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Badge, EmptyState, LoadingState, PageHeader } from "@elhabak/ui";
import { Calendar, Camera, FolderKanban, MapPin } from "lucide-react";
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
            lead: "المشاريع المصرح لك بالوصول إليها.",
            workerLead: "اختر مشروعاً لرفع تحديث ميداني جديد.",
            empty: "لا توجد مشاريع مخصصة لك",
            emptyHint: "سيظهر هنا أي مشروع يتم تعيينك عليه.",
            open: "فتح المشروع",
            back: "العودة للمشاريع",
            category: "الفئة",
            location: "الموقع",
            dates: "التواريخ",
            progress: "التقدم",
            updates: "تحديثات الموقع",
            noUpdates: "لا توجد تحديثات موقع بعد",
            noUpdatesHintWorker: "ارفع أول تحديث ميداني لهذا المشروع.",
            noUpdatesHintClient: "ستظهر هنا تحديثات فريق العمل أولاً بأول.",
            note: "ملاحظة قصيرة (اختياري)",
            files: "صور أو فيديو",
            submit: "إرسال التحديث",
            uploaded: "تم إرسال تحديث الموقع بنجاح.",
            choose: "اختر مشروعاً للعرض.",
            noDates: "لم تحدد",
            noLocation: "بلا موقع محدد",
            loadingLabel: "جاري التحميل..."
          }
        : {
            title: "My Projects",
            workerTitle: "Site Updates",
            lead: "Projects you are authorized to access.",
            workerLead: "Choose a project to upload a new field update.",
            empty: "No assigned projects",
            emptyHint: "Any project you are assigned to will appear here.",
            open: "Open project",
            back: "Back to projects",
            category: "Category",
            location: "Location",
            dates: "Dates",
            progress: "Progress",
            updates: "Site updates",
            noUpdates: "No site updates yet",
            noUpdatesHintWorker: "Upload the first field update for this project.",
            noUpdatesHintClient: "Updates from the field team will appear here as they happen.",
            note: "Short note (optional)",
            files: "Photos or video",
            submit: "Submit update",
            uploaded: "Site update submitted successfully.",
            choose: "Choose a project to view.",
            noDates: "Not set",
            noLocation: "No location set",
            loadingLabel: "Loading..."
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
    return (
      <section className="app-page">
        <LoadingState label={labels.loadingLabel} />
      </section>
    );
  }

  const isWorker = user?.role === "WORKER";
  const dateFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium" });

  if (project) {
    return (
      <section className={`app-page ${isWorker ? "worker-shell" : ""}`}>
        <PageHeader
          title={project.name}
          description={project.code ?? undefined}
          actions={
            <Link className="ui-button ui-button--secondary ui-button--sm" href={href("/app/projects")}>
              {labels.back}
            </Link>
          }
        />
        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        {!isWorker && (
          <>
            <div className="overview-header">
              <div className="overview-header__top">
                <div>
                  <span className="overview-header__code mono">{project.code}</span>
                  <h1>{project.name}</h1>
                  <div className="overview-header__tags">
                    <Badge tone="orange">{categoryLabel(project.category, locale)}</Badge>
                    <Badge tone={statusTone(project.status)}>{statusLabel(project.status, locale)}</Badge>
                  </div>
                </div>
                <div className="overview-header__progress">
                  <span>{labels.progress}</span>
                  <strong>{project.progress}%</strong>
                  <div className="progress-track">
                    <span style={{ width: `${project.progress}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <Lifecycle phase={project.phase} locale={locale} />

            <div className="overview-modules" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: "var(--space-4)" }}>
              <div className="overview-module">
                <span className="overview-module__label">
                  <MapPin size={14} /> {labels.location}
                </span>
                <strong>{project.location ?? labels.noLocation}</strong>
              </div>
              <div className="overview-module">
                <span className="overview-module__label">
                  <Calendar size={14} /> {labels.dates}
                </span>
                <strong>
                  {project.startDate ? dateFormatter.format(new Date(project.startDate)) : labels.noDates}
                  {" — "}
                  {project.targetDate ? dateFormatter.format(new Date(project.targetDate)) : labels.noDates}
                </strong>
              </div>
            </div>
          </>
        )}

        {isWorker && (
          <>
            <div className="worker-project-card" style={{ marginBottom: "var(--space-4)" }}>
              <div>
                <strong>{phaseLabel(project.phase, locale)}</strong>
                <span>{project.progress}% {locale === "ar" ? "منجز" : "complete"}</span>
              </div>
              <Badge tone={statusTone(project.status)}>{statusLabel(project.status, locale)}</Badge>
            </div>
            <div className="progress-track" style={{ marginBottom: "var(--space-5)" }}>
              <span style={{ width: `${project.progress}%` }} />
            </div>

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
          </>
        )}

        <section className="updates-panel">
          <div className="section-title">
            <h2>{labels.updates}</h2>
          </div>
          {project.siteUpdates.length === 0 && (
            <EmptyState
              icon={<Camera size={20} />}
              title={labels.noUpdates}
              description={isWorker ? labels.noUpdatesHintWorker : labels.noUpdatesHintClient}
            />
          )}
          {project.siteUpdates.map((update) => (
            <article className="update-card" key={update.id}>
              <div className="update-card__head">
                <div className="update-card__author">
                  <span className="update-card__avatar">{update.author.displayName.slice(0, 2).toUpperCase()}</span>
                  <span>
                    <strong>{update.author.displayName}</strong>
                    <span>{roleLabel(update.author.role, locale)}</span>
                  </span>
                </div>
                <time>{new Date(update.createdAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}</time>
              </div>
              {update.note && <p>{update.note}</p>}
              {update.media.length > 0 && (
                <div className="media-grid">
                  {update.media.map((media) => (
                    <figure key={media.id}>
                      {media.mediaType === "IMAGE" ? (
                        <img src={mediaUrl(project.id, media.id)} alt={media.originalFilename} loading="lazy" />
                      ) : (
                        <video src={mediaUrl(project.id, media.id)} controls preload="metadata" />
                      )}
                    </figure>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>
      </section>
    );
  }

  return (
    <section className="app-page">
      <PageHeader title={isWorker ? labels.workerTitle : labels.title} description={isWorker ? labels.workerLead : labels.lead} />
      {error && <div className="form-error">{error}</div>}
      {projects.length === 0 && <EmptyState icon={<FolderKanban size={20} />} title={labels.empty} description={labels.emptyHint} />}
      {projects.length > 0 && (
        <div className="data-table">
          {projects.map((item) => (
            <Link className="mini-project-row" href={href(`/app/projects/${item.id}`)} key={item.id}>
              <div className="mini-project-row__id">
                <strong>{item.name}</strong>
                <span className="mono">{item.code}</span>
              </div>
              <div className="mini-project-row__phase">{phaseLabel(item.phase, locale)}</div>
              <div className="mini-project-row__progress">
                <div className="progress-track">
                  <span style={{ width: `${item.progress}%` }} />
                </div>
                <strong>{item.progress}%</strong>
              </div>
              <Badge tone={statusTone(item.status)}>{statusLabel(item.status, locale)}</Badge>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
