"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, PageHeader } from "@elhabak/ui";
import { Wallet } from "lucide-react";
import {
  apiRequest,
  phaseLabel,
  statusLabel,
  statusTone,
  type FinanceProjectListItem
} from "../../../lib/api";

export function FinanceProjectsClient() {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const [projects, setProjects] = useState<FinanceProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const labels = useMemo(
    () =>
      ar
        ? {
            title: "الشؤون المالية للمشاريع",
            lead: "اختر مشروعاً لعرض المقايسة وجدول الكميات والمصروفات والدفعات.",
            empty: "لا توجد مشاريع مسجلة",
            emptyHint: "سيظهر هنا أي مشروع بعد إنشائه.",
            client: "العميل",
            loading: "جاري تحميل المشاريع..."
          }
        : {
            title: "Project Finance",
            lead: "Choose a project to review its estimate, BOQ, expenses, and payments.",
            empty: "No projects registered",
            emptyHint: "Any created project will appear here.",
            client: "Client",
            loading: "Loading projects..."
          },
    [ar]
  );

  useEffect(() => {
    let alive = true;
    apiRequest<FinanceProjectListItem[]>("/finance/projects")
      .then((result) => {
        if (alive) setProjects(result);
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
  }, []);

  function href(path: string) {
    return ar ? path : `${path}?lang=en`;
  }

  return (
    <section className="app-page">
      <PageHeader title={labels.title} description={labels.lead} />
      {error && <div className="form-error">{error}</div>}
      {loading && <LoadingState label={labels.loading} />}
      {!loading && projects.length === 0 && (
        <EmptyState icon={<Wallet size={20} />} title={labels.empty} description={labels.emptyHint} />
      )}
      {!loading && projects.length > 0 && (
        <div className="data-table">
          {projects.map((project) => (
            <Link className="mini-project-row" href={href(`/app/projects/${project.id}/finance`)} key={project.id}>
              <div className="mini-project-row__id">
                <strong>{project.name}</strong>
                <bdi className="mono">{project.code}</bdi>
              </div>
              <div className="mini-project-row__phase">{phaseLabel(project.phase, locale)}</div>
              <div className="mini-project-row__progress">
                <div className="progress-track">
                  <span style={{ width: `${project.progress}%` }} />
                </div>
                <strong>
                  <bdi>{project.progress}%</bdi>
                </strong>
              </div>
              <Badge tone={statusTone(project.status)}>{statusLabel(project.status, locale)}</Badge>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
