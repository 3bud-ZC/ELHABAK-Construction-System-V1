"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, PageHeader } from "@elhabak/ui";
import { Building2, Calendar, MapPin, UserRound, Users } from "lucide-react";
import {
  apiRequest,
  categoryLabel,
  phaseLabel,
  roleLabel,
  statusLabel,
  statusTone,
  type ClientRecord,
  type ProjectCategory,
  type ProjectPhase,
  type ProjectRecord,
  type ProjectStatus,
  type UserRecord
} from "../../../../lib/api";
import { Lifecycle } from "../../../../components/lifecycle";

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
            createLead: "أدخل بيانات المشروع الأساسية وفريق العمل المسؤول.",
            editLead: "مركز التحكم في المشروع - البيانات والفريق والمرحلة الحالية.",
            save: "حفظ المشروع",
            back: "العودة للمشاريع",
            basicInfo: "بيانات المشروع",
            teamAssignment: "الفريق والعميل",
            schedule: "الجدول الزمني",
            statusPhase: "الحالة والمرحلة",
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
            emptyUpdates: "لا توجد تحديثات موقع بعد",
            emptyUpdatesHint: "ستظهر هنا تحديثات المهندسين والعمال الميدانية.",
            required: "راجع الحقول المطلوبة.",
            saved: "تم حفظ المشروع.",
            loadingLabel: "جاري تحميل بيانات المشروع...",
            loadingTitle: "جاري التحميل...",
            noClient: "بلا عميل",
            noEngineer: "بلا مهندس",
            noLocation: "بلا موقع محدد",
            team: "الفريق الميداني",
            noTeam: "لا يوجد عمال معينون",
            dates: "التواريخ",
            noDates: "لم تحدد بعد",
            filesUnit: "ملف"
          }
        : {
            createTitle: "Create Project",
            createLead: "Enter the project's core details and responsible team.",
            editLead: "Project command center - details, team, and current phase.",
            save: "Save Project",
            back: "Back to projects",
            basicInfo: "Project details",
            teamAssignment: "Team & client",
            schedule: "Schedule",
            statusPhase: "Status & phase",
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
            emptyUpdates: "No site updates yet",
            emptyUpdatesHint: "Field updates from engineers and workers will appear here.",
            required: "Check required fields.",
            saved: "Project saved.",
            loadingLabel: "Loading project data...",
            loadingTitle: "Loading...",
            noClient: "No client",
            noEngineer: "No engineer",
            noLocation: "No location set",
            team: "Field team",
            noTeam: "No workers assigned",
            dates: "Dates",
            noDates: "Not set yet",
            filesUnit: "file"
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

  const dateFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium" });

  return (
    <section className="app-page">
      <PageHeader
        title={mode === "create" ? labels.createTitle : (project?.name ?? (loading ? labels.loadingTitle : labels.createTitle))}
        description={mode === "create" ? labels.createLead : labels.editLead}
        actions={
          <Link className="ui-button ui-button--secondary" href={locale === "ar" ? "/app/admin/projects" : "/app/admin/projects?lang=en"}>
            {labels.back}
          </Link>
        }
      />

      {loading && <LoadingState label={labels.loadingLabel} />}
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      {!loading && (
        <>
          {project && (
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

              <div className="overview-modules" style={{ marginTop: "var(--space-4)" }}>
                <div className="overview-module">
                  <span className="overview-module__label">
                    <UserRound size={14} /> {labels.client}
                  </span>
                  <strong>{project.client?.user.displayName ?? labels.noClient}</strong>
                  <span>{project.client?.user.email ?? ""}</span>
                </div>
                <div className="overview-module">
                  <span className="overview-module__label">
                    <Building2 size={14} /> {labels.engineer}
                  </span>
                  <strong>{project.engineer?.displayName ?? labels.noEngineer}</strong>
                  <span>{project.engineer?.email ?? ""}</span>
                </div>
                <div className="overview-module">
                  <span className="overview-module__label">
                    <Users size={14} /> {labels.team}
                  </span>
                  <strong>{project.workers.length > 0 ? project.workers.map((w) => w.displayName).join(", ") : labels.noTeam}</strong>
                </div>
                <div className="overview-module">
                  <span className="overview-module__label">
                    <MapPin size={14} /> {labels.location}
                  </span>
                  <strong>{project.location ?? labels.noLocation}</strong>
                </div>
              </div>

              <div className="overview-modules" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: "var(--space-3)" }}>
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

          <form className="form-panels" onSubmit={(event) => void submit(event)} style={{ marginTop: "var(--space-6)" }}>
            <div className="form-panel">
              <h3 className="form-panel__title">{labels.basicInfo}</h3>
              <div className="form-grid">
                <label className="ui-field">
                  {labels.name}
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
                </label>
                <label className="ui-field">
                  {labels.code}
                  <input className="mono" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
                </label>
                <label className="ui-field">
                  {labels.category}
                  <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ProjectCategory })}>
                    {categories.map((category) => (
                      <option value={category} key={category}>
                        {categoryLabel(category, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ui-field">
                  {labels.location}
                  <input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
                </label>
                <label className="ui-field full-span">
                  {labels.notes}
                  <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
                </label>
              </div>
            </div>

            <div className="form-panel">
              <h3 className="form-panel__title">{labels.teamAssignment}</h3>
              <div className="form-grid">
                <label className="ui-field">
                  {labels.client}
                  <select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} required>
                    <option value="">-</option>
                    {clients.map((client) => (
                      <option value={client.id} key={client.id}>
                        {client.user.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ui-field">
                  {labels.engineer}
                  <select value={form.engineerId} onChange={(event) => setForm({ ...form, engineerId: event.target.value })} required>
                    <option value="">-</option>
                    {engineers.map((engineer) => (
                      <option value={engineer.id} key={engineer.id}>
                        {engineer.displayName} - {roleLabel(engineer.role, locale)}
                      </option>
                    ))}
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
              </div>
            </div>

            <div className="form-panel">
              <h3 className="form-panel__title">{labels.schedule}</h3>
              <div className="form-grid">
                <label className="ui-field">
                  {labels.startDate}
                  <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
                </label>
                <label className="ui-field">
                  {labels.targetDate}
                  <input type="date" value={form.targetDate} onChange={(event) => setForm({ ...form, targetDate: event.target.value })} />
                </label>
              </div>
            </div>

            <div className="form-panel">
              <h3 className="form-panel__title">{labels.statusPhase}</h3>
              <div className="form-grid">
                <label className="ui-field">
                  {labels.phase}
                  <select value={form.phase} onChange={(event) => setForm({ ...form, phase: event.target.value as ProjectPhase })}>
                    {phases.map((phase) => (
                      <option value={phase} key={phase}>
                        {phaseLabel(phase, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ui-field">
                  {labels.status}
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProjectStatus })}>
                    {statuses.map((statusOption) => (
                      <option value={statusOption} key={statusOption}>
                        {statusLabel(statusOption, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ui-field full-span">
                  {labels.progress}
                  <input type="number" min="0" max="100" value={form.progress} onChange={(event) => setForm({ ...form, progress: event.target.value })} />
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button className="ui-button ui-button--primary" type="submit" disabled={saving}>
                {saving ? (locale === "ar" ? "جاري الحفظ..." : "Saving...") : labels.save}
              </button>
            </div>
          </form>

          {project && (
            <section className="updates-panel">
              <div className="section-title">
                <h2>{labels.recent}</h2>
              </div>
              {project.siteUpdates.length === 0 && <EmptyState title={labels.emptyUpdates} description={labels.emptyUpdatesHint} />}
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
                  <p>{update.note || "-"}</p>
                  <span>
                    {update.media.length} {labels.filesUnit}
                  </span>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </section>
  );
}
