"use client";

import { useEffect, useId, useState } from "react";
import { Modal } from "@elhabak/ui";
import { AlertTriangle, Trash2 } from "lucide-react";
import { ApiError, apiRequest, type ClientDeletionPreflight, type DeletionImpact, type DeletionResult, type ProjectDeletionPreflight } from "../lib/api";

type Target = { kind: "project"; id: string } | { kind: "client"; id: string };

type Props = {
  target: Target;
  locale: "ar" | "en";
  open: boolean;
  onClose: () => void;
  onDeleted: (result: DeletionResult) => void;
};

/** Impact rows shown before deletion; zero-count rows are hidden to keep the list readable. */
const IMPACT_ROWS: Array<{ key: keyof DeletionImpact; ar: string; en: string }> = [
  { key: "userAccounts", ar: "حساب مستخدم العميل", en: "Client user account" },
  { key: "sessions", ar: "جلسات دخول", en: "Sign-in sessions" },
  { key: "projects", ar: "مشاريع", en: "Projects" },
  { key: "executionStages", ar: "مراحل تنفيذ", en: "Execution stages" },
  { key: "siteUpdates", ar: "تحديثات موقع", en: "Site updates" },
  { key: "siteMedia", ar: "صور وفيديوهات الموقع", en: "Site photos & videos" },
  { key: "designs", ar: "تصميمات", en: "Designs" },
  { key: "designRevisions", ar: "مراجعات تصميم", en: "Design revisions" },
  { key: "designEvents", ar: "أحداث وتعليقات التصميم", en: "Design events & comments" },
  { key: "documents", ar: "مستندات", en: "Documents" },
  { key: "documentVersions", ar: "إصدارات مستندات", en: "Document versions" },
  { key: "boqItems", ar: "بنود جدول الكميات", en: "BOQ items" },
  { key: "costEstimates", ar: "مقايسات", en: "Cost estimates" },
  { key: "expenses", ar: "مصروفات", en: "Expenses" },
  { key: "clientPayments", ar: "دفعات العميل", en: "Client payments" },
  { key: "contractorPayments", ar: "دفعات المقاولين", en: "Contractor payments" },
  { key: "financialAttachments", ar: "مرفقات مالية", en: "Financial attachments" },
  { key: "chatMessages", ar: "رسائل الدردشة", en: "Chat messages" },
  { key: "notifications", ar: "إشعارات", en: "Notifications" },
  { key: "activityEntries", ar: "سجل نشاط المشروع", en: "Project activity entries" },
  { key: "files", ar: "ملفات محفوظة", en: "Stored files" }
];

