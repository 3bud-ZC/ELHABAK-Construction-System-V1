"use client";

import Link from "next/link";
import { Badge, ProgressBar } from "@elhabak/ui";
import { Activity, ClipboardList, MapPin, Pencil, UserRound, UsersRound } from "lucide-react";
import {
  categoryLabel,
  phaseLabel,
  statusLabel,
  statusTone,
  type ProjectRecord,
  type UserRole
} from "../lib/api";

type WorkspaceSection = "overview" | "design" | "site";

type ProjectWorkspaceProps = {
  project: ProjectRecord;
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
        edit: "تعديل المشروع",
        unset: "غير محدد"
      }
    : {
        phase: "Current phase",
        progress: "Overall progress",
        location: "Location",
        client: "Client",
        engineer: "Responsible engineer",
        overview: "Overview",
        design: "Design",
        site: "Site Activity",
        edit: "Edit project",
        unset: "Not set"
      };

  function href(path: string) {
    return ar ? path : `${path}?lang=en`;
  }

  const base = `/app/projects/${project.id}`;
  const sections: Array<{ id: WorkspaceSection; label: string; href: string; icon: typeof ClipboardList }> = [
    { id: "overview", label: labels.overview, href: base, icon: ClipboardList },
    ...(role === "ADMIN" || role === "ENGINEER" || role === "CLIENT"
      ? [{ id: "design" as const, label: labels.design, href: `${base}/design`, icon: Pencil }]
      : []),
    { id: "site", label: labels.site, href: `${base}/site-activity`, icon: Activity }
  ];

  return (
    <>
      <header className="project-command-header">
        <div className="project-command-header__main">
          <div className="project-command-header__identity">
            <bdi className="project-command-header__code mono">{project.code ?? "—"}</bdi>
            <h1>{project.name}</h1>
            <div className="project-command-header__badges">
              <Badge tone="orange">{categoryLabel(project.category, locale)}</Badge>
              <Badge tone={statusTone(project.status)}>{statusLabel(project.status, locale)}</Badge>
            </div>
          </div>
          <div className="project-command-header__progress">
            <span>{labels.progress}</span>
            <strong><bdi>{project.progress}%</bdi></strong>
            <ProgressBar value={project.progress} />
          </div>
        </div>
        <div className="project-command-header__facts">
          <span><ClipboardList size={15} /><small>{labels.phase}</small><strong>{phaseLabel(project.phase, locale)}</strong></span>
          <span><MapPin size={15} /><small>{labels.location}</small><strong>{project.location ?? labels.unset}</strong></span>
          <span><UsersRound size={15} /><small>{labels.client}</small><strong>{project.client?.user.displayName ?? labels.unset}</strong></span>
          <span><UserRound size={15} /><small>{labels.engineer}</small><strong>{project.engineer?.displayName ?? labels.unset}</strong></span>
        </div>
      </header>

      <div className="project-workspace-bar">
        <nav className="project-workspace-nav" aria-label={ar ? "أقسام المشروع" : "Project sections"}>
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Link className={active === section.id ? "active" : ""} href={href(section.href)} key={section.id} aria-current={active === section.id ? "page" : undefined}>
                <Icon size={16} /> {section.label}
              </Link>
            );
          })}
        </nav>
        {role === "ADMIN" && (
          <Link className="ui-button ui-button--secondary ui-button--sm" href={href(`/app/admin/projects/${project.id}`)}>
            {labels.edit}
          </Link>
        )}
      </div>
    </>
  );
}
