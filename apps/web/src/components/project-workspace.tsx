"use client";

import Link from "next/link";
import { Badge, ProgressBar } from "@elhabak/ui";
import { Activity, ChevronDown, ClipboardList, FileStack, MapPin, MessageSquare, Pencil, UserRound, UsersRound, Wallet } from "lucide-react";
import {
  categoryLabel,
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
        progress: "التقدم الكلي",
        location: "الموقع",
        client: "العميل",
        engineer: "المهندس المسؤول",
        overview: "نظرة عامة",
        design: "التصميمات",
        site: "نشاط الموقع",
        finance: "الشؤون المالية",
        documents: "المستندات",
        chat: "الدردشة",
        status: "الحالة",
        unset: "غير محدد",
        moreDetails: "تفاصيل إضافية"
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
        edit: "Edit Project",
        status: "Status",
        unset: "Not set",
        moreDetails: "More details"
      };

  function href(path: string) {
    return ar ? path : `${path}?lang=en`;
  }

  const base = `/app/projects/${project.id}`;
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
      <header className="project-command-header">
        <div className="project-command-header__topbar">
          <div className="project-command-header__ref-group">
            <span className="project-command-header__sys-tag">ELHABAK // WS-01</span>
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
            <h1>{project.name}</h1>
            <div className="project-command-header__phase-chip">
              <ClipboardList size={14} />
              <small>{labels.phase}:</small>
              <strong>{phaseLabel(project.phase, locale)}</strong>
            </div>
          </div>
          <div className="project-command-header__progress">
            <div className="project-command-header__progress-meta">
              <span>{labels.progress}</span>
              <strong><bdi>{project.progress}%</bdi></strong>
            </div>
            <ProgressBar value={project.progress} />
          </div>
        </div>

        {/* A <details> element: collapsed by default so Client/Engineer/Location/Status (already
            shown as a badge above) don't force the whole desktop command header onto a 390px
            screen; the 701px+ CSS tier forces it open and hides the toggle so desktop is unaffected. */}
        <details className="project-command-header__details">
          <summary className="project-command-header__details-toggle">
            {labels.moreDetails}
            <ChevronDown size={14} aria-hidden="true" />
          </summary>
          <div className="project-command-header__facts">
            <span><UsersRound size={14} /><small>{labels.client}</small><strong>{project.client?.user.displayName ?? labels.unset}</strong></span>
            <span><UserRound size={14} /><small>{labels.engineer}</small><strong>{project.engineer?.displayName ?? labels.unset}</strong></span>
            <span><MapPin size={14} /><small>{labels.location}</small><strong>{project.location ?? labels.unset}</strong></span>
            <span><Activity size={14} /><small>{labels.status}</small><strong>{statusLabel(project.status, locale)}</strong></span>
          </div>
        </details>
      </header>

      <div className="project-workspace-bar">
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
    </div>
  );
}
