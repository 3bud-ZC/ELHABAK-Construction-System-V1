"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, PageHeader } from "@elhabak/ui";
import { Activity, Calendar, Clock3, FolderKanban, Info, MapPin, UsersRound } from "lucide-react";

import {
  apiRequest,
  categoryLabel,
  phaseLabel,
  statusLabel,
  statusTone,
  siteUpdateTypeLabel,
  siteUpdateTypeTone,
  type ProjectRecord
} from "../../../lib/api";
import { useCurrentUser } from "../../../lib/user-context";
import { Lifecycle } from "../../../components/lifecycle";
import { ProjectWorkspace } from "../../../components/project-workspace";
import { SiteOperations } from "./site-operations";

type PortalProps = { projectId?: string; view?: "overview" | "site" };

export function ProjectPortal({ projectId, view = "overview" }: PortalProps) {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const user = useCurrentUser();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const labels = useMemo(() => locale === "ar" ? {
    title: "مشاريعي", workerTitle: "تحديثات الموقع", lead: "المشاريع المصرح لك بالوصول إليها.", workerLead: "اختر مشروعاً لرفع تحديث ميداني جديد.",
    empty: "لا توجد مشاريع مخصصة لك", emptyHint: "سيظهر هنا أي مشروع يتم تعيينك عليه.", brief: "ملخص تنفيذي", briefLead: "هوية المشروع وملاحظات التشغيل الحالية.", dates: "الجدول الزمني", team: "فريق التسليم", updates: "آخر نشاط ميداني", updatesLead: "أحدث الملاحظات الموثقة من فريق التنفيذ.",
    noNotes: "لا توجد ملاحظات مسجلة.", noUpdates: "لا توجد تحديثات موقع بعد", noUpdatesHintWorker: "ارفع أول تحديث ميداني لهذا المشروع.", noUpdatesHintClient: "ستظهر هنا تحديثات فريق العمل أولاً بأول.", note: "ملاحظة", files: "مرفقات", loadingLabel: "جاري تحميل مساحة المشروع...", start: "تاريخ البدء", target: "التسليم المستهدف", category: "فئة المشروع", phase: "مرحلة العمل", workers: "الفريق الميداني", none: "غير معين", lifecycle: "مسار المشروع", lifecycleLead: "المراحل الستة للتسليم الهندسي.", current: "الحالة الحالية"
  } : {
    title: "My Projects", workerTitle: "Site Updates", lead: "Projects you are authorized to access.", workerLead: "Choose a project to upload a new field update.",
    empty: "No assigned projects", emptyHint: "Any project you are assigned to will appear here.", brief: "Executive project brief", briefLead: "Project identity and current operating notes.", dates: "Schedule", team: "Delivery team", updates: "Latest field activity", updatesLead: "Recent timestamped notes from the delivery team.",
    noNotes: "No project notes recorded.", noUpdates: "No site updates yet", noUpdatesHintWorker: "Upload the first field update for this project.", noUpdatesHintClient: "Updates from the field team will appear here as they happen.", note: "Note", files: "attachments", loadingLabel: "Loading project workspace...", start: "Start date", target: "Target delivery", category: "Project category", phase: "Work phase", workers: "Field team", none: "Unassigned", lifecycle: "Project delivery path", lifecycleLead: "The six canonical engineering delivery stages.", current: "Current state"
  }, [locale]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (projectId ? apiRequest<ProjectRecord>(`/projects/${projectId}`) : apiRequest<ProjectRecord[]>("/projects")).then((result) => {
      if (!alive) return;
      if (Array.isArray(result)) { setProjects(result); setProject(null); }
      else { setProject(result); setProjects([]); }
      setError("");
    }).catch((requestError: Error) => { if (alive) setError(requestError.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [projectId]);

  function href(path: string) { return locale === "ar" ? path : `${path}?lang=en`; }
  function formatDate(value: string | null) {
    if (!value) return locale === "ar" ? "غير محدد" : "Not set";
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-US", { dateStyle: "medium" }).format(new Date(value));
  }

  if (loading) return <section className="app-page"><LoadingState label={labels.loadingLabel} /></section>;

  const isWorker = user.role === "WORKER";

  if (project) {
    if (view === "site") return <SiteOperations projectId={project.id} />;

    return (
      <section className={`app-page project-workspace-page ${isWorker ? "worker-shell" : ""}`}>
        <ProjectWorkspace project={project} locale={locale} role={user.role} active="overview" />
        {error && <div className="form-error">{error}</div>}

        <div className="project-overview-v2">
          <section className="overview-lifecycle-section">
            <div className="overview-section-heading">
              <div><span className="section-kicker">PROJECT / DELIVERY PATH</span><h2>{labels.lifecycle}</h2><p>{labels.lifecycleLead}</p></div>
              <Badge tone="orange">{labels.current}: {phaseLabel(project.phase, locale)}</Badge>
            </div>
            <Lifecycle phase={project.phase} locale={locale} />
          </section>

          <div className="workspace-grid workspace-grid--overview">
            <section className="workspace-panel workspace-panel--brief">
              <div className="workspace-panel__title"><Info size={17} /><div><h2>{labels.brief}</h2><p>{labels.briefLead}</p></div></div>
              <dl className="detail-list">
                <div><dt>{labels.category}</dt><dd>{categoryLabel(project.category, locale)}</dd></div>
                <div><dt>{labels.phase}</dt><dd><Badge tone="navy">{phaseLabel(project.phase, locale)}</Badge></dd></div>
                <div><dt>{labels.note}</dt><dd>{project.notes ?? labels.noNotes}</dd></div>
              </dl>
            </section>
            <section className="workspace-panel">
              <div className="workspace-panel__title"><Calendar size={17} /><div><h2>{labels.dates}</h2><p>{labels.lifecycleLead}</p></div></div>
              <dl className="detail-list">
                <div><dt>{labels.start}</dt><dd><bdi>{formatDate(project.startDate)}</bdi></dd></div>
                <div><dt>{labels.target}</dt><dd><bdi>{formatDate(project.targetDate)}</bdi></dd></div>
              </dl>
            </section>
            <section className="workspace-panel workspace-panel--activity">
              <div className="workspace-panel__title"><Activity size={17} /><div><h2>{labels.updates}</h2><p>{labels.updatesLead}</p></div></div>
              {project.siteUpdates.length === 0 ? (
                <EmptyState title={labels.noUpdates} description={isWorker ? labels.noUpdatesHintWorker : labels.noUpdatesHintClient} className="project-overview-empty" />
              ) : (
                <div className="project-overview-activity-list">
                  {project.siteUpdates.slice(0, 3).map((update) => (
                    <article className="project-overview-activity" key={update.id}>
                      <span className="project-overview-activity__marker"><Clock3 size={13} /></span>
                      <div><strong>{siteUpdateTypeLabel(update.type, locale)}</strong><p>{update.note ?? labels.noNotes}</p><small><bdi>{update.author.displayName}</bdi> · <bdi>{formatDate(update.createdAt)}</bdi></small></div>
                      <Badge tone={siteUpdateTypeTone(update.type)}>{update.media.length} {labels.files}</Badge>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <section className="workspace-panel workspace-panel--wide project-overview-team">
              <div className="workspace-panel__title"><UsersRound size={17} /><div><h2>{labels.team}</h2><p>{labels.workers}</p></div></div>
              <div className="project-overview-team__grid">
                <span><small>{locale === "ar" ? "المهندس المسؤول" : "Responsible engineer"}</small><strong><bdi>{project.engineer?.displayName ?? labels.none}</bdi></strong></span>
                <span><small>{labels.workers}</small><strong><bdi>{project.workers.map((worker) => worker.displayName).join(locale === "ar" ? "، " : ", ") || labels.none}</bdi></strong></span>
                <span><small><MapPin size={13} /> {locale === "ar" ? "الموقع" : "Location"}</small><strong><bdi>{project.location ?? labels.none}</bdi></strong></span>
              </div>
            </section>
          </div>
        </div>
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
