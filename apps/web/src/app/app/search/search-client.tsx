"use client";

import {
  BriefcaseBusiness,
  FileSearch,
  FileText,
  Palette,
  Search,
  UserRound,
  Users
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, LoadingState, PageHeader } from "@elhabak/ui";
import { apiRequest, type SearchResult } from "../../../lib/api";

const icons = {
  PROJECT: BriefcaseBusiness,
  CLIENT: UserRound,
  USER: Users,
  DESIGN: Palette,
  DOCUMENT: FileText
};

export function SearchClient() {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const initial = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const labels = useMemo(
    () =>
      ar
        ? {
            title: "البحث الشامل",
            lead: "ابحث في السجلات التي يسمح حسابك بعرضها فقط.",
            placeholder: "اكتب اسم مشروع أو عميل أو مستخدم أو تصميم أو مستند",
            start: "أدخل حرفين على الأقل لبدء البحث.",
            empty: "لا توجد نتائج مطابقة",
            hint: "جرّب عبارة بحث مختلفة.",
            loading: "جاري البحث...",
            failed: "تعذر تنفيذ البحث. حاول مرة أخرى.",
            open: "فتح النتيجة"
          }
        : {
            title: "Global Search",
            lead: "Search only the records your account is authorized to view.",
            placeholder: "Search projects, clients, users, designs, or documents",
            start: "Enter at least two characters to search.",
            empty: "No matching results",
            hint: "Try a different search term.",
            loading: "Searching...",
            failed: "Search could not be completed. Try again.",
            open: "Open result"
          },
    [ar]
  );

  useEffect(() => {
    let active = true;
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      apiRequest<{ results: SearchResult[] }>(`/search?q=${encodeURIComponent(query.trim())}`)
        .then((response) => {
          if (active) {
            setResults(response.results);
            setError("");
          }
        })
        .catch(() => {
          if (active) setError(labels.failed);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [labels.failed, query]);

  const typeLabel = (type: SearchResult["type"]) =>
    ({
      PROJECT: ar ? "مشروع" : "Project",
      CLIENT: ar ? "عميل" : "Client",
      USER: ar ? "مستخدم" : "User",
      DESIGN: ar ? "تصميم" : "Design",
      DOCUMENT: ar ? "مستند" : "Document"
    })[type];
  const href = (path: string) => (ar ? path : `${path}${path.includes("?") ? "&" : "?"}lang=en`);

  return (
    <section className="app-page search-page">
      <PageHeader title={labels.title} description={labels.lead} />
      <label className="global-search-field search-page-field">
        <Search size={19} aria-hidden="true" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={labels.placeholder}
          aria-label={labels.placeholder}
        />
      </label>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {loading && <LoadingState label={labels.loading} />}
      {!loading && query.trim().length < 2 && (
        <EmptyState icon={<FileSearch size={20} />} title={labels.start} />
      )}
      {!loading && query.trim().length >= 2 && !results.length && (
        <EmptyState
          icon={<FileSearch size={20} />}
          title={labels.empty}
          description={labels.hint}
        />
      )}
      {!loading && results.length > 0 && (
        <div className="search-results">
          {results.map((result) => {
            const Icon = icons[result.type];
            return (
              <Link
                href={href(result.href)}
                className="search-result"
                key={`${result.type}-${result.id}`}
                aria-label={`${labels.open}: ${result.title}`}
              >
                <span className="search-result__icon">
                  <Icon size={19} />
                </span>
                <span className="search-result__body">
                  <span>
                    <Badge tone="neutral">{typeLabel(result.type)}</Badge>
                    <strong>{result.title}</strong>
                  </span>
                  {result.context && <bdi>{result.context}</bdi>}
                </span>
                <span aria-hidden="true">←</span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
