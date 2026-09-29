"use client";

import { useSearchParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ActionMenu, Badge, ConfirmDialog, Drawer, EmptyState, ErrorState, LoadingState, Modal, ProgressBar } from "@elhabak/ui";
import {
  ArrowDown,
  ArrowUp,
  CalendarRange,
  CircleAlert,
  ClipboardCheck,
  Eye,
  HardHat,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  UserCog,
  UsersRound
} from "lucide-react";
import {
  activityLabel,
  apiRequest,
  EXECUTION_STAGE_STATUSES,
  executionStatusLabel,
  executionStatusTone,
  formatAppDate,
  phaseLabel,
  siteUpdateTypeLabel,
  type ExecutionMember,
  type ExecutionOverview,
  type ExecutionStageDetail,
  type ExecutionStageRecord,
  type ExecutionStageStatus,
  type ProjectRecord,
  type UserRecord
} from "../../../lib/api";
import { useCurrentUser } from "../../../lib/user-context";
import { ProjectWorkspace } from "../../../components/project-workspace";

type StageForm = {
  name: string;
  code: string;
  description: string;
  status: ExecutionStageStatus;
  progress: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
};

const EMPTY_FORM: StageForm = {
  name: "",
  code: "",
  description: "",
  status: "PLANNED",
  progress: "0",
  plannedStartDate: "",
  plannedEndDate: "",
  actualStartDate: "",
  actualEndDate: ""
};

type Dialog =
  | { kind: "create" }
  | { kind: "edit"; stage: ExecutionStageRecord }
  | { kind: "progress"; stage: ExecutionStageRecord }
  | { kind: "team"; stage: ExecutionStageRecord }
  | { kind: "delete"; stage: ExecutionStageRecord }
  | null;

