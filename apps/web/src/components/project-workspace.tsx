"use client";

import Link from "next/link";
import { Badge, ProgressBar } from "@elhabak/ui";
import { Activity, ArrowRight, Building2, CalendarDays, CalendarRange, ClipboardList, FileStack, MapPin, MessageSquare, Pencil, UserRound, UsersRound, Wallet } from "lucide-react";
import {
  categoryLabel,
  formatAppDate,
  LIFECYCLE_PHASES,
  phaseLabel,
  statusLabel,
  statusTone,
  type ProjectCategory,
  type ProjectPhase,
  type ProjectStatus,
  type UserRecord,
  type UserRole
} from "../lib/api";

type WorkspaceSection = "overview" | "design" | "site" | "finance" | "documents" | "chat";

/** The subset of a project every workspace header needs - satisfied by the full ProjectRecord and by the lightweight finance project-context response alike. */
export type ProjectHeaderRecord = {
  id: string;
  code: string | null;
  name: string;
  category: ProjectCategory;
  phase: ProjectPhase;
  status: ProjectStatus;
  progress: number;
  location: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  workers?: UserRecord[];
  client: { id: string; user: UserRecord } | null;
  engineer: UserRecord | null;
};

type ProjectWorkspaceProps = {
  project: ProjectHeaderRecord;
  locale: "ar" | "en";
  role: UserRole;
  active: WorkspaceSection;
};