export function PermanentDeleteDialog({ target, locale, open, onClose, onDeleted }: Props) {
  const ar = locale === "ar";
  const inputId = useId();
  const [preflight, setPreflight] = useState<ProjectDeletionPreflight | ClientDeletionPreflight | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");

  const t = ar
    ? {
        titleProject: "حذف المشروع نهائياً",
        titleClient: "حذف العميل نهائياً",
        irreversible: "لا يمكن التراجع عن هذا الإجراء",
        irreversibleEn: "THIS ACTION CANNOT BE UNDONE",
        notArchive: "هذا ليس أرشفة أو إيقافاً: ستُحذف السجلات والملفات التالية من قاعدة البيانات والتخزين بشكل دائم.",
        clientProjects: (count: number) => (count === 0 ? "لا يملك هذا العميل مشاريع." : `سيتم أيضاً حذف ${count} ${count === 1 ? "مشروع" : count === 2 ? "مشروعين" : "مشاريع"} يملكها هذا العميل مع كل بياناتها.`),
        staffKept: "حسابات المهندسين والعمال المعينين لن تُحذف.",
        willDelete: "سيتم حذف:",
        typeCode: "اكتب معرّف المشروع للتأكيد",
        typeDelete: "اكتب DELETE للتأكيد",
        cancel: "إلغاء",
        confirm: "حذف نهائي",
        deleting: "جاري الحذف...",
        loading: "جاري حساب أثر الحذف...",
        blocked: "لا يمكن حذف هذا العميل: له سجلات داخل مشروع يملكه عميل آخر (جزء من تاريخ ذلك المشروع).",
        changed: "تغيّرت مشاريع العميل منذ عرض الأثر. راجع الأثر مرة أخرى.",
        mismatch: "عبارة التأكيد غير مطابقة.",
        size: "الحجم"
      }
    : {
        titleProject: "Delete project permanently",
        titleClient: "Delete client permanently",
        irreversible: "THIS ACTION CANNOT BE UNDONE",
        irreversibleEn: "لا يمكن التراجع عن هذا الإجراء",
        notArchive: "This is not archive or suspend: the records and files below are removed from the database and storage for good.",
        clientProjects: (count: number) => (count === 0 ? "This client owns no projects." : `${count} project${count === 1 ? "" : "s"} owned by this client will also be deleted with all their data.`),
        staffKept: "Assigned engineer and worker accounts are not deleted.",
        willDelete: "This will permanently delete:",
        typeCode: "Type the project code to confirm",
        typeDelete: "Type DELETE to confirm",
        cancel: "Cancel",
        confirm: "Delete permanently",
        deleting: "Deleting...",
        loading: "Calculating deletion impact...",
        blocked: "This client cannot be deleted: they authored records inside a project owned by another client (part of that project's history).",
        changed: "The client's projects changed since the impact was shown. Review it again.",
        mismatch: "The confirmation text does not match.",
        size: "Size"
      };

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setTyped("");
    setError("");
    setPreflight(null);
    apiRequest<ProjectDeletionPreflight | ClientDeletionPreflight>(`/admin/${target.kind === "project" ? "projects" : "clients"}/${target.id}/deletion-impact`)
      .then((result) => { if (alive) setPreflight(result); })
      .catch((requestError: Error) => { if (alive) setError(requestError.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, target.kind, target.id]);

  const phrase = preflight?.confirmationPhrase ?? "";
  const matches = phrase.length > 0 && typed.normalize("NFKC").trim().toUpperCase() === phrase.normalize("NFKC").trim().toUpperCase();
  const blocked = preflight && "blockers" in preflight && preflight.blockers.total > 0;
  const clientProjects = preflight && "projects" in preflight ? preflight.projects : null;

  async function confirm() {
    if (!preflight || !matches || blocked) return;
    setBusy(true);
    setError("");
    try {
      const body = target.kind === "client" ? { confirmation: typed, acknowledgedProjectCount: clientProjects?.length ?? 0 } : { confirmation: typed };
      const result = await apiRequest<DeletionResult>(`/admin/${target.kind === "project" ? "projects" : "clients"}/${target.id}`, {
        method: "DELETE",
        body: JSON.stringify(body)
      });
      onDeleted(result);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.code === "DELETE_IMPACT_CHANGED") setError(t.changed);
      else if (requestError instanceof ApiError && requestError.code === "DELETE_BLOCKED_AUTHORED_RECORDS") setError(t.blocked);
      else if (requestError instanceof ApiError && requestError.code === "DELETE_CONFIRMATION_MISMATCH") setError(t.mismatch);
      else setError(requestError instanceof Error ? requestError.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  const impact = preflight?.impact;
  const rows = impact ? IMPACT_ROWS.filter((row) => (impact[row.key] ?? 0) > 0) : [];

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={target.kind === "project" ? t.titleProject : t.titleClient}
      className="permanent-delete"
      footer={
        <>
          <button type="button" className="ui-button ui-button--secondary" onClick={onClose} disabled={busy}>{t.cancel}</button>
          <button type="button" className="ui-button ui-button--danger" onClick={() => void confirm()} disabled={!matches || busy || Boolean(blocked) || loading}>
            <Trash2 size={16} aria-hidden="true" /> {busy ? t.deleting : t.confirm}
          </button>
        </>
      }
    >
      <div className="permanent-delete__warning" role="alert">
        <AlertTriangle size={20} aria-hidden="true" />
        <div>
          <strong>{t.irreversible}</strong>
          <span lang={ar ? "en" : "ar"} dir={ar ? "ltr" : "rtl"}>{t.irreversibleEn}</span>
        </div>
      </div>
      <p className="permanent-delete__lead">{t.notArchive}</p>

      {loading && <p className="permanent-delete__loading">{t.loading}</p>}

      {preflight && (
        <>
          <div className="permanent-delete__subject">
            {"project" in preflight ? (
              <>
                <strong dir="auto">{preflight.project.name}</strong>
                <bdi className="mono" dir="ltr">{preflight.project.code}</bdi>
              </>
            ) : (
              <>
                <strong dir="auto">{preflight.client.displayName}</strong>
                <bdi className="mono" dir="ltr">{preflight.client.email}</bdi>
              </>
            )}
          </div>

          {clientProjects && (
            <div className="permanent-delete__projects">
              <strong>{t.clientProjects(clientProjects.length)}</strong>
              {clientProjects.length > 0 && (
                <ul>
                  {clientProjects.map((project) => (
                    <li key={project.id}><span dir="auto">{project.name}</span> <bdi className="mono" dir="ltr">{project.code}</bdi></li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="permanent-delete__impact">
            <span>{t.willDelete}</span>
            <dl>
              {rows.map((row) => (
                <div key={row.key}>
                  <dt>{ar ? row.ar : row.en}</dt>
                  <dd className="mono"><bdi>{impact?.[row.key]}</bdi></dd>
                </div>
              ))}
              {impact && impact.fileBytes > 0 && (
                <div>
                  <dt>{t.size}</dt>
                  <dd className="mono" dir="ltr">{formatBytes(impact.fileBytes)}</dd>
                </div>
              )}
            </dl>
            <small>{t.staffKept}</small>
          </div>

          {blocked ? (
            <div className="form-error">{t.blocked}</div>
          ) : (
            <label className="ui-field permanent-delete__confirm" htmlFor={inputId}>
              <span>
                {target.kind === "project" ? t.typeCode : t.typeDelete}: <bdi className="mono" dir="ltr">{phrase}</bdi>
              </span>
              <input
                id={inputId}
                className="mono"
                dir="ltr"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>
          )}
        </>
      )}
      {error && <div className="form-error">{error}</div>}
    </Modal>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
