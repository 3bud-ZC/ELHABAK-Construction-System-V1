"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge, EmptyState, LoadingState, ProgressBar } from "@elhabak/ui";

import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  EyeOff,
  Filter,
  Image as ImageIcon,
  Layers,
  Milestone,
  Package,
  Plus,
  RefreshCw,
  TrendingUp,
  UploadCloud,
  Video,
  X
} from "lucide-react";
import { ProjectWorkspace } from "../../../components/project-workspace";
import {
  LIFECYCLE_PHASES,
  SITE_UPDATE_TYPES,
  apiRequest,
  mediaUrl,
  phaseLabel,
  roleLabel,
  siteUpdateTypeLabel,
  siteUpdateTypeTone,
  type ProjectPhase,
  type ProjectRecord,
  type SiteMediaRecord,
  type SiteUpdateType,
  type TimelineEventRecord,
  type UserRole
} from "../../../lib/api";
import { useCurrentUser } from "../../../lib/user-context";

type SiteOperationsProps = {
  projectId: string;
};

export function SiteOperations({ projectId }: SiteOperationsProps) {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const ar = locale === "ar";

  const user = useCurrentUser();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEventRecord[]>([]);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"timeline" | "gallery">("timeline");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  // Modals state
  const [showReportModal, setShowReportModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showPhaseModal, setShowPhaseModal] = useState(false);

  // Form states for Field Report
  const [reportType, setReportType] = useState<SiteUpdateType>("PROGRESS");
  const [reportNote, setReportNote] = useState("");
  const [reportProgressImpact, setReportProgressImpact] = useState<string>("");
  const [reportIsClientVisible, setReportIsClientVisible] = useState(true);
  const [reportFiles, setReportFiles] = useState<File[]>([]);
  const [submittingReport, setSubmittingReport] = useState(false);
  const reportFileInputRef = useRef<HTMLInputElement>(null);

  // Form states for Progress Update
  const [newProgress, setNewProgress] = useState<number>(0);
  const [progressNote, setProgressNote] = useState("");
  const [submittingProgress, setSubmittingProgress] = useState(false);

  // Form states for Phase Update
  const [newPhase, setNewPhase] = useState<ProjectPhase>("EXECUTION");
  const [phaseNote, setPhaseNote] = useState("");
  const [submittingPhase, setSubmittingPhase] = useState(false);

  // Worker quick upload form states
  const [workerType, setWorkerType] = useState<SiteUpdateType>("PROGRESS");
  const [workerNote, setWorkerNote] = useState("");
  const [workerFiles, setWorkerFiles] = useState<File[]>([]);
  const [submittingWorkerUpdate, setSubmittingWorkerUpdate] = useState(false);
  const workerFileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const labels = useMemo(() => {
    return ar
      ? {
          title: "عمليات الموقع وسجل التقدم",
          lead: "المتابعة الميدانية اللحظية، وتحديثات الإنجاز، ومراحل العمل التشغيلية.",
          currentPhase: "المرحلة الحالية",
          officialProgress: "نسبة الإنجاز المعتمدة",
          totalUpdates: "إجمالي التحديثات",
          mediaAssets: "الوسائط الموثقة",
          changePhase: "تغيير المرحلة",
          updateProgress: "تحديث النسبة",
          newReport: "إضافة تقرير ميداني",
          allTypes: "الكل",
          timelineView: "سجل النشاط الزمني",
          galleryView: "معرض وسائط الموقع",
          emptyTimeline: "لا توجد تحديثات موقع مسجلة بعد",
          emptyTimelineHint: "عند إضافة تقارير الموقع أو تغيير المراحل ستظهر هنا مرتبة زمنياً.",
          emptyGallery: "لا توجد صور أو مقاطع فيديو مرفوعة بعد",
          emptyGalleryHint: "الصور والفيديوهات المرفقة بتقارير الموقع ستظهر في المعرض.",
          workerPanelTitle: "رفع تحديث ميداني سريع",
          workerPanelLead: "التقط صوراً أو فيديو وسجل ملاحظة من أرض الموقع.",
          selectCategory: "نوع التحديث",
          progressImpactLabel: "تأثير على نسبة الإنجاز (%) (اختياري)",
          progressImpactPlaceholder: "مثال: 45",
          clientVisibility: "إتاحة التحديث في بوابة العميل",
          clientVisibleBadge: "مرئي للعميل",
          internalOnlyBadge: "داخلي فقط",
          notesPlaceholder: "أدخل تفاصيل التحديث أو الفحص أو المعاينة الميدانية...",
          attachFiles: "التقاط أو إرفاق وسائط (صور / فيديو)",
          chooseFiles: "اختر ملفات أو التقط صوراً",
          submitReport: "إرسال التقرير الميداني",
          submitting: "جاري الإرسال...",
          saveProgress: "حفظ نسبة الإنجاز",
          savePhase: "تأكيد تغيير المرحلة",
          cancel: "إلغاء",
          progressModalTitle: "تحديث نسبة إنجاز المشروع",
          phaseModalTitle: "تغيير مرحلة المشروع الحالية",
          noteOptional: "ملاحظة (اختياري)",
          phaseNotePlaceholder: "سبب الانتقال إلى هذه المرحلة أو ملاحظات التسليم...",
          progressNotePlaceholder: "الأعمال المنجزة التي استدعت تحديث النسبة...",
          successReport: "تم إرسال تقرير الموقع بنجاح.",
          successProgress: "تم تحديث نسبة الإنجاز بنجاح.",
          successPhase: "تم تحديث مرحلة المشروع بنجاح.",
          close: "إغلاق",
          prev: "السابق",
          next: "التالي",
          photoCount: "صورة",
          videoCount: "فيديو",
          by: "بواسطة",
          phaseUpdatedTo: "تم تغيير المرحلة إلى:",
          progressUpdatedTo: "تم تحديث الإنجاز إلى:",
          clientNotice: "أنت تشاهد السجل الميداني المصرح لعملاء المشروع.",
          filesSelected: "ملفات محددة:"
        }
      : {
          title: "Site Operations & Progress Management",
          lead: "Live field monitoring, milestone tracking, and site operations feed.",
          currentPhase: "Current Phase",
          officialProgress: "Approved Progress",
          totalUpdates: "Total Updates",
          mediaAssets: "Field Media",
          changePhase: "Change Phase",
          updateProgress: "Update Progress",
          newReport: "New Field Report",
          allTypes: "All",
          timelineView: "Timeline Feed",
          galleryView: "Media Gallery",
          emptyTimeline: "No site updates recorded yet",
          emptyTimelineHint: "Field reports and phase transitions will appear here chronologically.",
          emptyGallery: "No field media uploaded yet",
          emptyGalleryHint: "Photos and videos attached to site updates will appear in the gallery.",
          workerPanelTitle: "Quick Field Upload",
          workerPanelLead: "Capture site photos/videos and attach optional notes from the job site.",
          selectCategory: "Update Category",
          progressImpactLabel: "Progress Impact (%) (Optional)",
          progressImpactPlaceholder: "e.g. 45",
          clientVisibility: "Visible in Client Portal",
          clientVisibleBadge: "Client Visible",
          internalOnlyBadge: "Internal Only",
          notesPlaceholder: "Enter field inspection notes, work progress, or site issues...",
          attachFiles: "Capture or attach media (photos / video)",
          chooseFiles: "Choose files or capture photo",
          submitReport: "Submit Field Report",
          submitting: "Submitting...",
          saveProgress: "Save Progress",
          savePhase: "Confirm Phase Change",
          cancel: "Cancel",
          progressModalTitle: "Update Project Progress",
          phaseModalTitle: "Change Lifecycle Phase",
          noteOptional: "Note (Optional)",
          phaseNotePlaceholder: "Reason for phase transition or handover notes...",
          progressNotePlaceholder: "Summary of completed milestones for this progress update...",
          successReport: "Site update submitted successfully.",
          successProgress: "Project progress updated successfully.",
          successPhase: "Project phase updated successfully.",
          close: "Close",
          prev: "Previous",
          next: "Next",
          photoCount: "photo(s)",
          videoCount: "video(s)",
          by: "by",
          phaseUpdatedTo: "Phase changed to:",
          progressUpdatedTo: "Progress updated to:",
          clientNotice: "You are viewing approved site activity for your project.",
          filesSelected: "Selected files:"
        };
  }, [ar]);

  const loadData = useCallback(async () => {
    try {
      const [projectData, timelineData] = await Promise.all([
        apiRequest<ProjectRecord>(`/projects/${projectId}`),
        apiRequest<TimelineEventRecord[]>(`/projects/${projectId}/timeline${selectedTypeFilter !== "ALL" ? `?type=${selectedTypeFilter}` : ""}`)
      ]);
      setProject(projectData);
      setTimelineEvents(timelineData);
      setNewProgress(projectData.progress);
      setNewPhase(projectData.phase);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project operations.");
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedTypeFilter]);

  // Initial load and reload after a mutation (progress/phase/report/upload) - fetches the
  // full project record, so it must not re-run on every timeline type-filter change.
  useEffect(() => {
    void loadData();
  }, [projectId]);

  // Changing the type filter only needs a fresh timeline, not the whole project record.
  const didMountTimelineFilter = useRef(false);
  useEffect(() => {
    if (!didMountTimelineFilter.current) {
      didMountTimelineFilter.current = true;
      return;
    }
    let alive = true;
    apiRequest<TimelineEventRecord[]>(`/projects/${projectId}/timeline${selectedTypeFilter !== "ALL" ? `?type=${selectedTypeFilter}` : ""}`)
      .then((result) => {
        if (alive) setTimelineEvents(result);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : "Failed to load timeline.");
      });
    return () => {
      alive = false;
    };
  }, [projectId, selectedTypeFilter]);

  // Authorization flags
  const canManageProgressAndPhase = useMemo(() => {
    if (!project) return false;
    if (user.role === "ADMIN") return true;
    if (user.role === "ENGINEER") {
      return project.engineer?.id === user.id || project.workers.some((w) => w.id === user.id);
    }
    return false;
  }, [user, project]);


  const isWorker = user.role === "WORKER";
  const isClient = user.role === "CLIENT";

  // Gallery items flattened
  const allGalleryMedia = useMemo(() => {
    const items: Array<{
      media: SiteMediaRecord;
      event: TimelineEventRecord;
      projectId: string;
    }> = [];

    for (const event of timelineEvents) {
      if (event.media && event.media.length > 0) {
        for (const mediaItem of event.media) {
          items.push({
            media: mediaItem,
            event,
            projectId
          });
        }
      }
    }
    return items;
  }, [timelineEvents, projectId]);

  // Lightbox photos only
  const lightboxImages = useMemo(() => {
    return allGalleryMedia.filter((item) => item.media.mediaType === "IMAGE");
  }, [allGalleryMedia]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (lightboxIndex === null) return;
      if (event.key === "Escape") {
        setLightboxIndex(null);
      } else if (event.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : lightboxImages.length - 1));
      } else if (event.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev !== null && prev < lightboxImages.length - 1 ? prev + 1 : 0));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, lightboxImages.length]);

  // Submit Field Report (Admin / Engineer)
  async function handleSubmitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || reportFiles.length === 0) return;
    setSubmittingReport(true);
    setError("");
    setSuccess("");

    const body = new FormData();
    body.set("type", reportType);
    body.set("note", reportNote.trim());
    if (reportProgressImpact.trim()) {
      body.set("progressImpact", reportProgressImpact.trim());
    }
    body.set("isClientVisible", String(reportIsClientVisible));
    reportFiles.forEach((file) => body.append("media", file));

    try {
      await apiRequest(`/projects/${project.id}/site-updates`, {
        method: "POST",
        body
      });
      setShowReportModal(false);
      setReportNote("");
      setReportProgressImpact("");
      setReportFiles([]);
      if (reportFileInputRef.current) reportFileInputRef.current.value = "";
      setSuccess(labels.successReport);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit field report.");
    } finally {
      setSubmittingReport(false);
    }
  }

  // Submit Worker Quick Upload
  async function handleSubmitWorker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || workerFiles.length === 0) return;
    setSubmittingWorkerUpdate(true);
    setError("");
    setSuccess("");

    const body = new FormData();
    body.set("type", workerType);
    body.set("note", workerNote.trim());
    body.set("isClientVisible", "true");
    workerFiles.forEach((file) => body.append("media", file));

    try {
      await apiRequest(`/projects/${project.id}/site-updates`, {
        method: "POST",
        body
      });
      setWorkerNote("");
      setWorkerFiles([]);
      if (workerFileInputRef.current) workerFileInputRef.current.value = "";
      setSuccess(labels.successReport);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit update.");
    } finally {
      setSubmittingWorkerUpdate(false);
    }
  }

  // Submit Progress Change
  async function handleSaveProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    setSubmittingProgress(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/projects/${project.id}/progress`, {
        method: "PATCH",
        body: JSON.stringify({
          progress: Number(newProgress),
          note: progressNote.trim() || undefined
        })
      });
      setShowProgressModal(false);
      setProgressNote("");
      setSuccess(labels.successProgress);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update progress.");
    } finally {
      setSubmittingProgress(false);
    }
  }

  // Submit Phase Change
  async function handleSavePhase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    setSubmittingPhase(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/projects/${project.id}/phase`, {
        method: "PATCH",
        body: JSON.stringify({
          phase: newPhase,
          note: phaseNote.trim() || undefined
        })
      });
      setShowPhaseModal(false);
      setPhaseNote("");
      setSuccess(labels.successPhase);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update phase.");
    } finally {
      setSubmittingPhase(false);
    }
  }


  if (loading) {
    return (
      <section className="app-page">
        <LoadingState label={ar ? "جاري تحميل عمليات الموقع..." : "Loading site operations..."} />
      </section>
    );
  }

  if (!project) {
    return (
      <section className="app-page">
        <EmptyState
          title={ar ? "المشروع غير متوفر" : "Project unavailable"}
          description={error || (ar ? "تعذر العثور على بيانات المشروع." : "Could not load project data.")}
        />
      </section>
    );
  }

  return (
    <section className={`app-page site-operations-page ${isWorker ? "worker-shell" : ""}`}>
      {/* Workspace Header Bar */}
      <ProjectWorkspace project={project} locale={locale} role={user.role} active="site" />

      {/* Notifications */}
      {error && <div className="form-error" role="alert">{error}</div>}
      {success && <div className="form-success" role="status">{success}</div>}

      {/* Operations KPI Summary Grid */}
      <div className="site-ops-summary-grid">
        {/* Card 1: Phase */}
        <div className="site-ops-card">
          <div className="site-ops-card__header">
            <span className="site-ops-card__tag"><Milestone size={14} /> {labels.currentPhase}</span>
            {canManageProgressAndPhase && (
              <button
                type="button"
                className="site-ops-card__action-btn"
                onClick={() => {
                  setNewPhase(project.phase);
                  setPhaseNote("");
                  setShowPhaseModal(true);
                }}
              >
                {labels.changePhase}
              </button>
            )}
          </div>
          <div className="site-ops-card__body">
            <div className="site-ops-card__value-row">
              <strong className="site-ops-card__phase-title">{phaseLabel(project.phase, locale)}</strong>
            </div>
            <div className="site-ops-card__meta">
              <span className="mono">PHASE-{LIFECYCLE_PHASES.indexOf(project.phase) + 1}/6</span>
            </div>
          </div>
        </div>

        {/* Card 2: Official Progress */}
        <div className="site-ops-card">
          <div className="site-ops-card__header">
            <span className="site-ops-card__tag"><TrendingUp size={14} /> {labels.officialProgress}</span>
            {canManageProgressAndPhase && (
              <button
                type="button"
                className="site-ops-card__action-btn"
                onClick={() => {
                  setNewProgress(project.progress);
                  setProgressNote("");
                  setShowProgressModal(true);
                }}
              >
                {labels.updateProgress}
              </button>
            )}
          </div>
          <div className="site-ops-card__body">
            <div className="site-ops-card__value-row">
              <span className="site-ops-card__big-number mono"><bdi>{project.progress}%</bdi></span>
            </div>
            <div className="site-ops-card__progress-track">
              <ProgressBar value={project.progress} />
            </div>
          </div>
        </div>

        {/* Card 3: Total Updates & Breakdown */}
        <div className="site-ops-card">
          <div className="site-ops-card__header">
            <span className="site-ops-card__tag"><Activity size={14} /> {labels.totalUpdates}</span>
            <span className="mono site-ops-card__count">{project.siteUpdates.length}</span>
          </div>
          <div className="site-ops-card__body">
            <div className="site-ops-card__chips-row">
              {SITE_UPDATE_TYPES.map((t) => {
                const count = project.siteUpdates.filter((u) => u.type === t).length;
                if (count === 0) return null;
                return (
                  <Badge key={t} tone={siteUpdateTypeTone(t)}>
                    {siteUpdateTypeLabel(t, locale)}: {count}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 4: Media Assets & View Toggle */}
        <div className="site-ops-card">
          <div className="site-ops-card__header">
            <span className="site-ops-card__tag"><ImageIcon size={14} /> {labels.mediaAssets}</span>
            <span className="mono site-ops-card__count">{allGalleryMedia.length}</span>
          </div>
          <div className="site-ops-card__body">
            <div className="site-ops-card__view-toggle">
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === "timeline" ? "active" : ""}`}
                onClick={() => setViewMode("timeline")}
              >
                <Activity size={13} /> {labels.timelineView}
              </button>
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === "gallery" ? "active" : ""}`}
                onClick={() => setViewMode("gallery")}
              >
                <ImageIcon size={13} /> {labels.galleryView}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Client Notice */}
      {isClient && (
        <div className="client-info-strip">
          <Eye size={15} />
          <span>{labels.clientNotice}</span>
        </div>
      )}

      {/* Worker Fast Upload Mobile Panel */}
      {isWorker && (
        <section className="worker-upload-card">
          <header className="worker-upload-card__header">
            <div>
              <h3>{labels.workerPanelTitle}</h3>
              <p>{labels.workerPanelLead}</p>
            </div>
          </header>
          <form className="worker-upload-card__form" onSubmit={(e) => void handleSubmitWorker(e)}>
            {/* Category Selector Pills */}
            <div className="worker-category-group">
              <span className="worker-field-label">{labels.selectCategory}</span>
              <div className="worker-pills-row">
                {SITE_UPDATE_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`worker-pill ${workerType === t ? "active" : ""}`}
                    onClick={() => setWorkerType(t)}
                  >
                    {siteUpdateTypeLabel(t, locale)}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="worker-field">
              <label htmlFor="worker-note" className="worker-field-label">
                {labels.noteOptional}
              </label>
              <textarea
                id="worker-note"
                className="worker-textarea"
                rows={2}
                placeholder={labels.notesPlaceholder}
                value={workerNote}
                onChange={(e) => setWorkerNote(e.target.value)}
              />
            </div>

            {/* File Input */}
            <div className="worker-field">
              <span className="worker-field-label">{labels.attachFiles}</span>
              <label className="worker-file-drop">
                <Camera size={22} />
                <span>{labels.chooseFiles}</span>
                <input
                  ref={workerFileInputRef}
                  type="file"
                  accept="image/*,video/mp4,video/webm"
                  capture="environment"
                  multiple
                  required
                  onChange={(e) => setWorkerFiles(Array.from(e.target.files ?? []))}
                />
              </label>
              {workerFiles.length > 0 && (
                <div className="worker-files-preview">
                  <small>{labels.filesSelected} {workerFiles.length}</small>
                  <div className="preview-chips">
                    {workerFiles.map((f) => (
                      <span key={`${f.name}-${f.size}`} className="file-chip mono">
                        {f.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="worker-submit-btn ui-button ui-button--primary"
              disabled={submittingWorkerUpdate || workerFiles.length === 0}
            >
              {submittingWorkerUpdate ? (
                <>
                  <RefreshCw size={16} className="spin" /> {labels.submitting}
                </>
              ) : (
                <>
                  <UploadCloud size={16} /> {labels.submitReport}
                </>
              )}
            </button>
          </form>
        </section>
      )}

      {/* Action Bar for Admin / Supervising Engineer */}
      {canManageProgressAndPhase && !isWorker && (
        <div className="site-ops-action-bar">
          <button
            type="button"
            className="ui-button ui-button--primary"
            onClick={() => {
              setReportNote("");
              setReportProgressImpact("");
              setReportFiles([]);
              setReportIsClientVisible(true);
              setShowReportModal(true);
            }}
          >
            <Plus size={16} /> {labels.newReport}
          </button>
          <button
            type="button"
            className="ui-button ui-button--secondary"
            onClick={() => {
              setNewProgress(project.progress);
              setProgressNote("");
              setShowProgressModal(true);
            }}
          >
            <TrendingUp size={16} /> {labels.updateProgress}
          </button>
          <button
            type="button"
            className="ui-button ui-button--secondary"
            onClick={() => {
              setNewPhase(project.phase);
              setPhaseNote("");
              setShowPhaseModal(true);
            }}
          >
            <Milestone size={16} /> {labels.changePhase}
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="site-ops-filter-bar">
        <div className="filter-group">
          <Filter size={15} />
          <div className="filter-pills">
            <button
              type="button"
              className={`filter-pill ${selectedTypeFilter === "ALL" ? "active" : ""}`}
              onClick={() => setSelectedTypeFilter("ALL")}
            >
              {labels.allTypes}
            </button>
            {SITE_UPDATE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`filter-pill ${selectedTypeFilter === t ? "active" : ""}`}
                onClick={() => setSelectedTypeFilter(t)}
              >
                {siteUpdateTypeLabel(t, locale)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mode 1: Timeline Feed View */}
      {viewMode === "timeline" && (
        <section className="site-ops-timeline-section">
          {timelineEvents.length === 0 ? (
            <EmptyState
              icon={<Camera size={24} />}
              title={labels.emptyTimeline}
              description={labels.emptyTimelineHint}
            />
          ) : (
            <div className="site-timeline-rail">
              {timelineEvents.map((event) => {
                const isAudit = event.kind !== "SITE_UPDATE";
                const isPhaseChange = event.kind === "PHASE_CHANGE";
                const isProgressChange = event.kind === "PROGRESS_CHANGE";
                const isProjectCreated = event.kind === "PROJECT_CREATED";

                return (
                  <article className={`site-timeline-card ${event.kind.toLowerCase()}`} key={event.id}>
                    {/* Node marker on rail */}
                    <div className="site-timeline-node">
                      {isPhaseChange && <Milestone size={15} />}
                      {isProgressChange && <TrendingUp size={15} />}
                      {isProjectCreated && <CheckCircle2 size={15} />}
                      {!isAudit && event.type === "PROGRESS" && <Activity size={15} />}
                      {!isAudit && event.type === "INSPECTION" && <ClipboardCheck size={15} />}
                      {!isAudit && event.type === "ISSUE" && <AlertTriangle size={15} />}
                      {!isAudit && event.type === "MATERIAL" && <Package size={15} />}
                      {!isAudit && event.type === "GENERAL" && <Camera size={15} />}
                    </div>

                    <div className="site-timeline-content">
                      {/* Event Header */}
                      <div className="site-timeline-content__header">
                        <div className="site-timeline-actor">
                          <span className="actor-avatar">
                            {(event.actor?.displayName ?? "EH").slice(0, 2).toUpperCase()}
                          </span>
                          <div className="actor-details">
                            <strong>{event.actor?.displayName ?? "ELHABAK System"}</strong>
                            {event.actor?.role && (
                              <span className="actor-role">{roleLabel(event.actor.role as UserRole, locale)}</span>
                            )}

                          </div>
                        </div>
                        <time className="site-timeline-time mono">
                          <bdi>{new Date(event.timestamp).toLocaleString(ar ? "ar-EG" : "en-US", {
                            dateStyle: "medium",
                            timeStyle: "short"
                          })}</bdi>
                        </time>
                      </div>

                      {/* Event Badges & Chips */}
                      <div className="site-timeline-tags">
                        {!isAudit && event.type && (
                          <Badge tone={siteUpdateTypeTone(event.type)}>
                            {siteUpdateTypeLabel(event.type, locale)}
                          </Badge>
                        )}
                        {isPhaseChange && (
                          <Badge tone="navy">
                            {labels.phaseUpdatedTo} {phaseLabel(event.phase as ProjectPhase, locale)}
                          </Badge>
                        )}
                        {isProgressChange && (
                          <Badge tone="success">
                            {labels.progressUpdatedTo} {event.progress}%
                          </Badge>
                        )}
                        {event.phase && !isPhaseChange && (
                          <span className="phase-snapshot-chip">
                            <Layers size={12} /> {phaseLabel(event.phase as ProjectPhase, locale)}
                          </span>
                        )}
                        {event.progress !== null && event.progress !== undefined && !isProgressChange && (
                          <span className="progress-impact-chip">
                            <TrendingUp size={12} /> {event.progress}%
                          </span>
                        )}
                        {!isAudit && canManageProgressAndPhase && (
                          <span className={`visibility-chip ${event.isClientVisible ? "visible" : "internal"}`}>
                            {event.isClientVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                            {event.isClientVisible ? labels.clientVisibleBadge : labels.internalOnlyBadge}
                          </span>
                        )}
                      </div>

                      {/* Event Description / Note */}
                      {event.description && (
                        <p className="site-timeline-description">{event.description}</p>
                      )}

                      {/* Event Media Attachments */}
                      {event.media && event.media.length > 0 && (
                        <div className="site-timeline-media-grid">
                          {event.media.map((item) => {
                            const isImage = item.mediaType === "IMAGE";
                            const fullUrl = mediaUrl(projectId, item.id);
                            return (
                              <figure
                                className={`site-media-thumbnail ${isImage ? "clickable" : ""}`}
                                key={item.id}
                                onClick={() => {
                                  if (isImage) {
                                    const idx = lightboxImages.findIndex((li) => li.media.id === item.id);
                                    if (idx !== -1) setLightboxIndex(idx);
                                  }
                                }}
                              >
                                {isImage ? (
                                  <img
                                    src={fullUrl}
                                    alt={item.originalFilename}
                                    loading="lazy"
                                  />
                                ) : (
                                  <video
                                    src={fullUrl}
                                    controls
                                    preload="metadata"
                                  />
                                )}
                                <figcaption className="media-caption">
                                  <span className="media-filename mono">{item.originalFilename}</span>
                                  {isImage && <span className="media-zoom-hint"><Eye size={12} /></span>}
                                </figcaption>
                              </figure>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Mode 2: Gallery View */}
      {viewMode === "gallery" && (
        <section className="site-ops-gallery-section">
          {allGalleryMedia.length === 0 ? (
            <EmptyState
              icon={<ImageIcon size={24} />}
              title={labels.emptyGallery}
              description={labels.emptyGalleryHint}
            />
          ) : (
            <div className="site-gallery-grid">
              {allGalleryMedia.map((item) => {
                const isImage = item.media.mediaType === "IMAGE";

                const fullUrl = mediaUrl(projectId, item.media.id);
                return (
                  <article
                    className="gallery-item-card"
                    key={item.media.id}
                    onClick={() => {
                      if (isImage) {
                        const imgIdx = lightboxImages.findIndex((li) => li.media.id === item.media.id);
                        if (imgIdx !== -1) setLightboxIndex(imgIdx);
                      }
                    }}
                  >
                    <div className="gallery-item-preview">
                      {isImage ? (
                        <img src={fullUrl} alt={item.media.originalFilename} loading="lazy" />
                      ) : (
                        <video src={fullUrl} controls preload="metadata" />
                      )}
                      <span className="gallery-type-badge">
                        {isImage ? <ImageIcon size={12} /> : <Video size={12} />}
                        {isImage ? "IMG" : "VID"}
                      </span>
                    </div>
                    <div className="gallery-item-meta">
                      <strong className="mono">{item.media.originalFilename}</strong>
                      <div className="gallery-sub-meta">
                        <span>{item.event.actor?.displayName ?? "—"}</span>
                        <time className="mono">
                          {new Date(item.event.timestamp).toLocaleDateString(ar ? "ar-EG" : "en-US")}
                        </time>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Modal 1: New Field Report Dialog (Admin / Engineer) */}
      {showReportModal && (
        <div className="modal-backdrop" onClick={() => setShowReportModal(false)}>
          <div className="site-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <header className="site-modal-header">
              <h3>{labels.newReport}</h3>
              <button
                type="button"
                className="site-modal-close"
                onClick={() => setShowReportModal(false)}
                aria-label={labels.close}
              >
                <X size={18} />
              </button>
            </header>
            <form onSubmit={(e) => void handleSubmitReport(e)}>
              <div className="site-modal-body">
                {/* Category */}
                <div className="ui-field">
                  <label htmlFor="report-category">{labels.selectCategory}</label>
                  <select
                    id="report-category"
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as SiteUpdateType)}
                  >
                    {SITE_UPDATE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {siteUpdateTypeLabel(t, locale)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Progress Impact */}
                <div className="ui-field">
                  <label htmlFor="report-progress-impact">{labels.progressImpactLabel}</label>
                  <input
                    id="report-progress-impact"
                    type="number"
                    min={0}
                    max={100}
                    placeholder={labels.progressImpactPlaceholder}
                    value={reportProgressImpact}
                    onChange={(e) => setReportProgressImpact(e.target.value)}
                  />
                </div>

                {/* Client Visibility */}
                <div className="ui-field-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={reportIsClientVisible}
                      onChange={(e) => setReportIsClientVisible(e.target.checked)}
                    />
                    <span>{labels.clientVisibility}</span>
                  </label>
                </div>

                {/* Note */}
                <div className="ui-field">
                  <label htmlFor="report-notes">{labels.noteOptional}</label>
                  <textarea
                    id="report-notes"
                    rows={3}
                    placeholder={labels.notesPlaceholder}
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                  />
                </div>

                {/* Media Files */}
                <div className="ui-field">
                  <label>{labels.attachFiles}</label>
                  <input
                    ref={reportFileInputRef}
                    type="file"
                    accept="image/*,video/mp4,video/webm"
                    multiple
                    required
                    onChange={(e) => setReportFiles(Array.from(e.target.files ?? []))}
                  />
                  {reportFiles.length > 0 && (
                    <div className="preview-grid">
                      {reportFiles.map((f) => (
                        <span key={`${f.name}-${f.size}`} className="mono">
                          {f.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <footer className="site-modal-footer">
                <button
                  type="button"
                  className="ui-button ui-button--ghost"
                  onClick={() => setShowReportModal(false)}
                >
                  {labels.cancel}
                </button>
                <button
                  type="submit"
                  className="ui-button ui-button--primary"
                  disabled={submittingReport || reportFiles.length === 0}
                >
                  {submittingReport ? (
                    <>
                      <RefreshCw size={16} className="spin" /> {labels.submitting}
                    </>
                  ) : (
                    labels.submitReport
                  )}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Update Progress Dialog */}
      {showProgressModal && (
        <div className="modal-backdrop" onClick={() => setShowProgressModal(false)}>
          <div className="site-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <header className="site-modal-header">
              <h3>{labels.progressModalTitle}</h3>
              <button
                type="button"
                className="site-modal-close"
                onClick={() => setShowProgressModal(false)}
                aria-label={labels.close}
              >
                <X size={18} />
              </button>
            </header>
            <form onSubmit={(e) => void handleSaveProgress(e)}>
              <div className="site-modal-body">
                <div className="progress-slider-field">
                  <div className="progress-value-preview">
                    <span className="mono big-percent"><bdi>{newProgress}%</bdi></span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={newProgress}
                    onChange={(e) => setNewProgress(Number(e.target.value))}
                    className="site-progress-slider"
                  />
                </div>

                <div className="ui-field">
                  <label htmlFor="progress-note">{labels.noteOptional}</label>
                  <textarea
                    id="progress-note"
                    rows={3}
                    placeholder={labels.progressNotePlaceholder}
                    value={progressNote}
                    onChange={(e) => setProgressNote(e.target.value)}
                  />
                </div>
              </div>

              <footer className="site-modal-footer">
                <button
                  type="button"
                  className="ui-button ui-button--ghost"
                  onClick={() => setShowProgressModal(false)}
                >
                  {labels.cancel}
                </button>
                <button
                  type="submit"
                  className="ui-button ui-button--primary"
                  disabled={submittingProgress}
                >
                  {submittingProgress ? (
                    <>
                      <RefreshCw size={16} className="spin" /> {labels.submitting}
                    </>
                  ) : (
                    labels.saveProgress
                  )}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Change Phase Dialog */}
      {showPhaseModal && (
        <div className="modal-backdrop" onClick={() => setShowPhaseModal(false)}>
          <div className="site-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <header className="site-modal-header">
              <h3>{labels.phaseModalTitle}</h3>
              <button
                type="button"
                className="site-modal-close"
                onClick={() => setShowPhaseModal(false)}
                aria-label={labels.close}
              >
                <X size={18} />
              </button>
            </header>
            <form onSubmit={(e) => void handleSavePhase(e)}>
              <div className="site-modal-body">
                <div className="phase-select-grid">
                  {LIFECYCLE_PHASES.map((p, idx) => (
                    <label
                      key={p}
                      className={`phase-radio-card ${newPhase === p ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="project-phase"
                        value={p}
                        checked={newPhase === p}
                        onChange={() => setNewPhase(p)}
                      />
                      <span className="mono phase-step">PH-0{idx + 1}</span>
                      <strong className="phase-name">{phaseLabel(p, locale)}</strong>
                    </label>
                  ))}
                </div>

                <div className="ui-field">
                  <label htmlFor="phase-note">{labels.noteOptional}</label>
                  <textarea
                    id="phase-note"
                    rows={3}
                    placeholder={labels.phaseNotePlaceholder}
                    value={phaseNote}
                    onChange={(e) => setPhaseNote(e.target.value)}
                  />
                </div>
              </div>

              <footer className="site-modal-footer">
                <button
                  type="button"
                  className="ui-button ui-button--ghost"
                  onClick={() => setShowPhaseModal(false)}
                >
                  {labels.cancel}
                </button>
                <button
                  type="submit"
                  className="ui-button ui-button--primary"
                  disabled={submittingPhase}
                >
                  {submittingPhase ? (
                    <>
                      <RefreshCw size={16} className="spin" /> {labels.submitting}
                    </>
                  ) : (
                    labels.savePhase
                  )}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxIndex !== null && lightboxImages[lightboxIndex] && (
        <div className="lightbox-overlay" onClick={() => setLightboxIndex(null)}>
          <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
            <header className="lightbox-header">
              <div className="lightbox-meta">
                <span className="lightbox-title mono">
                  {lightboxImages[lightboxIndex].media.originalFilename}
                </span>
                <span className="lightbox-counter mono">
                  {lightboxIndex + 1} / {lightboxImages.length}
                </span>
              </div>
              <button
                type="button"
                className="lightbox-close-btn"
                onClick={() => setLightboxIndex(null)}
                aria-label={labels.close}
              >
                <X size={20} />
              </button>
            </header>

            <div className="lightbox-stage">
              <button
                type="button"
                className="lightbox-nav-btn prev"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev !== null && prev > 0 ? prev - 1 : lightboxImages.length - 1
                  )
                }
                aria-label={labels.prev}
              >
                {ar ? <ChevronRight size={28} /> : <ChevronLeft size={28} />}
              </button>

              <div className="lightbox-image-wrap">
                <img
                  src={mediaUrl(projectId, lightboxImages[lightboxIndex].media.id)}
                  alt={lightboxImages[lightboxIndex].media.originalFilename}
                />
              </div>

              <button
                type="button"
                className="lightbox-nav-btn next"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev !== null && prev < lightboxImages.length - 1 ? prev + 1 : 0
                  )
                }
                aria-label={labels.next}
              >
                {ar ? <ChevronLeft size={28} /> : <ChevronRight size={28} />}
              </button>
            </div>

            <footer className="lightbox-caption-bar">
              <div className="caption-text">
                {lightboxImages[lightboxIndex].event.description && (
                  <p>{lightboxImages[lightboxIndex].event.description}</p>
                )}
                <div className="caption-sub">
                  <span>{labels.by} {lightboxImages[lightboxIndex].event.actor?.displayName ?? "—"}</span>
                  <time className="mono">
                    {new Date(lightboxImages[lightboxIndex].event.timestamp).toLocaleString(ar ? "ar-EG" : "en-US")}
                  </time>
                </div>
              </div>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}
