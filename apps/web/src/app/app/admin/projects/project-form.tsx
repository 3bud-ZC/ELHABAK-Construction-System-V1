"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  apiRequest,
  categoryLabel,
  phaseLabel,
  roleLabel,
  statusLabel,
  type ClientRecord,
  type ProjectCategory,
  type ProjectPhase,
  type ProjectRecord,
  type ProjectStatus,
  type UserRecord
} from "../../../../lib/api";

type ProjectFormProps = {
  mode: "create" | "edit";
  projectId?: string;
};

type FormState = {
  name: string;
  code: string;
  category: ProjectCategory;
  clientId: string;
  engineerId: string;
  workerIds: string[];
  location: string;
  startDate: string;
  targetDate: string;
  phase: ProjectPhase;
  progress: string;
  status: ProjectStatus;
  notes: string;
};

const categories: ProjectCategory[] = ["DESIGN", "CONSTRUCTION", "FINISHING", "GENERAL_CONTRACTING", "FURNITURE", "MIXED"];
const phases: ProjectPhase[] = ["SITE_INSPECTION", "DESIGN", "PRELIMINARY_ESTIMATION", "EXECUTION", "INITIAL_HANDOVER", "FINAL_HANDOVER"];
const statuses: ProjectStatus[] = ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];

export function ProjectForm({ mode, projectId }: ProjectFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    code: "",
    category: "MIXED",
    clientId: "",
    engineerId: "",
    workerIds: [],
    location: "",
    startDate: "",
    targetDate: "",
    phase: "SITE_INSPECTION",
    progress: "0",
    status: "PLANNED",
    notes: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const labels = useMemo(
    () =>
      locale === "ar"
        ? {
            createTitle: "إنشاء مشروع",
            editTitle: "تفاصيل المشروع",
            save: "حفظ المشروع",
            back: "العودة للمشاريع",
            name: "اسم المشروع",
            code: "كود المشروع",
            category: "الفئة",
            client: "العميل",
            engineer: "المهندس المسؤول",
            workers: "العمال / المقاولون",
            location: "الموقع",
            startDate: "تاريخ البدء",
            targetDate: "تاريخ التسليم المتوقع",
            phase: "المرحلة الحالية",
            progress: "نسبة الإنجاز",
            status: "الحالة",
            notes: "ملاحظات",
            recent: "آخر تحديثات الموقع",
            emptyUpdates: "لا توجد تحديثات موقع بعد.",
            required: "راجع الحقول المطلوبة.",
            saved: "تم حفظ المشروع."
          }
        : {
            createTitle: "Create Project",
            editTitle: "Project Details",
            save: "Save Project",
            back: "Back to projects",
            name: "Project name",
            code: "Project code",
            category: "Category",
            client: "Client",
            engineer: "Responsible engineer",
            workers: "Workers / contractors",
            location: "Location",
            startDate: "Start date",
            targetDate: "Expected completion",
            phase: "Current phase",
            progress: "Progress",
            status: "Status",
            notes: "Notes",
            recent: "Recent site updates",
            emptyUpdates: "No site updates yet.",
            required: "Check required fields.",
            saved: "Project saved."
          },
    [locale]
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      apiRequest<ClientRecord[]>("/admin/clients"),
      apiRequest<UserRecord[]>("/admin/users"),
      mode === "edit" && projectId ? apiRequest<ProjectRecord>(`/admin/projects/${projectId}`) : Promise.resolve(null)
    ])
      .then(([clientRows, userRows, projectRow]) => {
        if (!alive) return;
        setClients(clientRows);
        setUsers(userRows);
        setProject(projectRow);
        if (projectRow) {
          setForm({
            name: projectRow.name,
            code: projectRow.code ?? "",
            category: projectRow.category,
            clientId: projectRow.client?.id ?? "",
            engineerId: projectRow.engineer?.id ?? "",
            workerIds: projectRow.workers.map((worker) => worker.id),
            location: projectRow.location ?? "",
            startDate: projectRow.startDate?.slice(0, 10) ?? "",
            targetDate: projectRow.targetDate?.slice(0, 10) ?? "",
            phase: projectRow.phase,
            progress: String(projectRow.progress),
            status: projectRow.status,
            notes: projectRow.notes ?? ""
          });
        }
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
  }, [mode, projectId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!form.name || !form.code || !form.clientId || !form.engineerId) {
      setError(labels.required);
      return;
    }
    setSaving(true);
    const payload = { ...form, progress: Number(form.progress) };
    try {
      const saved = await apiRequest<ProjectRecord>(mode === "create" ? "/admin/projects" : `/admin/projects/${projectId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        body: JSON.stringify(payload)
      });
      setSuccess(labels.saved);
      if (mode === "create") router.replace(locale === "ar" ? `/app/admin/projects/${saved.id}` : `/app/admin/projects/${saved.id}?lang=en`);
      else setProject(saved);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
    } finally {
      setSaving(false);
    }
  }

  const engineers = users.filter((user) => user.role === "ENGINEER" && user.isActive);
  const workers = users.filter((user) => user.role === "WORKER" && user.isActive);

  function setWorker(workerId: string, checked: boolean) {
    setForm((current) => ({
      ...current,
      workerIds: checked ? [...current.workerIds, workerId] : current.workerIds.filter((id) => id !== workerId)
    }));
  }

  return (
    <section className="app-page">
      <div className="page-heading page-heading--row">
        <div>
          <h1>{mode === "create" ? labels.createTitle : labels.editTitle}</h1>
          {project && <p>{project.name} / {project.code}</p>}
        </div>
        <Link className="ui-button ui-button--secondary" href={locale === "ar" ? "/app/admin/projects" : "/app/admin/projects?lang=en"}>
          {labels.back}
        </Link>
      </div>

      {loading && <div className="empty-state">{locale === "ar" ? "جاري التحميل..." : "Loading..."}</div>}
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      {!loading && (
        <>
          <form className="admin-form project-form" onSubmit={(event) => void submit(event)}>
            <label className="ui-field">
              {labels.name}
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <label className="ui-field">
              {labels.code}
              <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
            </label>
            <label className="ui-field">
              {labels.category}
              <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ProjectCategory })}>
                {categories.map((category) => <option value={category} key={category}>{categoryLabel(category, locale)}</option>)}
              </select>
            </label>
            <label className="ui-field">
              {labels.client}
              <select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} required>
                <option value="">-</option>
                {clients.map((client) => <option value={client.id} key={client.id}>{client.user.displayName}</option>)}
              </select>
            </label>
            <label className="ui-field">
              {labels.engineer}
              <select value={form.engineerId} onChange={(event) => setForm({ ...form, engineerId: event.target.value })} required>
                <option value="">-</option>
                {engineers.map((engineer) => <option value={engineer.id} key={engineer.id}>{engineer.displayName} - {roleLabel(engineer.role, locale)}</option>)}
              </select>
            </label>
            <label className="ui-field">
              {labels.location}
              <input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
            </label>
            <label className="ui-field">
              {labels.startDate}
              <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
            </label>
            <label className="ui-field">
              {labels.targetDate}
              <input type="date" value={form.targetDate} onChange={(event) => setForm({ ...form, targetDate: event.target.value })} />
            </label>
            <label className="ui-field">
              {labels.phase}
              <select value={form.phase} onChange={(event) => setForm({ ...form, phase: event.target.value as ProjectPhase })}>
                {phases.map((phase) => <option value={phase} key={phase}>{phaseLabel(phase, locale)}</option>)}
              </select>
            </label>
            <label className="ui-field">
              {labels.progress}
              <input type="number" min="0" max="100" value={form.progress} onChange={(event) => setForm({ ...form, progress: event.target.value })} />
            </label>
            <label className="ui-field">
              {labels.status}
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProjectStatus })}>
                {statuses.map((status) => <option value={status} key={status}>{statusLabel(status, locale)}</option>)}
              </select>
            </label>
            <label className="ui-field full-span">
              {labels.workers}
              <div className="checkbox-grid">
                {workers.map((worker) => (
                  <label className="check-field" key={worker.id}>
                    <input type="checkbox" checked={form.workerIds.includes(worker.id)} onChange={(event) => setWorker(worker.id, event.target.checked)} />
                    {worker.displayName}
                  </label>
                ))}
              </div>
            </label>
            <label className="ui-field full-span">
              {labels.notes}
              <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </label>
            <div className="full-span lifecycle-strip">
              {phases.map((phase) => {
                const currentIndex = phases.indexOf(form.phase);
                const phaseIndex = phases.indexOf(phase);
                const state = phaseIndex < currentIndex ? "done" : phaseIndex === currentIndex ? "current" : "upcoming";
                return <span className={state} key={phase}>{phaseLabel(phase, locale)}</span>;
              })}
            </div>
            <button className="ui-button ui-button--primary full-span" type="submit" disabled={saving}>
              {saving ? (locale === "ar" ? "جاري الحفظ..." : "Saving...") : labels.save}
            </button>
          </form>

          {project && (
            <section className="updates-panel">
              <h2>{labels.recent}</h2>
              {project.siteUpdates.length === 0 && <div className="empty-state">{labels.emptyUpdates}</div>}
              {project.siteUpdates.map((update) => (
                <article className="update-card" key={update.id}>
                  <strong>{update.author.displayName}</strong>
                  <span>{new Date(update.createdAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}</span>
                  <p>{update.note || "-"}</p>
                  <span>{update.media.length} {locale === "ar" ? "ملف" : "files"}</span>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </section>
  );
}
