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
import { EmptyState, LoadingState } from "@elhabak/ui";
import { apiRequest, type SearchResult } from "../../../lib/api";

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
            open: "فتح النتيجة",
          scopes: "نطاق البحث",
          resultsFor: "نتيجة"
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
            open: "Open result",
            scopes: "Search coverage",
            resultsFor: "results"
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

  const scopes: { type: SearchResult["type"]; icon: typeof BriefcaseBusiness }[] = [
    { type: "PROJECT", icon: BriefcaseBusiness },
    { type: "CLIENT", icon: UserRound },
    { type: "USER", icon: Users },
    { type: "DESIGN", icon: Palette },
    { type: "DOCUMENT", icon: FileText }
  ];

  const grouped = scopes
    .map((scope) => ({ ...scope, items: results.filter((result) => result.type === scope.type) }))
    .filter((group) => group.items.length > 0);

  return (
    <section className="app-page search-page">
      <div className="admin-command-strip">
        <div>
          <span className="section-kicker">{ar ? "النظام / البحث الشامل" : "SYSTEM / GLOBAL SEARCH"}</span>
          <strong>{labels.title}</strong>
          <span className="admin-command-strip__subtitle">{labels.lead}</span>
        </div>
        {!loading && query.trim().length >= 2 && results.length > 0 && (
          <div className="admin-command-strip__meta">
            <span>{labels.resultsFor}</span>
            <strong>{results.length}</strong>
          </div>
        )}
      </div>

      <div className="search-console">
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
        <div className="search-scope">
          <span className="search-scope__label">{labels.scopes}</span>
          <div className="search-scope__tiles">
            {scopes.map((scope) => (
              <span className="search-scope__tile" key={scope.type}>
                <scope.icon size={14} aria-hidden="true" />
                {typeLabel(scope.type)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {loading && <LoadingState label={labels.loading} />}
      {!loading && query.trim().length < 2 && (
        <EmptyState icon={<FileSearch size={20} />} title={labels.start} className="search-page-empty" />
      )}
      {!loading && query.trim().length >= 2 && !results.length && (
        <EmptyState
          icon={<FileSearch size={20} />}
          title={labels.empty}
          description={labels.hint}
          className="search-page-empty"
        />
      )}
      {!loading && grouped.length > 0 && (
        <div className="search-groups">
          {grouped.map((group) => (
            <section className="search-group" key={group.type}>
              <header className="search-group__head">
                <group.icon size={15} aria-hidden="true" />
                <h2>{typeLabel(group.type)}</h2>
                <span className="mono">{String(group.items.length).padStart(2, "0")}</span>
              </header>
              <div className="search-results">
                {group.items.map((result) => (
                  <Link
                    href={href(result.href)}
                    className="search-result"
                    key={`${result.type}-${result.id}`}
                    aria-label={`${labels.open}: ${result.title}`}
                  >
                    <span className="search-result__body">
                      <span>
                        <strong>{result.title}</strong>
                      </span>
                      {result.context && <bdi>{result.context}</bdi>}
                    </span>
                    <span className="search-result__go" aria-hidden="true">{ar ? "←" : "→"}</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
