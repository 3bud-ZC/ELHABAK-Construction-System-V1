"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AdaptiveDisclosure, Badge, ProgressBar } from "@elhabak/ui";
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
      details: "تفاصيل المشروع"
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
      details: "Project details"
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

  const railRef = useRef<HTMLElement>(null);
  useEffect(() => {
    // Keep the active module visible inside the horizontally-scrolling rail.
    const current = railRef.current?.querySelector<HTMLElement>("[aria-current='page']");
    current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [active]);

  const isOverview = active === "overview";
  const TitleTag = isOverview ? "h1" : "p";
  const detailsSummary = [project.client?.user.displayName, project.location].filter(Boolean).join(" · ");

  return (
    <header className={`project-context${isOverview ? " project-context--overview" : " project-context--module"}`}>
      <div className="project-context__top">
        <Link
          className="project-context__back"
          href={href(role === "ADMIN" ? "/app/admin/projects" : "/app/projects")}
          aria-label={labels.back}
          title={labels.back}
        >
          <ArrowRight size={18} />
        </Link>
        <div className="project-context__identity">
          <span className="project-context__meta">
            <bdi className="mono" dir="ltr">{project.code ?? labels.project}</bdi>
            <span aria-hidden="true">·</span>
            <span>{categoryLabel(project.category, locale)}</span>
          </span>
          <TitleTag className="project-context__name" dir="auto">{project.name}</TitleTag>
        </div>
        {role === "ADMIN" && (
          <Link className="project-context__edit ui-button ui-button--secondary ui-button--sm" href={href(`/app/admin/projects/${project.id}`)} aria-label={labels.edit} title={labels.edit}>
            <Pencil size={16} /> <span>{labels.edit}</span>
          </Link>
        )}
      </div>

      <div className="project-context__state">
        <span className="project-context__phase">
          <CalendarRange size={16} aria-hidden="true" />
          <bdi className="mono" dir="ltr">{String(currentPhaseIndex + 1).padStart(2, "0")}/06</bdi>
          <span className="project-context__phase-label"><small>{labels.phase}</small><strong>{phaseLabel(project.phase, locale)}</strong></span>
        </span>
        <Badge tone={statusTone(project.status)}>{statusLabel(project.status, locale)}</Badge>
        <span className="project-context__progress">
          <small>{labels.progress}</small>
          <ProgressBar value={project.progress} tone={project.progress >= 70 ? "success" : "orange"} aria-label={labels.progress} />
          <strong dir="ltr">{project.progress}%</strong>
        </span>
      </div>

      <AdaptiveDisclosure className="project-context__details" label={labels.details} summary={detailsSummary || undefined}>
        <dl className="project-context__facts">
          <div><UsersRound size={16} aria-hidden="true" /><dt>{labels.client}</dt><dd dir="auto">{project.client?.user.displayName ?? labels.unset}</dd></div>
          <div><UserRound size={16} aria-hidden="true" /><dt>{labels.engineer}</dt><dd dir="auto">{project.engineer?.displayName ?? labels.unset}</dd></div>
          <div><MapPin size={16} aria-hidden="true" /><dt>{labels.location}</dt><dd dir="auto">{project.location ?? labels.unset}</dd></div>
          <div><CalendarDays size={16} aria-hidden="true" /><dt>{labels.target}</dt><dd><bdi>{formatDate(project.targetDate)}</bdi></dd></div>
          {project.workers?.length ? <div><Building2 size={16} aria-hidden="true" /><dt>{labels.team}</dt><dd dir="auto">{team}</dd></div> : null}
        </dl>
      </AdaptiveDisclosure>

      <nav ref={railRef} className="project-context__nav" aria-label={labels.modules}>
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              className={active === section.id ? "active" : ""}
              href={href(section.href)}
              key={section.id}
              aria-current={active === section.id ? "page" : undefined}
            >
              <Icon size={18} aria-hidden="true" /> <span>{section.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