export function ProjectWorkspace({ project, locale, role, active }: ProjectWorkspaceProps) {
  const ar = locale === "ar";
  const labels = ar
    ? {
      phase: "المرحلة الحالية",
      progress: "الإنجاز الكلي",
      location: "الموقع",
      client: "العميل",
      engineer: "المهندس المسؤول",
      overview: "نظرة عامة",
      design: "التصميمات",
      site: "نشاط الموقع",
      finance: "الشؤون المالية",
      documents: "المستندات",
      chat: "الدردشة",
      edit: "تعديل المشروع",
      status: "الحالة",
      schedule: "الجدول الزمني",
      team: "الفريق الميداني",
      unset: "غير محدد",
      modules: "وحدات المشروع",
      control: "مساحة عمل المشروع",
      project: "مشروع",
      start: "البدء",
      target: "التسليم المستهدف",
      back: "كل المشاريع",
      fieldActions: "إجراءات ميدانية سريعة"
    }
    : {
      phase: "Current phase",
      progress: "Overall progress",
      location: "Location",
      client: "Client",
      engineer: "Responsible engineer",
      overview: "Overview",
      design: "Design Hub",
      site: "Site Activity",
      finance: "Finance",
      documents: "Documents",
      chat: "Chat",
      edit: "Edit project",
      status: "Status",
      schedule: "Schedule",
      team: "Field team",
      unset: "Not set",
      modules: "Project Modules",
      control: "Project Workspace",
      project: "Project",
      start: "Start",
      target: "Target delivery",
      back: "All projects",
      fieldActions: "Quick field actions"
    };

  function href(path: string) {
    return ar ? path : `${path}${path.includes("?") ? "&" : "?"}lang=en`;
  }

  function formatDate(value: string | null | undefined) {
    return value ? formatAppDate(value, locale) : labels.unset;
  }

  const base = `/app/projects/${project.id}`;
  const currentPhaseIndex = LIFECYCLE_PHASES.indexOf(project.phase);
  const team = project.workers?.length ? project.workers.map((worker) => worker.displayName).join(ar ? "، " : ", ") : labels.unset;
  const sections: Array<{ id: WorkspaceSection; label: string; href: string; icon: typeof ClipboardList }> = [
    ...(role === "ACCOUNTANT" ? [] : [{ id: "overview" as const, label: labels.overview, href: base, icon: ClipboardList }]),
    ...(role === "ADMIN" || role === "ENGINEER" || role === "CLIENT"
      ? [{ id: "design" as const, label: labels.design, href: `${base}/design`, icon: Pencil }]
      : []),
    ...(role === "ACCOUNTANT" ? [] : [{ id: "site" as const, label: labels.site, href: `${base}/site-activity`, icon: Activity }]),
    ...(role === "ADMIN" || role === "ACCOUNTANT"
      ? [{ id: "finance" as const, label: labels.finance, href: `${base}/finance`, icon: Wallet }]
      : []),
    ...(role === "ADMIN" || role === "ENGINEER" || role === "CLIENT"
      ? [{ id: "documents" as const, label: labels.documents, href: `${base}/documents`, icon: FileStack }]
      : []),
    ...(role === "ADMIN" || role === "ENGINEER" || role === "WORKER" || role === "CLIENT"
      ? [{ id: "chat" as const, label: labels.chat, href: `${base}/chat`, icon: MessageSquare }]
      : [])
  ];

  const nav = (
    <nav
      className="project-workspace-nav project-control-nav"
      aria-label={ar ? "أقسام مساحة العمل" : "Workspace sections"}
    >
      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <Link
            className={active === section.id ? "active" : ""}
            href={href(section.href)}
            key={section.id}
            aria-current={active === section.id ? "page" : undefined}
          >
            <Icon size={16} /> {section.label}
          </Link>
        );
      })}
    </nav>
  );

  // Submodule pages get the compact sticky context bar - full operational context
  // (identity, phase, progress, module nav) in one dense strip instead of the tall header.
  if (active !== "overview") {
    return (
      <div className="project-context-bar project-control-bar">
        <div className="project-context-bar__identity">
          <Link
            className="project-context-bar__back"
            href={href(role === "ADMIN" ? "/app/admin/projects" : "/app/projects")}
            aria-label={labels.back}
            title={labels.back}
          >
            <ArrowRight size={16} />
          </Link>
          <div className="project-context-bar__name">
            <strong dir="auto">{project.name}</strong>
            <small className="mono" dir="ltr">{project.code ?? labels.project}</small>
          </div>
        </div>
        <div className="project-context-bar__phase">
          <CalendarRange size={15} aria-hidden="true" />
          <span>
            <small>
              <bdi className="mono">{String(currentPhaseIndex + 1).padStart(2, "0")}/06</bdi> · {labels.phase}
            </small>
            <strong>{phaseLabel(project.phase, locale)}</strong>
          </span>
          <Badge tone={statusTone(project.status)}>{statusLabel(project.status, locale)}</Badge>
        </div>
        <div className="project-context-bar__progress">
          <ProgressBar value={project.progress} tone={project.progress >= 70 ? "success" : "orange"} />
          <strong><bdi>{project.progress}%</bdi></strong>
        </div>
        {nav}
        {role === "ADMIN" && (
          <Link
            className="ui-icon-button"
            href={href(`/app/admin/projects/${project.id}`)}
            aria-label={labels.edit}
            title={labels.edit}
          >
            <Pencil size={15} />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="project-workspace-container">
      <header className="project-command-header project-command-header--v5 project-control-header">
        <div className="project-control-header__top">
          <div className="project-control-header__identity">
            <div className="project-control-header__meta">
              <Link href={href(role === "ADMIN" ? "/app/admin/projects" : "/app/projects")} className="project-control-header__back" aria-label={labels.back}><ArrowRight size={16} /></Link>
              <bdi className="mono" dir="ltr">{project.code ?? "—"}</bdi>
              <span>{categoryLabel(project.category, locale)}</span>
            </div>
            <h1 dir="auto">{project.name}</h1>
            <Badge tone={statusTone(project.status)}>{statusLabel(project.status, locale)}</Badge>
          </div>
          <div className="project-control-header__position">
            <div className="project-control-header__phase"><span className="mono" dir="ltr">{String(currentPhaseIndex + 1).padStart(2, "0")}/06</span><div><small>{labels.phase}</small><strong>{phaseLabel(project.phase, locale)}</strong></div></div>
            <div className="project-control-header__progress"><div><small>{labels.progress}</small><strong dir="ltr">{project.progress}%</strong></div><ProgressBar value={project.progress} tone={project.progress >= 70 ? "success" : "orange"} /></div>
          </div>
        </div>
        <dl className="project-control-header__facts">
          <div><UsersRound size={14} aria-hidden="true" /><dt>{labels.client}</dt><dd dir="auto">{project.client?.user.displayName ?? labels.unset}</dd></div>
          <div><UserRound size={14} aria-hidden="true" /><dt>{labels.engineer}</dt><dd dir="auto">{project.engineer?.displayName ?? labels.unset}</dd></div>
          <div><MapPin size={14} aria-hidden="true" /><dt>{labels.location}</dt><dd dir="auto">{project.location ?? labels.unset}</dd></div>
          <div><CalendarDays size={14} aria-hidden="true" /><dt>{labels.target}</dt><dd>{formatDate(project.targetDate)}</dd></div>
          {project.workers?.length ? <div><Building2 size={14} aria-hidden="true" /><dt>{labels.team}</dt><dd dir="auto">{team}</dd></div> : null}
        </dl>
        <div className="project-control-header__navigation">{nav}{role === "ADMIN" && <Link className="ui-icon-button" href={href(`/app/admin/projects/${project.id}`)} aria-label={labels.edit}><Pencil size={15} /></Link>}</div>
      </header>
      {(role === "ENGINEER" || role === "WORKER") && (
        <div className="project-mobile-actions">
          <span className="project-mobile-actions__label">{labels.fieldActions}</span>
          <div>
            {sections.filter((section) => section.id === "site" || section.id === "design" || section.id === "documents" || section.id === "chat").map((section) => {
              const Icon = section.icon;
              return <Link href={href(section.href)} key={section.id}><Icon size={15} /> {section.label}</Link>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
