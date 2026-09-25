"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge, BottomSheet, EmptyState, LoadingState, ProgressBar } from "@elhabak/ui";

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
  FolderOpen,
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
  formatAppDate,
  mediaUrl,
  phaseLabel,
  roleLabel,
  siteUpdateTypeLabel,
  siteUpdateTypeTone,
  uploadRequest,
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

// Mirrors the API contract: FilesInterceptor("media", 8) + mediaTypeFor() allowlist
// (MIME + extension pairing) + MAX_UPLOAD_MB=25 per file.
const MAX_MEDIA_FILES = 8;
const MAX_FILE_MB = 25;
const SITE_MEDIA_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".webm"];

type PendingMedia = {
  key: string;
  file: File;
  url: string;
  kind: "image" | "video";
};

function mediaKindFor(file: File): "image" | "video" | null {
  const extension = `.${(file.name.split(".").pop() ?? "").toLowerCase()}`;
  if (!SITE_MEDIA_EXTENSIONS.includes(extension)) return null;
  if (file.type.startsWith("image/") && [".jpg", ".jpeg", ".png", ".webp"].includes(extension)) return "image";
  if (file.type.startsWith("video/") && [".mp4", ".webm"].includes(extension)) return "video";
  return null;
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function updateTypeIcon(type: SiteUpdateType) {
  if (type === "PROGRESS") return <TrendingUp size={15} />;
  if (type === "INSPECTION") return <ClipboardCheck size={15} />;
  if (type === "ISSUE") return <AlertTriangle size={15} />;
  if (type === "MATERIAL") return <Package size={15} />;
  return <Camera size={15} />;
}

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
  const [reportMedia, setReportMedia] = useState<PendingMedia[]>([]);
  const [reportMediaError, setReportMediaError] = useState("");
  const [reportUploadPct, setReportUploadPct] = useState<number | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);
  const reportInFlight = useRef(false);
  const reportFileInputRef = useRef<HTMLInputElement>(null);
  const reportCameraInputRef = useRef<HTMLInputElement>(null);

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
  const [workerMedia, setWorkerMedia] = useState<PendingMedia[]>([]);
  const [workerMediaError, setWorkerMediaError] = useState("");
  const [workerUploadPct, setWorkerUploadPct] = useState<number | null>(null);
  const [submittingWorkerUpdate, setSubmittingWorkerUpdate] = useState(false);
  const [showWorkerSheet, setShowWorkerSheet] = useState(false);
  const workerInFlight = useRef(false);
  const workerFileInputRef = useRef<HTMLInputElement>(null);
  const workerCameraInputRef = useRef<HTMLInputElement>(null);
  const workerSheetFileInputRef = useRef<HTMLInputElement>(null);
  const workerSheetCameraInputRef = useRef<HTMLInputElement>(null);

  // Field draft persistence: workers lose connectivity mid-entry on site, so the
  // note/type survive a reload. Files cannot be persisted (browser restriction).
  const draftKey = `elhabak:site-draft:${projectId}`;
  const draftRestored = useRef(false);
  useEffect(() => {
    if (draftRestored.current) return;
    draftRestored.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { type?: SiteUpdateType; note?: string };
      if (draft.type && SITE_UPDATE_TYPES.includes(draft.type)) setWorkerType(draft.type);
      if (draft.note) setWorkerNote(draft.note);
    } catch {
      /* corrupted draft - ignore */
    }
  }, [draftKey]);
  useEffect(() => {
    if (!draftRestored.current) return;
    try {
      if (workerNote.trim() || workerType !== "PROGRESS") {
        localStorage.setItem(draftKey, JSON.stringify({ type: workerType, note: workerNote }));
      } else {
        localStorage.removeItem(draftKey);
      }
    } catch {
      /* storage full/blocked - non-fatal */
    }
  }, [draftKey, workerNote, workerType]);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxLoaded, setLightboxLoaded] = useState(false);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const lightboxRestoreFocus = useRef<HTMLElement | null>(null);

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
          latestActivity: "آخر نشاط ميداني",
          noLatest: "لا يوجد نشاط بعد",
          filesSelected: "ملفات محددة:",
          cameraCapture: "التقاط بالكاميرا",
          browseFiles: "اختيار من المعرض / الملفات",
          removeFile: "إزالة الملف",
          mediaLimit: `الحد الأقصى ${MAX_MEDIA_FILES} ملفات لكل تحديث، وحتى ${MAX_FILE_MB}MB للملف الواحد.`,
          rejectedType: "ملفات غير مدعومة (يُسمح بصور JPG/PNG/WebP وفيديو MP4/WebM فقط):",
          rejectedSize: `ملفات تجاوزت حد ${MAX_FILE_MB}MB:`,
          tooManyFiles: `تم تجاهل بعض الملفات — الحد الأقصى ${MAX_MEDIA_FILES} ملفات لكل تحديث.`,
          uploadingMedia: "جاري رفع الوسائط...",
          visibilityQuestion: "من يمكنه رؤية هذا التحديث؟",
          visibleToClientOption: "مرئي للعميل",
          internalOnlyOption: "داخلي — فريق المشروع فقط",
          progressTargetLabel: "نسبة الإنجاز الجديدة للمشروع (%) — اختياري",
          progressTargetHint: "اتركها فارغة لعدم تغيير النسبة.",
          currentValue: "الحالية",
          newValue: "الجديدة",
          difference: "الفرق",
          currentPhaseTag: "الحالية",
          noChangeNeeded: "لا يوجد تغيير لحفظه",
          photosLabel: "صور",
          videosLabel: "مقاطع"
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
          latestActivity: "Latest field activity",
          noLatest: "No activity yet",
          filesSelected: "Selected files:",
          cameraCapture: "Capture with camera",
          browseFiles: "Browse gallery / files",
          removeFile: "Remove file",
          mediaLimit: `Up to ${MAX_MEDIA_FILES} files per update, ${MAX_FILE_MB}MB each.`,
          rejectedType: "Unsupported files (JPG/PNG/WebP images and MP4/WebM videos only):",
          rejectedSize: `Files over the ${MAX_FILE_MB}MB limit:`,
          tooManyFiles: `Some files were skipped — maximum ${MAX_MEDIA_FILES} files per update.`,
          uploadingMedia: "Uploading media...",
          visibilityQuestion: "Who can see this update?",
          visibleToClientOption: "Visible to client",
          internalOnlyOption: "Internal — project team only",
          progressTargetLabel: "New project progress (%) — optional",
          progressTargetHint: "Leave empty to keep progress unchanged.",
          currentValue: "Current",
          newValue: "New",
          difference: "Difference",
          currentPhaseTag: "Current",
          noChangeNeeded: "Nothing to save",
          photosLabel: "photos",
          videosLabel: "videos"
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
  // Update counts come from the timeline (unbounded, already fetched) - not from
  // project.siteUpdates, which is no longer part of the detail payload.
  const siteUpdateEvents = useMemo(() => timelineEvents.filter((event) => event.kind === "SITE_UPDATE"), [timelineEvents]);
  const latestEvent = timelineEvents[0];
  const latestEventTime = latestEvent
    ? formatAppDate(latestEvent.timestamp, locale, true)
    : labels.noLatest;

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

  // Pending media helpers - object URLs are created at selection time and revoked on
  // remove/submit/unmount so previews never touch the server.
  function addPendingFiles(
    incoming: FileList | File[],
    current: PendingMedia[],
    apply: (next: PendingMedia[]) => void,
    notify: (message: string) => void
  ) {
    const rejectedType: string[] = [];
    const rejectedSize: string[] = [];
    const next = [...current];
    const seen = new Set(current.map((item) => `${item.file.name}|${item.file.size}|${item.file.lastModified}`));
    let overflow = false;

    for (const file of Array.from(incoming)) {
      const signature = `${file.name}|${file.size}|${file.lastModified}`;
      if (seen.has(signature)) continue;
      const kind = mediaKindFor(file);
      if (!kind) {
        rejectedType.push(file.name);
        continue;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        rejectedSize.push(file.name);
        continue;
      }
      if (next.length >= MAX_MEDIA_FILES) {
        overflow = true;
        break;
      }
      seen.add(signature);
      next.push({ key: signature, file, url: URL.createObjectURL(file), kind });
    }

    apply(next);

    const notices: string[] = [];
    if (rejectedType.length) notices.push(`${labels.rejectedType} ${rejectedType.join(ar ? "، " : ", ")}`);
    if (rejectedSize.length) notices.push(`${labels.rejectedSize} ${rejectedSize.join(ar ? "، " : ", ")}`);
    if (overflow) notices.push(labels.tooManyFiles);
    notify(notices.join(" "));
  }

  function removePendingMedia(key: string, current: PendingMedia[], apply: (next: PendingMedia[]) => void) {
    const target = current.find((item) => item.key === key);
    if (target) URL.revokeObjectURL(target.url);
    apply(current.filter((item) => item.key !== key));
  }

  function clearPendingMedia(current: PendingMedia[]) {
    current.forEach((item) => URL.revokeObjectURL(item.url));
  }

  // Revoke any still-held object URLs if the component unmounts mid-selection.
  const pendingMediaRef = useRef<PendingMedia[]>([]);
  useEffect(() => {
    pendingMediaRef.current = [...reportMedia, ...workerMedia];
  }, [reportMedia, workerMedia]);
  useEffect(() => {
    return () => {
      pendingMediaRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, []);

  // Lightbox items: all gallery media (images and videos) in timeline order.
  const lightboxItems = allGalleryMedia;

  function openLightbox(mediaId: string) {
    const idx = lightboxItems.findIndex((li) => li.media.id === mediaId);
    if (idx !== -1) {
      lightboxRestoreFocus.current = document.activeElement as HTMLElement | null;
      setLightboxLoaded(false);
      setLightboxIndex(idx);
    }
  }

  // Keyboard navigation + focus management for Lightbox
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (lightboxIndex === null) return;
      if (event.key === "Escape") {
        setLightboxIndex(null);
      } else if (event.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : lightboxItems.length - 1));
        setLightboxLoaded(false);
      } else if (event.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev !== null && prev < lightboxItems.length - 1 ? prev + 1 : 0));
        setLightboxLoaded(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, lightboxItems.length]);

  // Focus trap entry + body scroll lock while the lightbox is open.
  const lightboxOpen = lightboxIndex !== null;
  useEffect(() => {
    if (!lightboxOpen) return;
    lightboxCloseRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      lightboxRestoreFocus.current?.focus?.();
    };
  }, [lightboxOpen]);

  // Submit Field Report (Admin / Engineer) - in-flight ref blocks double submits even
  // across a slow network; note/files are preserved on failure for a clean retry.
  async function handleSubmitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || reportMedia.length === 0 || reportInFlight.current) return;
    reportInFlight.current = true;
    setSubmittingReport(true);
    setReportUploadPct(0);
    setError("");
    setSuccess("");

    const body = new FormData();
    body.set("type", reportType);
    body.set("note", reportNote.trim());
    if (reportProgressImpact.trim()) {
      body.set("progressImpact", reportProgressImpact.trim());
    }
    body.set("isClientVisible", String(reportIsClientVisible));
    reportMedia.forEach((item) => body.append("media", item.file));

    try {
      await uploadRequest(`/projects/${project.id}/site-updates`, body, setReportUploadPct);
      clearPendingMedia(reportMedia);
      setShowReportModal(false);
      setReportNote("");
      setReportProgressImpact("");
      setReportMedia([]);
      setReportMediaError("");
      if (reportFileInputRef.current) reportFileInputRef.current.value = "";
      if (reportCameraInputRef.current) reportCameraInputRef.current.value = "";
      setSuccess(labels.successReport);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit field report.");
    } finally {
      reportInFlight.current = false;
      setSubmittingReport(false);
      setReportUploadPct(null);
    }
  }

  // Submit Worker Quick Upload
  async function handleSubmitWorker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || workerMedia.length === 0 || workerInFlight.current) return;
    workerInFlight.current = true;
    setSubmittingWorkerUpdate(true);
    setWorkerUploadPct(0);
    setError("");
    setSuccess("");

    const body = new FormData();
    body.set("type", workerType);
    body.set("note", workerNote.trim());
    body.set("isClientVisible", "true");
    workerMedia.forEach((item) => body.append("media", item.file));

    try {
      await uploadRequest(`/projects/${project.id}/site-updates`, body, setWorkerUploadPct);
      clearPendingMedia(workerMedia);
      setWorkerNote("");
      setWorkerType("PROGRESS");
      setWorkerMedia([]);
      setWorkerMediaError("");
      setShowWorkerSheet(false);
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* non-fatal */
      }
      if (workerFileInputRef.current) workerFileInputRef.current.value = "";
      if (workerCameraInputRef.current) workerCameraInputRef.current.value = "";
      if (workerSheetFileInputRef.current) workerSheetFileInputRef.current.value = "";
      if (workerSheetCameraInputRef.current) workerSheetCameraInputRef.current.value = "";
      setSuccess(labels.successReport);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit update.");
    } finally {
      workerInFlight.current = false;
      setSubmittingWorkerUpdate(false);
      setWorkerUploadPct(null);
    }
  }

  // Shared selected-media preview grid: real thumbnails (object URLs), per-file
  // remove, size/type — identical in the report modal and the worker form.
  function mediaPreviewGrid(
    items: PendingMedia[],
    notice: string,
    onRemove: (key: string) => void,
    disabled: boolean
  ) {
    return (
      <>
        {notice && (
          <p className="media-pick-notice" role="alert">{notice}</p>
        )}
        {items.length > 0 && (
          <ul className="media-pick-grid" aria-label={labels.filesSelected}>
            {items.map((item) => (
              <li key={item.key} className="media-pick">
                <div className="media-pick__thumb">
                  {item.kind === "image" ? (
                    <img src={item.url} alt={item.file.name} />
                  ) : (
                    <video src={item.url} muted preload="metadata" aria-label={item.file.name} />
                  )}
                  <span className="media-pick__kind">
                    {item.kind === "image" ? <ImageIcon size={11} /> : <Video size={11} />}
                  </span>
                  <button
                    type="button"
                    className="media-pick__remove"
                    onClick={() => onRemove(item.key)}
                    disabled={disabled}
                    aria-label={`${labels.removeFile}: ${item.file.name}`}
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="media-pick__meta">
                  <span className="media-pick__name" title={item.file.name}>{item.file.name}</span>
                  <span className="media-pick__size mono">{formatBytes(item.file.size)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  function uploadProgressBar(pct: number | null, count: number) {
    if (pct === null) return null;
    return (
      <div className="media-upload-progress" role="status">
        <div
          className="media-upload-progress__track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <span style={{ inlineSize: `${pct}%` }} />
        </div>
        <small>
          {labels.uploadingMedia} {pct}% · {count} {count === 1 ? (ar ? "ملف" : "file") : (ar ? "ملفات" : "files")}
        </small>
      </div>
    );
  }

  // Shared worker quick-update fields — used by the inline card and the mobile sheet.
  function workerFormFields(
    fileInputRef: React.RefObject<HTMLInputElement | null>,
    cameraInputRef: React.RefObject<HTMLInputElement | null>
  ) {
    const addFiles = (list: FileList | File[]) =>
      addPendingFiles(list, workerMedia, setWorkerMedia, setWorkerMediaError);
    return (
      <>
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
                <span className="worker-pill__icon">{updateTypeIcon(t)}</span>
                <span>{siteUpdateTypeLabel(t, locale)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Media sources: camera capture and gallery/files are separate controls — a
            single input with capture="environment" forces camera-only on mobile and
            blocks gallery multi-select. */}
        <div className="worker-field">
          <span className="worker-field-label">{labels.attachFiles}</span>
          <div className="media-source-row">
            <label className="worker-file-drop media-source">
              <Camera size={20} />
              <span>{labels.cameraCapture}</span>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*,video/*"
                capture="environment"
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <label className="worker-file-drop media-source">
              <FolderOpen size={20} />
              <span>{labels.browseFiles}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <small className="worker-field-hint">{labels.mediaLimit}</small>
          {mediaPreviewGrid(workerMedia, workerMediaError, (key) => {
            removePendingMedia(key, workerMedia, setWorkerMedia);
            setWorkerMediaError("");
          }, submittingWorkerUpdate)}
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

        {uploadProgressBar(workerUploadPct, workerMedia.length)}

        {/* Submit Button */}
        <button
          type="submit"
          className="worker-submit-btn ui-button ui-button--primary"
          disabled={submittingWorkerUpdate || workerMedia.length === 0}
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
      </>
    );
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

      <div className="site-ops-command-strip">
        <div>
          <span className="section-kicker">{ar ? "سجل العمليات الميدانية" : "Field Operations Log"}</span>
          <h1>{labels.title}</h1>
          <p>{labels.lead}</p>
        </div>
        <div className="site-ops-command-strip__latest">
          <span>{labels.latestActivity}</span>
          <strong className="mono"><bdi>{latestEventTime}</bdi></strong>
        </div>
      </div>

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
            <span className="mono site-ops-card__count">{siteUpdateEvents.length}</span>
          </div>
          <div className="site-ops-card__body">
            <div className="site-ops-card__chips-row">
              {SITE_UPDATE_TYPES.map((t) => {
                const count = siteUpdateEvents.filter((u) => u.type === t).length;
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
            {workerFormFields(workerFileInputRef, workerCameraInputRef)}
          </form>
        </section>
      )}

      {/* Mobile quick-update: floating action opens the same form in a bottom sheet */}
      {isWorker && (
        <>
          <button
            type="button"
            className="worker-quick-fab"
            onClick={() => setShowWorkerSheet(true)}
            aria-label={labels.workerPanelTitle}
          >
            <Camera size={20} />
          </button>
          <BottomSheet
            open={showWorkerSheet}
            onClose={() => setShowWorkerSheet(false)}
            title={labels.workerPanelTitle}
          >
            <p className="worker-sheet-lead">{labels.workerPanelLead}</p>
            <form className="worker-upload-card__form" onSubmit={(e) => void handleSubmitWorker(e)}>
              {workerFormFields(workerSheetFileInputRef, workerSheetCameraInputRef)}
            </form>
          </BottomSheet>
        </>
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
              setReportMediaError("");
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
                  <article className={`site-timeline-card field-activity ${event.kind.toLowerCase()}`} key={event.id}>
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
                          <bdi>{formatAppDate(event.timestamp, locale, true)}</bdi>
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
                        {!isAudit && event.media && event.media.length > 0 && (
                          <span className="media-count-chip">
                            <ImageIcon size={12} /> {event.media.length}
                          </span>
                        )}
                      </div>

                      {/* Event Description / Note */}
                      {event.description && (
                        <p className="site-timeline-description">{event.description}</p>
                      )}

                      {/* Event Media Attachments */}
                      {event.media && event.media.length > 0 && (
                        <div className={`site-timeline-media-grid ${event.media.length === 1 ? "site-timeline-media-grid--single" : ""}`}>
                          {event.media.map((item) => {
                            const isImage = item.mediaType === "IMAGE";
                            const fullUrl = mediaUrl(projectId, item.id);
                            return (
                              <button
                                type="button"
                                className="site-media-thumbnail clickable"
                                key={item.id}
                                onClick={() => openLightbox(item.id)}
                                aria-label={`${ar ? "معاينة" : "Preview"}: ${item.originalFilename}`}
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
                                    preload="metadata"
                                    aria-label={item.originalFilename}
                                  />
                                )}
                                <span className="media-caption">
                                  <span className="media-filename mono" dir="auto">{item.originalFilename}</span>
                                  <span className="media-zoom-hint"><Eye size={12} /></span>
                                </span>
                              </button>
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
                    onClick={() => openLightbox(item.media.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openLightbox(item.media.id);
                      }
                    }}
                  >
                    <div className="gallery-item-preview">
                      {isImage ? (
                        <img src={fullUrl} alt={item.media.originalFilename} loading="lazy" />
                      ) : (
                        <video src={fullUrl} preload="metadata" aria-label={item.media.originalFilename} />
                      )}
                      <span className="gallery-type-badge">
                        {isImage ? <ImageIcon size={12} /> : <Video size={12} />}
                        {isImage ? "IMG" : "VID"}
                      </span>
                    </div>
                    <div className="gallery-item-meta">
                      <strong className="mono">{item.media.originalFilename}</strong>
                      <div className="gallery-sub-meta">
                        {item.event.type && (
                          <span className="gallery-type-tag">
                            {updateTypeIcon(item.event.type)} {siteUpdateTypeLabel(item.event.type, locale)}
                          </span>
                        )}
                        <span>{item.event.actor?.displayName ?? "—"}</span>
                        <time className="mono">
                          {formatAppDate(item.event.timestamp, locale)}
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
        <div className="modal-backdrop" onClick={() => { if (!submittingReport) setShowReportModal(false); }}>
          <div className="site-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <header className="site-modal-header">
              <h3>{labels.newReport}</h3>
              <button
                type="button"
                className="site-modal-close"
                onClick={() => setShowReportModal(false)}
                disabled={submittingReport}
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

                {/* Media: capture/browse first, preview grid second */}
                <div className="ui-field">
                  <span className="worker-field-label">{labels.attachFiles}</span>
                  <div className="media-source-row">
                    <label className="worker-file-drop media-source">
                      <Camera size={20} />
                      <span>{labels.cameraCapture}</span>
                      <input
                        ref={reportCameraInputRef}
                        type="file"
                        accept="image/*,video/*"
                        capture="environment"
                        onChange={(e) => {
                          if (e.target.files?.length) {
                            addPendingFiles(e.target.files, reportMedia, setReportMedia, setReportMediaError);
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <label className="worker-file-drop media-source">
                      <FolderOpen size={20} />
                      <span>{labels.browseFiles}</span>
                      <input
                        ref={reportFileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={(e) => {
                          if (e.target.files?.length) {
                            addPendingFiles(e.target.files, reportMedia, setReportMedia, setReportMediaError);
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <small className="worker-field-hint">{labels.mediaLimit}</small>
                  {mediaPreviewGrid(reportMedia, reportMediaError, (key) => {
                    removePendingMedia(key, reportMedia, setReportMedia);
                    setReportMediaError("");
                  }, submittingReport)}
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

                {/* Progress Impact: the API treats this as the resulting absolute
                    progress value (0-100), not a delta - label it accordingly. */}
                <div className="ui-field">
                  <label htmlFor="report-progress-impact">{labels.progressTargetLabel}</label>
                  <input
                    id="report-progress-impact"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    step={1}
                    placeholder={labels.progressImpactPlaceholder}
                    value={reportProgressImpact}
                    onChange={(e) => setReportProgressImpact(e.target.value)}
                  />
                  <small className="worker-field-hint">
                    {labels.progressTargetHint} {labels.currentValue}: <bdi className="mono">{project.progress}%</bdi>
                  </small>
                </div>

                {/* Client Visibility: explicit two-option choice instead of a bare checkbox */}
                <div className="ui-field">
                  <span className="worker-field-label">{labels.visibilityQuestion}</span>
                  <div className="visibility-choice" role="radiogroup" aria-label={labels.visibilityQuestion}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={reportIsClientVisible}
                      className={`visibility-choice__option ${reportIsClientVisible ? "active" : ""}`}
                      onClick={() => setReportIsClientVisible(true)}
                    >
                      <Eye size={15} />
                      <span>{labels.visibleToClientOption}</span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!reportIsClientVisible}
                      className={`visibility-choice__option ${!reportIsClientVisible ? "active" : ""}`}
                      onClick={() => setReportIsClientVisible(false)}
                    >
                      <EyeOff size={15} />
                      <span>{labels.internalOnlyOption}</span>
                    </button>
                  </div>
                </div>

                {uploadProgressBar(reportUploadPct, reportMedia.length)}
              </div>

              <footer className="site-modal-footer">
                <button
                  type="button"
                  className="ui-button ui-button--ghost"
                  onClick={() => setShowReportModal(false)}
                  disabled={submittingReport}
                >
                  {labels.cancel}
                </button>
                <button
                  type="submit"
                  className="ui-button ui-button--primary"
                  disabled={submittingReport || reportMedia.length === 0}
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
                {/* Current → New → Difference so the operator sees exactly what changes */}
                <div className="progress-delta-row">
                  <div className="progress-delta-row__cell">
                    <small>{labels.currentValue}</small>
                    <strong className="mono"><bdi>{project.progress}%</bdi></strong>
                  </div>
                  <div className="progress-delta-row__cell progress-delta-row__cell--new">
                    <small>{labels.newValue}</small>
                    <strong className="mono"><bdi>{newProgress}%</bdi></strong>
                  </div>
                  <div className={`progress-delta-row__cell ${newProgress - project.progress === 0 ? "" : newProgress - project.progress > 0 ? "is-up" : "is-down"}`}>
                    <small>{labels.difference}</small>
                    <strong className="mono">
                      <bdi>{newProgress - project.progress > 0 ? "+" : ""}{newProgress - project.progress}%</bdi>
                    </strong>
                  </div>
                </div>
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
                    aria-label={labels.progressModalTitle}
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
                  disabled={submittingProgress || newProgress === project.progress}
                  title={newProgress === project.progress ? labels.noChangeNeeded : undefined}
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
                <div className="phase-select-grid" role="radiogroup" aria-label={labels.phaseModalTitle}>
                  {LIFECYCLE_PHASES.map((p, idx) => (
                    <label
                      key={p}
                      className={`phase-radio-card ${newPhase === p ? "selected" : ""} ${project.phase === p ? "current" : ""}`}
                    >
                      <input
                        type="radio"
                        name="project-phase"
                        value={p}
                        checked={newPhase === p}
                        onChange={() => setNewPhase(p)}
                      />
                      <span className="mono phase-step">
                        PH-0{idx + 1}
                        {project.phase === p && <em className="phase-current-tag">{labels.currentPhaseTag}</em>}
                      </span>
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
                  disabled={submittingPhase || newPhase === project.phase}
                  title={newPhase === project.phase ? labels.noChangeNeeded : undefined}
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

      {/* Lightbox Modal: images and videos, keyboard navigable, dialog semantics */}
      {lightboxIndex !== null && lightboxItems[lightboxIndex] && (
        <div
          className="lightbox-overlay"
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label={lightboxItems[lightboxIndex].media.originalFilename}
        >
          <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
            <header className="lightbox-header">
              <div className="lightbox-meta">
                <span className="lightbox-title mono">
                  {lightboxItems[lightboxIndex].media.originalFilename}
                </span>
                <span className="lightbox-counter mono">
                  {lightboxIndex + 1} / {lightboxItems.length}
                </span>
              </div>
              <button
                type="button"
                className="lightbox-close-btn"
                onClick={() => setLightboxIndex(null)}
                aria-label={labels.close}
                ref={lightboxCloseRef}
              >
                <X size={20} />
              </button>
            </header>

            <div className="lightbox-stage">
              <button
                type="button"
                className="lightbox-nav-btn prev"
                onClick={() => {
                  setLightboxIndex((prev) =>
                    prev !== null && prev > 0 ? prev - 1 : lightboxItems.length - 1
                  );
                  setLightboxLoaded(false);
                }}
                aria-label={labels.prev}
              >
                {ar ? <ChevronRight size={28} /> : <ChevronLeft size={28} />}
              </button>

              <div className="lightbox-image-wrap">
                {!lightboxLoaded && <span className="lightbox-loading" aria-hidden="true"><RefreshCw size={22} className="spin" /></span>}
                {lightboxItems[lightboxIndex].media.mediaType === "IMAGE" ? (
                  <img
                    src={mediaUrl(projectId, lightboxItems[lightboxIndex].media.id)}
                    alt={lightboxItems[lightboxIndex].media.originalFilename}
                    onLoad={() => setLightboxLoaded(true)}
                    className={lightboxLoaded ? "loaded" : ""}
                  />
                ) : (
                  <video
                    key={lightboxItems[lightboxIndex].media.id}
                    src={mediaUrl(projectId, lightboxItems[lightboxIndex].media.id)}
                    controls
                    autoPlay
                    onLoadedData={() => setLightboxLoaded(true)}
                    className={lightboxLoaded ? "loaded" : ""}
                  />
                )}
              </div>

              <button
                type="button"
                className="lightbox-nav-btn next"
                onClick={() => {
                  setLightboxIndex((prev) =>
                    prev !== null && prev < lightboxItems.length - 1 ? prev + 1 : 0
                  );
                  setLightboxLoaded(false);
                }}
                aria-label={labels.next}
              >
                {ar ? <ChevronLeft size={28} /> : <ChevronRight size={28} />}
              </button>
            </div>

            <footer className="lightbox-caption-bar">
              <div className="caption-text">
                {lightboxItems[lightboxIndex].event.type && (
                  <span className="lightbox-type-tag">
                    {updateTypeIcon(lightboxItems[lightboxIndex].event.type)}
                    {siteUpdateTypeLabel(lightboxItems[lightboxIndex].event.type, locale)}
                  </span>
                )}
                {lightboxItems[lightboxIndex].event.description && (
                  <p>{lightboxItems[lightboxIndex].event.description}</p>
                )}
                <div className="caption-sub">
                  <span>{labels.by} {lightboxItems[lightboxIndex].event.actor?.displayName ?? "—"}</span>
                  <time className="mono">
                    {formatAppDate(lightboxItems[lightboxIndex].event.timestamp, locale, true)}
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
