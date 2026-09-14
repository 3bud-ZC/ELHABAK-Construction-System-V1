"use client";

import Link from "next/link";
import { Badge, ProgressBar } from "@elhabak/ui";
import { Activity, Building2, CalendarDays, CalendarRange, ClipboardList, FileStack, MapPin, MessageSquare, Pencil, UserRound, UsersRound, Wallet } from "lucide-react";
import {
  categoryLabel,
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
      control: "مركز التحكم بالمشروع",
      project: "مشروع",
      start: "البدء",
      target: "التسليم المستهدف"
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
      modules: "Project modules",
      control: "Project control center",
      project: "PROJECT",
      start: "Start",
      target: "Target delivery"
    };

  function href(path: string) {
    return ar ? path : `${path}${path.includes("?") ? "&" : "?"}lang=en`;
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return labels.unset;
    return new Intl.DateTimeFormat(ar ? "ar-EG-u-nu-latn" : "en-US", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
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
    ...(role === "ADMIN" || role === "ACCOUNTANT" || role === "ENGINEER" || role === "CLIENT"
      ? [{ id: "finance" as const, label: labels.finance, href: `${base}/finance`, icon: Wallet }]
      : []),
    ...(role === "ADMIN" || role === "ENGINEER" || role === "CLIENT"
      ? [{ id: "documents" as const, label: labels.documents, href: `${base}/documents`, icon: FileStack }]
      : []),
    ...(role === "ADMIN" || role === "ENGINEER" || role === "WORKER" || role === "CLIENT"
      ? [{ id: "chat" as const, label: labels.chat, href: `${base}/chat`, icon: MessageSquare }]
      : [])
  ];

  return (
    <div className="project-workspace-container">
      <header className="project-command-header project-command-header--v5">
        <div className="project-command-header__topbar">
          <div className="project-command-header__ref-group">
            <span className="project-command-header__sys-tag">ELHABAK // {labels.control}</span>
            <bdi className="project-command-header__code mono">{project.code ?? "—"}</bdi>
          </div>
          <div className="project-command-header__badges">
            <Badge tone="orange">{categoryLabel(project.category, locale)}</Badge>
            <Badge tone={statusTone(project.status)}>{statusLabel(project.status, locale)}</Badge>
            {role === "ADMIN" && (
              <Link className="project-command-header__edit-btn" href={href(`/app/admin/projects/${project.id}`)}>
                <Pencil size={13} /> {labels.edit}
              </Link>
            )}
          </div>
        </div>

        <div className="project-command-header__main">
          <div className="project-command-header__identity">
            <span className="project-command-header__label">{labels.project} / {labels.control}</span>
            <h1>{project.name}</h1>
            <div className="project-command-header__phase-chip">
              <span className="project-command-header__phase-index mono"><bdi>{String(currentPhaseIndex + 1).padStart(2, "0")}</bdi>/06</span>
              <CalendarRange size={14} />
              <div><small>{labels.phase}</small><strong>{phaseLabel(project.phase, locale)}</strong></div>
            </div>
          </div>
          <div className="project-command-header__progress">
            <div className="project-command-header__progress-meta">
              <span>{labels.progress}</span>
              <strong><bdi>{project.progress}%</bdi></strong>
            </div>
            <ProgressBar value={project.progress} tone={project.progress >= 70 ? "success" : "orange"} />
          </div>
        </div>
      </header>

      <div className="project-workspace-bar">
        <span className="project-workspace-bar__label">{labels.modules}</span>
        <nav className="project-workspace-nav" aria-label={ar ? "أقسام مساحة العمل" : "Workspace sections"}>
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Link className={active === section.id ? "active" : ""} href={href(section.href)} key={section.id} aria-current={active === section.id ? "page" : undefined}>
                <Icon size={16} /> {section.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="project-command-facts">
        <span><UsersRound size={15} /><small>{labels.client}</small><strong><bdi>{project.client?.user.displayName ?? labels.unset}</bdi></strong></span>
        <span><UserRound size={15} /><small>{labels.engineer}</small><strong><bdi>{project.engineer?.displayName ?? labels.unset}</bdi></strong></span>
        <span><MapPin size={15} /><small>{labels.location}</small><strong><bdi>{project.location ?? labels.unset}</bdi></strong></span>
        <span><CalendarDays size={15} /><small>{labels.schedule}</small><strong><bdi>{formatDate(project.startDate)} — {formatDate(project.targetDate)}</bdi></strong></span>
        <span><Building2 size={15} /><small>{labels.team}</small><strong><bdi>{team}</bdi></strong></span>
      </div>
    </div>
  );
}