export function ExecutionControl({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const user = useCurrentUser();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [data, setData] = useState<ExecutionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const t = useMemo(() => copy(ar), [ar]);

  const load = useCallback(async () => {
    const [header, execution] = await Promise.all([
      apiRequest<ProjectRecord>(`/projects/${projectId}`),
      apiRequest<ExecutionOverview>(`/projects/${projectId}/execution`)
    ]);
    setProject(header);
    setData(execution);
  }, [projectId]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    load()
      .then(() => { if (alive) setError(""); })
      .catch((requestError: Error) => { if (alive) setError(requestError.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setActionError("");
    try {
      await action();
      await load();
      setDialog(null);
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  function move(stage: ExecutionStageRecord, delta: -1 | 1) {
    if (!data) return;
    const ids = data.stages.map((item) => item.id);
    const index = ids.indexOf(stage.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target] as string, ids[index] as string];
    void run(() => apiRequest(`/projects/${projectId}/execution/stages/order`, { method: "PUT", body: JSON.stringify({ stageIds: ids }) }));
  }

  if (loading) return <section className="app-page"><LoadingState label={t.loading} /></section>;
  if (error || !project || !data) {
    return (
      <section className="app-page">
        <ErrorState title={t.loadFailed} description={error} retry={<button type="button" className="ui-button ui-button--secondary" onClick={() => window.location.reload()}>{t.retry}</button>} />
      </section>
    );
  }

  const isClient = user.role === "CLIENT";
  const isWorker = user.role === "WORKER";
  const manage = data.permissions.manage;
  const summary = data.summary;
  const inExecution = data.phase === "EXECUTION";

  return (
    <section className="app-page project-workspace-page execution-page">
      <ProjectWorkspace project={project} locale={locale} role={user.role} active="execution" />

      <header className="execution-head">
        <div>
          <span className="section-kicker">{t.kicker}</span>
          <h2>{isWorker ? t.myStages : t.title}</h2>
          <p>{inExecution ? t.lead : t.notInExecution(phaseLabel(data.phase, locale))}</p>
        </div>
        {manage && (
          <button type="button" className="ui-button ui-button--primary" onClick={() => { setActionError(""); setDialog({ kind: "create" }); }}>
            <Plus size={16} aria-hidden="true" /> {t.addStage}
          </button>
        )}
      </header>

      <dl className="execution-kpis" aria-label={t.title}>
        <div className="execution-kpi execution-kpi--progress">
          <dt>{t.executionProgress}</dt>
          <dd>
            <strong className="mono" dir="ltr">{summary.executionProgress === null ? "—" : `${summary.executionProgress}%`}</strong>
            <ProgressBar value={summary.executionProgress ?? 0} tone={(summary.executionProgress ?? 0) >= 70 ? "success" : "orange"} aria-label={t.executionProgress} />
            <small>{t.equalWeight}</small>
          </dd>
        </div>
        <div className="execution-kpi"><dt><Layers size={15} aria-hidden="true" />{t.workPackages}</dt><dd className="mono">{summary.total}</dd></div>
        {summary.assignedEngineers !== undefined && <div className="execution-kpi"><dt><UserCog size={15} aria-hidden="true" />{t.engineers}</dt><dd className="mono">{summary.assignedEngineers}</dd></div>}
        {summary.assignedWorkers !== undefined && <div className="execution-kpi"><dt><HardHat size={15} aria-hidden="true" />{t.workers}</dt><dd className="mono">{summary.assignedWorkers}</dd></div>}
        <div className="execution-kpi" data-tone={summary.blocked > 0 ? "danger" : undefined}><dt><CircleAlert size={15} aria-hidden="true" />{t.blocked}</dt><dd className="mono">{summary.blocked}</dd></div>
        <div className="execution-kpi" data-tone="success"><dt><ClipboardCheck size={15} aria-hidden="true" />{t.completed}</dt><dd className="mono">{summary.completed}</dd></div>
      </dl>
      <p className="execution-note">{t.projectProgressNote(data.projectProgress)}</p>

      {data.stages.length === 0 ? (
        <EmptyState
          icon={<Layers size={20} />}
          title={isWorker ? t.noAssigned : t.empty}
          description={isWorker ? t.noAssignedHint : manage ? t.emptyAdminHint : t.emptyHint}
          action={manage ? <button type="button" className="ui-button ui-button--primary" onClick={() => setDialog({ kind: "create" })}><Plus size={16} /> {t.addStage}</button> : undefined}
        />
      ) : (
        <ol className="execution-register">
          {data.stages.map((stage, index) => (
            <li className="execution-stage" data-status={stage.status} key={stage.id}>
              <div className="execution-stage__index mono" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
              <div className="execution-stage__main">
                <div className="execution-stage__title">
                  <h3 dir="auto">{stage.name}</h3>
                  {stage.code && <bdi className="mono" dir="ltr">{stage.code}</bdi>}
                  <Badge tone={executionStatusTone(stage.status)}>{executionStatusLabel(stage.status, locale)}</Badge>
                </div>
                <div className="execution-stage__progress">
                  <ProgressBar value={stage.progress} tone={stage.status === "BLOCKED" ? "navy" : stage.progress >= 70 ? "success" : "orange"} aria-label={`${stage.name} ${stage.progress}%`} />
                  <strong className="mono" dir="ltr">{stage.progress}%</strong>
                </div>
                <dl className="execution-stage__facts">
                  {!isClient && (
                    <>
                      <div><dt>{t.engineer}</dt><dd><MemberList members={stage.engineers ?? []} empty={t.unassigned} /></dd></div>
                      <div><dt>{t.workersLabel}</dt><dd><MemberList members={stage.workers ?? []} empty={t.unassigned} /></dd></div>
                    </>
                  )}
                  <div>
                    <dt>{t.planned}</dt>
                    <dd><DateRange from={stage.plannedStartDate} to={stage.plannedEndDate} locale={locale} empty={t.notScheduled} /></dd>
                  </div>
                </dl>
              </div>
              <div className="execution-stage__actions">
                <button type="button" className="ui-button ui-button--secondary ui-button--sm" onClick={() => setDetailId(stage.id)}><Eye size={15} aria-hidden="true" /> {t.open}</button>
                {stage.canUpdate && (
                  <button type="button" className="ui-button ui-button--secondary ui-button--sm" onClick={() => { setActionError(""); setDialog({ kind: "progress", stage }); }}><SlidersHorizontal size={15} aria-hidden="true" /> {t.updateProgress}</button>
                )}
                {manage && (
                  <ActionMenu
                    className="execution-stage__more"
                    variant="ghost"
                    label={t.more}
                    icon={<MoreHorizontal size={16} aria-hidden="true" />}
                    title={stage.name}
                    closeLabel={t.cancel}
                    items={[
                      { key: "team", label: t.assignTeam, icon: <UsersRound size={16} />, onSelect: () => { setActionError(""); setDialog({ kind: "team", stage }); } },
                      { key: "edit", label: t.edit, icon: <Pencil size={16} />, onSelect: () => { setActionError(""); setDialog({ kind: "edit", stage }); } },
                      { key: "up", label: t.moveUp, icon: <ArrowUp size={16} />, disabled: busy || index === 0, onSelect: () => move(stage, -1) },
                      { key: "down", label: t.moveDown, icon: <ArrowDown size={16} />, disabled: busy || index === data.stages.length - 1, onSelect: () => move(stage, 1) },
                      { key: "remove", label: t.remove, icon: <Trash2 size={16} />, onSelect: () => { setActionError(""); setDialog({ kind: "delete", stage }); } }
                    ]}
                  />
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {(dialog?.kind === "create" || dialog?.kind === "edit") && (
        <StageFormDialog
          t={t}
          locale={locale}
          initial={dialog.kind === "edit" ? toForm(dialog.stage) : EMPTY_FORM}
          title={dialog.kind === "edit" ? t.editStage : t.addStage}
          busy={busy}
          error={actionError}
          onClose={() => setDialog(null)}
          onSubmit={(form) =>
            void run(() =>
              dialog.kind === "edit"
                ? apiRequest(`/projects/${projectId}/execution/stages/${dialog.stage.id}`, { method: "PATCH", body: JSON.stringify(toPayload(form)) })
                : apiRequest(`/projects/${projectId}/execution/stages`, { method: "POST", body: JSON.stringify(toPayload(form)) })
            )
          }
        />
      )}

      {dialog?.kind === "progress" && (
        <ProgressDialog
          t={t}
          locale={locale}
          stage={dialog.stage}
          busy={busy}
          error={actionError}
          onClose={() => setDialog(null)}
          onSubmit={(body) => void run(() => apiRequest(`/projects/${projectId}/execution/stages/${dialog.stage.id}`, { method: "PATCH", body: JSON.stringify(body) }))}
        />
      )}

      {dialog?.kind === "team" && (
        <TeamDialog
          t={t}
          stage={dialog.stage}
          busy={busy}
          error={actionError}
          onClose={() => setDialog(null)}
          onSubmit={(userIds) => void run(() => apiRequest(`/projects/${projectId}/execution/stages/${dialog.stage.id}/team`, { method: "PUT", body: JSON.stringify({ userIds }) }))}
        />
      )}

      {dialog?.kind === "delete" && (
        <ConfirmDialog
          open
          tone="danger"
          busy={busy}
          title={t.removeTitle}
          description={t.removeLead(dialog.stage.name)}
          confirmLabel={t.remove}
          cancelLabel={t.cancel}
          onClose={() => setDialog(null)}
          onConfirm={() => void run(() => apiRequest(`/projects/${projectId}/execution/stages/${dialog.stage.id}`, { method: "DELETE" }))}
        />
      )}

      {detailId && <StageDrawer t={t} locale={locale} projectId={projectId} stageId={detailId} isClient={isClient} onClose={() => setDetailId(null)} />}
    </section>
  );
}

function MemberList({ members, empty }: { members: ExecutionMember[]; empty: string }) {
  if (members.length === 0) return <span className="execution-muted">{empty}</span>;
  return (
    <ul className="execution-members">
      {members.map((member) => (
        <li key={member.id}>
          <span dir="auto">{member.displayName}</span>
          {member.specialty && <small><bdi>{member.specialty}</bdi></small>}
        </li>
      ))}
    </ul>
  );
}

function DateRange({ from, to, locale, empty }: { from: string | null; to: string | null; locale: "ar" | "en"; empty: string }) {
  if (!from && !to) return <span className="execution-muted">{empty}</span>;
  return (
    <span className="execution-dates">
      <bdi>{from ? formatAppDate(from, locale) : "—"}</bdi>
      <span aria-hidden="true">{locale === "ar" ? "←" : "→"}</span>
      <bdi>{to ? formatAppDate(to, locale) : "—"}</bdi>
    </span>
  );
}

function toForm(stage: ExecutionStageRecord): StageForm {
  return {
    name: stage.name,
    code: stage.code ?? "",
    description: stage.description ?? "",
    status: stage.status,
    progress: String(stage.progress),
    plannedStartDate: stage.plannedStartDate ?? "",
    plannedEndDate: stage.plannedEndDate ?? "",
    actualStartDate: stage.actualStartDate ?? "",
    actualEndDate: stage.actualEndDate ?? ""
  };
}

function toPayload(form: StageForm) {
  return { ...form, name: form.name.trim(), progress: Math.round(Number(form.progress) || 0) };
}

type Copy = ReturnType<typeof copy>;

function StageFormDialog({ t, locale, initial, title, busy, error, onClose, onSubmit }: { t: Copy; locale: "ar" | "en"; initial: StageForm; title: string; busy: boolean; error: string; onClose: () => void; onSubmit: (form: StageForm) => void }) {
  const [form, setForm] = useState<StageForm>(initial);
  const set = (key: keyof StageForm) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
  }
  return (
    <Modal
      open
      wide
      onClose={busy ? () => undefined : onClose}
      title={title}
      footer={
        <>
          <button type="button" className="ui-button ui-button--secondary" onClick={onClose} disabled={busy}>{t.cancel}</button>
          <button type="submit" form="execution-stage-form" className="ui-button ui-button--primary" disabled={busy || !form.name.trim()}>{busy ? t.saving : t.save}</button>
        </>
      }
    >
      <form id="execution-stage-form" className="execution-form" onSubmit={submit}>
        <label className="ui-field execution-form__wide">
          <span>{t.stageName} <strong className="required-star">*</strong></span>
          <input value={form.name} onChange={set("name")} maxLength={120} required placeholder={t.stageNameHint} />
        </label>
        <label className="ui-field">
          <span>{t.code}</span>
          <input className="mono" dir="ltr" value={form.code} onChange={set("code")} maxLength={32} />
        </label>
        <label className="ui-field">
          <span>{t.status}</span>
          <select value={form.status} onChange={set("status")}>
            {EXECUTION_STAGE_STATUSES.map((status) => <option key={status} value={status}>{executionStatusLabel(status, locale)}</option>)}
          </select>
        </label>
        <label className="ui-field">
          <span>{t.progress} (%)</span>
          <input type="number" inputMode="numeric" min={0} max={100} step={1} value={form.progress} onChange={set("progress")} />
        </label>
        <span className="execution-form__spacer" aria-hidden="true" />
        <label className="ui-field"><span>{t.plannedStart}</span><input type="date" value={form.plannedStartDate} onChange={set("plannedStartDate")} /></label>
        <label className="ui-field"><span>{t.plannedEnd}</span><input type="date" value={form.plannedEndDate} onChange={set("plannedEndDate")} /></label>
        <label className="ui-field"><span>{t.actualStart}</span><input type="date" value={form.actualStartDate} onChange={set("actualStartDate")} /></label>
        <label className="ui-field"><span>{t.actualEnd}</span><input type="date" value={form.actualEndDate} onChange={set("actualEndDate")} /></label>
        <label className="ui-field execution-form__wide">
          <span>{t.notes}</span>
          <textarea value={form.description} onChange={set("description")} maxLength={3000} rows={3} />
        </label>
        {error && <div className="form-error execution-form__wide">{error}</div>}
      </form>
    </Modal>
  );
}

function ProgressDialog({ t, locale, stage, busy, error, onClose, onSubmit }: { t: Copy; locale: "ar" | "en"; stage: ExecutionStageRecord; busy: boolean; error: string; onClose: () => void; onSubmit: (body: Record<string, unknown>) => void }) {
  const [status, setStatus] = useState<ExecutionStageStatus>(stage.status);
  const [progress, setProgress] = useState(String(stage.progress));
  const [notes, setNotes] = useState(stage.description ?? "");
  const [actualStart, setActualStart] = useState(stage.actualStartDate ?? "");
  const [actualEnd, setActualEnd] = useState(stage.actualEndDate ?? "");
  const value = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));
  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title={`${t.updateProgress} · ${stage.name}`}
      footer={
        <>
          <button type="button" className="ui-button ui-button--secondary" onClick={onClose} disabled={busy}>{t.cancel}</button>
          <button
            type="button"
            className="ui-button ui-button--primary"
            disabled={busy}
            onClick={() => onSubmit({ status, progress: value, description: notes, actualStartDate: actualStart, actualEndDate: actualEnd })}
          >
            {busy ? t.saving : t.save}
          </button>
        </>
      }
    >
      <div className="execution-form">
        <label className="ui-field">
          <span>{t.status}</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as ExecutionStageStatus)}>
            {EXECUTION_STAGE_STATUSES.map((option) => <option key={option} value={option}>{executionStatusLabel(option, locale)}</option>)}
          </select>
        </label>
        <label className="ui-field">
          <span>{t.progress}: <strong className="mono" dir="ltr">{status === "COMPLETED" ? 100 : value}%</strong></span>
          <input type="range" min={0} max={100} step={5} value={status === "COMPLETED" ? 100 : value} disabled={status === "COMPLETED"} onChange={(event) => setProgress(event.target.value)} />
        </label>
        <label className="ui-field"><span>{t.actualStart}</span><input type="date" value={actualStart} onChange={(event) => setActualStart(event.target.value)} /></label>
        <label className="ui-field"><span>{t.actualEnd}</span><input type="date" value={actualEnd} onChange={(event) => setActualEnd(event.target.value)} /></label>
        <label className="ui-field execution-form__wide">
          <span>{t.notes}</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={3000} />
        </label>
        {error && <div className="form-error execution-form__wide">{error}</div>}
      </div>
    </Modal>
  );
}

function TeamDialog({ t, stage, busy, error, onClose, onSubmit }: { t: Copy; stage: ExecutionStageRecord; busy: boolean; error: string; onClose: () => void; onSubmit: (userIds: string[]) => void }) {
  const [people, setPeople] = useState<UserRecord[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set([...(stage.engineers ?? []), ...(stage.workers ?? [])].map((member) => member.id)));

  useEffect(() => {
    apiRequest<UserRecord[]>("/admin/users")
      .then((rows) => setPeople(rows.filter((row) => (row.role === "ENGINEER" || row.role === "WORKER") && row.isActive && !row.archivedAt)))
      .catch((requestError: Error) => setLoadError(requestError.message));
  }, []);

  const needle = query.trim().toLowerCase();
  const visible = (people ?? []).filter((person) => !needle || person.displayName.toLowerCase().includes(needle) || (person.specialty ?? "").toLowerCase().includes(needle));
  const groups = [
    { role: "ENGINEER" as const, label: t.engineers, rows: visible.filter((person) => person.role === "ENGINEER") },
    { role: "WORKER" as const, label: t.workers, rows: visible.filter((person) => person.role === "WORKER") }
  ];

  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <Modal
      open
      wide
      onClose={busy ? () => undefined : onClose}
      title={`${t.assignTeam} · ${stage.name}`}
      footer={
        <>
          <span className="execution-team__count">{t.selected(selected.size)}</span>
          <button type="button" className="ui-button ui-button--secondary" onClick={onClose} disabled={busy}>{t.cancel}</button>
          <button type="button" className="ui-button ui-button--primary" disabled={busy || people === null} onClick={() => onSubmit([...selected])}>{busy ? t.saving : t.save}</button>
        </>
      }
    >
      <p className="execution-team__hint">{t.teamHint}</p>
      <label className="ui-field">
        <span className="sr-only">{t.search}</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
      </label>
      {people === null && !loadError && <LoadingState label={t.loading} />}
      {loadError && <div className="form-error">{loadError}</div>}
      {people !== null && (
        <div className="execution-team">
          {groups.map((group) => (
            <fieldset key={group.role} className="execution-team__group">
              <legend>{group.label}</legend>
              {group.rows.length === 0 ? (
                <p className="execution-muted">{t.nobody}</p>
              ) : (
                group.rows.map((person) => (
                  <label className="check-field team-picker__option" key={person.id}>
                    <input type="checkbox" checked={selected.has(person.id)} onChange={(event) => toggle(person.id, event.target.checked)} />
                    <span><strong dir="auto">{person.displayName}</strong>{person.specialty ? <small dir="auto">{person.specialty}</small> : null}</span>
                  </label>
                ))
              )}
            </fieldset>
          ))}
        </div>
      )}
      {error && <div className="form-error">{error}</div>}
    </Modal>
  );
}

function StageDrawer({ t, locale, projectId, stageId, isClient, onClose }: { t: Copy; locale: "ar" | "en"; projectId: string; stageId: string; isClient: boolean; onClose: () => void }) {
  const [detail, setDetail] = useState<ExecutionStageDetail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    apiRequest<ExecutionStageDetail>(`/projects/${projectId}/execution/stages/${stageId}`)
      .then((result) => { if (alive) setDetail(result); })
      .catch((requestError: Error) => { if (alive) setError(requestError.message); });
    return () => { alive = false; };
  }, [projectId, stageId]);

  const stage = detail?.stage;
  return (
    <Drawer open onClose={onClose} title={stage?.name ?? t.loading} width={560} className="execution-drawer">
      {error && <div className="form-error">{error}</div>}
      {!detail && !error && <LoadingState label={t.loading} />}
      {stage && detail && (
        <div className="execution-detail">
          <div className="execution-detail__identity">
            {stage.code && <bdi className="mono" dir="ltr">{stage.code}</bdi>}
            <Badge tone={executionStatusTone(stage.status)}>{executionStatusLabel(stage.status, locale)}</Badge>
          </div>
          <div className="execution-stage__progress">
            <ProgressBar value={stage.progress} tone={stage.status === "BLOCKED" ? "navy" : stage.progress >= 70 ? "success" : "orange"} aria-label={t.progress} />
            <strong className="mono" dir="ltr">{stage.progress}%</strong>
          </div>
          <dl className="execution-detail__facts">
            <div><dt><CalendarRange size={14} aria-hidden="true" />{t.planned}</dt><dd><DateRange from={stage.plannedStartDate} to={stage.plannedEndDate} locale={locale} empty={t.notScheduled} /></dd></div>
            <div><dt><CalendarRange size={14} aria-hidden="true" />{t.actual}</dt><dd><DateRange from={stage.actualStartDate} to={stage.actualEndDate} locale={locale} empty={t.notStarted} /></dd></div>
            {!isClient && <div><dt><UserCog size={14} aria-hidden="true" />{t.engineer}</dt><dd><MemberList members={stage.engineers ?? []} empty={t.unassigned} /></dd></div>}
            {!isClient && <div><dt><HardHat size={14} aria-hidden="true" />{t.workersLabel}</dt><dd><MemberList members={stage.workers ?? []} empty={t.unassigned} /></dd></div>}
          </dl>
          {!isClient && (
            <section className="execution-detail__block">
              <h3>{t.notes}</h3>
              <p className={stage.description ? "" : "execution-muted"} dir="auto">{stage.description || t.noNotes}</p>
            </section>
          )}
          <section className="execution-detail__block">
            <h3>{t.siteActivity}</h3>
            {detail.siteUpdates.length === 0 ? (
              <p className="execution-muted">{t.noSiteActivity}</p>
            ) : (
              <ul className="execution-detail__list">
                {detail.siteUpdates.map((update) => (
                  <li key={update.id}>
                    <strong>{siteUpdateTypeLabel(update.type, locale)}</strong>
                    {update.note && <p dir="auto">{update.note}</p>}
                    <small><bdi>{update.author.displayName}</bdi> · <bdi>{formatAppDate(update.createdAt, locale, true)}</bdi>{update.mediaCount > 0 ? ` · ${update.mediaCount} ${t.files}` : ""}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {!isClient && (
            <section className="execution-detail__block">
              <h3>{t.history}</h3>
              {detail.history.length === 0 ? (
                <p className="execution-muted">{t.noHistory}</p>
              ) : (
                <ul className="execution-detail__list">
                  {detail.history.map((entry) => (
                    <li key={entry.id}>
                      <strong>{activityLabel(entry.action, locale)}</strong>
                      {historyDetail(entry.changes, locale) && <p>{historyDetail(entry.changes, locale)}</p>}
                      <small><bdi>{entry.actorName ?? "—"}</bdi> · <bdi>{formatAppDate(entry.createdAt, locale, true)}</bdi></small>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}

function historyDetail(changes: ExecutionStageDetail["history"][number]["changes"], locale: "ar" | "en") {
  const parts: string[] = [];
  const isStatus = (value: unknown): value is ExecutionStageStatus => typeof value === "string" && (EXECUTION_STAGE_STATUSES as string[]).includes(value);
  if (isStatus(changes.status)) {
    parts.push(`${isStatus(changes.fromStatus) ? `${executionStatusLabel(changes.fromStatus, locale)} ← ` : ""}${executionStatusLabel(changes.status, locale)}`);
  }
  if (typeof changes.progress === "number") parts.push(`${changes.fromProgress ?? 0}% → ${changes.progress}%`);
  if (changes.added) parts.push(locale === "ar" ? `+${changes.added} عضو` : `+${changes.added} member(s)`);
  if (changes.removed) parts.push(locale === "ar" ? `−${changes.removed} عضو` : `−${changes.removed} member(s)`);
  return parts.join(" · ");
}

function copy(ar: boolean) {
  return ar
    ? {
        kicker: "مرحلة التنفيذ ٠٤",
        title: "حزم أعمال التنفيذ",
        myStages: "أعمالي في التنفيذ",
        lead: "مراحل التنفيذ المخصصة لهذا المشروع مع فرقها ونسب تقدمها.",
        notInExecution: (phase: string) => `المشروع حالياً في مرحلة «${phase}». يمكن التخطيط لحزم التنفيذ مسبقاً.`,
        addStage: "إضافة مرحلة",
        editStage: "تعديل المرحلة",
        executionProgress: "تقدم التنفيذ",
        equalWeight: "متوسط متساوي الوزن لكل الحزم",
        projectProgressNote: (value: number) => `مؤشر تقدم التنفيذ للمتابعة فقط ولا يغيّر نسبة إنجاز المشروع الكلية (${value}%).`,
        workPackages: "حزم الأعمال",
        engineers: "المهندسون",
        workers: "العمال",
        blocked: "متوقفة",
        completed: "مكتملة",
        empty: "لا توجد مراحل تنفيذ بعد",
        emptyHint: "ستظهر هنا مراحل التنفيذ عند إضافتها.",
        emptyAdminHint: "أضف مراحل مثل أعمال الكهرباء أو السباكة أو أي مرحلة مخصصة.",
        noAssigned: "لا توجد أعمال مخصصة لك",
        noAssignedHint: "ستظهر هنا مراحل التنفيذ التي يعيّنك عليها المدير.",
        engineer: "المهندس",
        workersLabel: "العمال",
        planned: "المخطط",
        actual: "الفعلي",
        notScheduled: "غير مجدول",
        notStarted: "لم يبدأ",
        unassigned: "غير معيّن",
        open: "فتح",
        edit: "تعديل",
        assignTeam: "تعيين الفريق",
        more: "إجراءات",
        updateProgress: "تحديث التقدم",
        moveUp: "نقل لأعلى",
        moveDown: "نقل لأسفل",
        remove: "حذف المرحلة",
        removeTitle: "حذف مرحلة التنفيذ",
        removeLead: (name: string) => `سيتم حذف «${name}» وتعيينات فريقها. تبقى تحديثات الموقع المرتبطة بها في سجل المشروع.`,
        cancel: "إلغاء",
        save: "حفظ",
        saving: "جاري الحفظ...",
        stageName: "اسم المرحلة",
        stageNameHint: "مثال: أعمال الكهرباء، تركيب الواجهات",
        code: "الرمز",
        status: "الحالة",
        progress: "نسبة التقدم",
        plannedStart: "بداية مخططة",
        plannedEnd: "نهاية مخططة",
        actualStart: "بداية فعلية",
        actualEnd: "نهاية فعلية",
        notes: "ملاحظات",
        noNotes: "لا توجد ملاحظات.",
        teamHint: "اختر المهندسين والعمال لهذه المرحلة. من ليس في فريق المشروع يُضاف إليه تلقائياً.",
        search: "بحث بالاسم أو التخصص",
        nobody: "لا يوجد",
        selected: (count: number) => `${count} محدد`,
        siteActivity: "نشاط الموقع المرتبط",
        noSiteActivity: "لا توجد تحديثات موقع مرتبطة بهذه المرحلة بعد.",
        history: "سجل المرحلة",
        noHistory: "لا يوجد سجل بعد.",
        files: "مرفقات",
        loading: "جاري التحميل...",
        loadFailed: "تعذر تحميل بيانات التنفيذ",
        retry: "إعادة المحاولة"
      }
    : {
        kicker: "Execution phase 04",
        title: "Execution work packages",
        myStages: "My execution work",
        lead: "This project's custom execution stages with their teams and progress.",
        notInExecution: (phase: string) => `The project is currently in “${phase}”. Execution packages can be planned ahead.`,
        addStage: "Add stage",
        editStage: "Edit stage",
        executionProgress: "Execution progress",
        equalWeight: "Equal-weight average of all packages",
        projectProgressNote: (value: number) => `Execution progress is informative and does not change the project's overall progress (${value}%).`,
        workPackages: "Work packages",
        engineers: "Engineers",
        workers: "Workers",
        blocked: "Blocked",
        completed: "Completed",
        empty: "No execution stages yet",
        emptyHint: "Execution stages will appear here once added.",
        emptyAdminHint: "Add stages such as Electrical Works, Plumbing or any custom package.",
        noAssigned: "No work assigned to you",
        noAssignedHint: "Execution stages the Admin assigns you to appear here.",
        engineer: "Engineer",
        workersLabel: "Workers",
        planned: "Planned",
        actual: "Actual",
        notScheduled: "Not scheduled",
        notStarted: "Not started",
        unassigned: "Unassigned",
        open: "Open",
        edit: "Edit",
        assignTeam: "Assign team",
        more: "Actions",
        updateProgress: "Update progress",
        moveUp: "Move up",
        moveDown: "Move down",
        remove: "Remove stage",
        removeTitle: "Remove execution stage",
        removeLead: (name: string) => `“${name}” and its team assignments will be removed. Site updates linked to it stay in the project history.`,
        cancel: "Cancel",
        save: "Save",
        saving: "Saving...",
        stageName: "Stage name",
        stageNameHint: "e.g. Electrical Works, Facade Installation",
        code: "Code",
        status: "Status",
        progress: "Progress",
        plannedStart: "Planned start",
        plannedEnd: "Planned end",
        actualStart: "Actual start",
        actualEnd: "Actual end",
        notes: "Notes",
        noNotes: "No notes.",
        teamHint: "Choose the engineers and workers for this stage. Anyone not yet on the project team joins it.",
        search: "Search by name or specialty",
        nobody: "None",
        selected: (count: number) => `${count} selected`,
        siteActivity: "Related site activity",
        noSiteActivity: "No site updates are linked to this stage yet.",
        history: "Stage history",
        noHistory: "No history yet.",
        files: "attachments",
        loading: "Loading...",
        loadFailed: "Execution data could not be loaded",
        retry: "Retry"
      };
}
