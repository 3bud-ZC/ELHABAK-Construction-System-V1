"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, PageHeader } from "@elhabak/ui";
import { Building2, Calendar, MapPin, UserRound, Users } from "lucide-react";
import {
  apiRequest,
  categoryLabel,
  formatAppDate,
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
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    code: "",
    category: "MIXED",
    clientId: mode === "create" ? searchParams.get("clientId") ?? "" : "",
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
            optionalDetails: "تفاصيل اختيارية",
            name: "اسم المشروع",
            code: "معرّف المشروع",
            codeAuto: "يتم إنشاء المعرّف تلقائياً عند الحفظ",
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
            createdTitle: "تم إنشاء المشروع",
            openWorkspace: "فتح مساحة المشروع",
            financialSetup: "الإعداد المالي",
            loadingLabel: "جاري تحميل بيانات المشروع...",
            loadingTitle: "جاري التحميل...",
            noClient: "بلا عميل",
            noEngineer: "بلا مهندس",
            noLocation: "بلا موقع محدد",
            team: "الفريق الميداني",
            noTeam: "لا يوجد عمال معينون",
            dates: "التواريخ",
            noDates: "لم تحدد بعد",
            filesUnit: "ملف",
            record: "سجل المشروع",
            recordHint: "مراجعة مباشرة للبيانات قبل الحفظ.",
            unassigned: "غير محدد"
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
            optionalDetails: "Optional details",
            name: "Project name",
            code: "Project identifier",
            codeAuto: "Generated automatically when the project is saved",
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
            createdTitle: "Project created",
            openWorkspace: "Open project workspace",
            financialSetup: "Financial setup",
            loadingLabel: "Loading project data...",
            loadingTitle: "Loading...",
            noClient: "No client",
            noEngineer: "No engineer",
            noLocation: "No location set",
            team: "Field team",
            noTeam: "No workers assigned",
            dates: "Dates",
            noDates: "Not set yet",
            filesUnit: "file",
            record: "Project record",
            recordHint: "A live review of the record before saving.",
            unassigned: "Unassigned"
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
    if (!form.name || !form.clientId || !form.engineerId) {
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
      setProject(saved);
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
    <section className="app-page project-edit-page">
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
      {mode === "create" && project && (
        <section className="project-created-banner" aria-live="polite">
          <div className="project-created-banner__identity">
            <span className="project-created-banner__eyebrow">{labels.createdTitle}</span>
            <strong>{project.name}</strong>
            <span className="mono"><bdi>{project.code}</bdi></span>
          </div>
          <div className="project-created-banner__context">
            <span>{project.client?.user.displayName ?? labels.unassigned}</span>
            <span>{project.engineer?.displayName ?? labels.unassigned}</span>
          </div>
          <div className="project-created-banner__actions">
            <Link className="ui-button ui-button--primary ui-button--sm" href={locale === "ar" ? `/app/projects/${project.id}` : `/app/projects/${project.id}?lang=en`}>
              {labels.openWorkspace}
            </Link>
            <Link className="ui-button ui-button--ghost ui-button--sm" href={locale === "ar" ? `/app/projects/${project.id}/finance` : `/app/projects/${project.id}/finance?lang=en`}>
              {labels.financialSetup}
            </Link>
          </div>
        </section>
      )}

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
                    {project.startDate ? formatAppDate(project.startDate, locale) : labels.noDates}
                    {" — "}
                    {project.targetDate ? formatAppDate(project.targetDate, locale) : labels.noDates}
                  </strong>
                </div>
              </div>
            </>
          )}

          <form className="form-panels project-form-panels" onSubmit={(event) => void submit(event)}>
            <div className="project-form-main">
            <div className="form-panel">
              <div className="form-panel__head">
                <span className="form-panel__index">01</span>
                <h3 className="form-panel__title">{labels.basicInfo}</h3>
              </div>
              <div className="form-grid">
                <label className="ui-field">
                  <span>{labels.name} <strong className="required-star">*</strong></span>
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
                </label>
                <div className="ui-field generated-code-field">
                  <span>{labels.code}</span>
                  <div className="generated-code-field__value mono"><bdi>{form.code || "PRJ-2026-XXXX"}</bdi></div>
                  <small>{labels.codeAuto}</small>
                </div>
                <label className="ui-field">
                  <span>{labels.category}</span>
                  <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ProjectCategory })}>
                    {categories.map((category) => (
                      <option value={category} key={category}>
                        {categoryLabel(category, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ui-field">
                  <span>{labels.location}</span>
                  <input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
                </label>
                <label className="ui-field full-span">
                  <span>{labels.notes}</span>
                  <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
                </label>
              </div>
            </div>

            <div className="form-panel">
              <div className="form-panel__head">
                <span className="form-panel__index">02</span>
                <h3 className="form-panel__title">{labels.teamAssignment}</h3>
              </div>
              <div className="form-grid">
                <label className="ui-field">
                  <span>{labels.client} <strong className="required-star">*</strong></span>
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
                  <span>{labels.engineer} <strong className="required-star">*</strong></span>
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
                  <span>{labels.workers}</span>
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
              <div className="form-panel__head">
                <span className="form-panel__index">03</span>
                <h3 className="form-panel__title">{labels.schedule}</h3>
              </div>
              <div className="form-grid">
                <label className="ui-field">
                  <span>{labels.startDate}</span>
                  <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
                </label>
                <label className="ui-field">
                  <span>{labels.targetDate}</span>
                  <input type="date" value={form.targetDate} onChange={(event) => setForm({ ...form, targetDate: event.target.value })} />
                </label>
              </div>
            </div>

            <div className="form-panel">
              <div className="form-panel__head">
                <span className="form-panel__index">04</span>
                <h3 className="form-panel__title">{labels.optionalDetails}</h3>
              </div>
              <div className="form-grid">
                <label className="ui-field">
                  <span>{labels.phase}</span>
                  <select value={form.phase} onChange={(event) => setForm({ ...form, phase: event.target.value as ProjectPhase })}>
                    {phases.map((phase) => (
                      <option value={phase} key={phase}>
                        {phaseLabel(phase, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ui-field">
                  <span>{labels.status}</span>
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProjectStatus })}>
                    {statuses.map((statusOption) => (
                      <option value={statusOption} key={statusOption}>
                        {statusLabel(statusOption, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ui-field full-span">
                  <span>{labels.progress} (%)</span>
                  <input type="number" min="0" max="100" value={form.progress} onChange={(event) => setForm({ ...form, progress: event.target.value })} />
                </label>
              </div>
            </div>

            </div>

            <aside className="project-form-rail">
              <div className="project-form-summary">
                <span className="project-form-summary__kicker">{labels.record}</span>
                <strong className="project-form-summary__name">{form.name || labels.name}</strong>
                <span className="project-form-summary__code mono"><bdi>{form.code || "PRJ-XXXX"}</bdi></span>
                <dl className="project-form-summary__facts">
                  <div>
                    <dt>{labels.client}</dt>
                    <dd>{clients.find((client) => client.id === form.clientId)?.user.displayName ?? labels.unassigned}</dd>
                  </div>
                  <div>
                    <dt>{labels.engineer}</dt>
                    <dd>{engineers.find((engineer) => engineer.id === form.engineerId)?.displayName ?? labels.unassigned}</dd>
                  </div>
                  <div>
                    <dt>{labels.category}</dt>
                    <dd>{categoryLabel(form.category, locale)}</dd>
                  </div>
                  <div>
                    <dt>{labels.phase}</dt>
                    <dd>{phaseLabel(form.phase, locale)}</dd>
                  </div>
                  <div>
                    <dt>{labels.status}</dt>
                    <dd><Badge tone={statusTone(form.status)}>{statusLabel(form.status, locale)}</Badge></dd>
                  </div>
                </dl>
                <div className="project-form-summary__progress">
                  <div><span>{labels.progress}</span><strong className="mono"><bdi>{Math.max(0, Math.min(100, Number(form.progress) || 0))}%</bdi></strong></div>
                  <div className="progress-track progress-track--orange"><span style={{ width: `${Math.max(0, Math.min(100, Number(form.progress) || 0))}%` }} /></div>
                </div>
                <p className="project-form-summary__hint">{labels.recordHint}</p>
              </div>
              <div className="form-actions-bar project-form-actions">
                <Link className="ui-button ui-button--secondary" href={locale === "ar" ? "/app/admin/projects" : "/app/admin/projects?lang=en"}>
                  {labels.back}
                </Link>
                <button className="ui-button ui-button--primary" type="submit" disabled={saving}>
                  {saving ? (locale === "ar" ? "جاري الحفظ..." : "Saving...") : labels.save}
                </button>
              </div>
            </aside>
          </form>

          {project && (
            <section className="updates-panel">
              <div className="section-title">
                <h2>{labels.recent}</h2>
              </div>
              {(project.siteUpdates ?? []).length === 0 && <EmptyState title={labels.emptyUpdates} description={labels.emptyUpdatesHint} />}
              {(project.siteUpdates ?? []).map((update) => (
                <article className="update-card" key={update.id}>
                  <div className="update-card__head">
                    <div className="update-card__author">
                      <span className="update-card__avatar">{update.author.displayName.slice(0, 2).toUpperCase()}</span>
                      <span>
                        <strong>{update.author.displayName}</strong>
                        <span>{roleLabel(update.author.role, locale)}</span>
                      </span>
                    </div>
                    <time><bdi>{formatAppDate(update.createdAt, locale, true)}</bdi></time>
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
