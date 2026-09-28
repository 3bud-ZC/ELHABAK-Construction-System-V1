"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  locale: "ar" | "en";
  onPage: (page: number) => void;
  busy?: boolean;
};

/** Server-side page navigation for growing registers (clients, team). */
export function RegisterPager({ page, pageSize, total, locale, onPage, busy = false }: Props) {
  const ar = locale === "ar";
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize && page === 1) return null;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  // Chevrons follow reading direction: "previous" points to the start edge.
  const Prev = ar ? ChevronRight : ChevronLeft;
  const Next = ar ? ChevronLeft : ChevronRight;
  return (
    <nav className="register-pager" aria-label={ar ? "تنقل الصفحات" : "Pagination"}>
      <span className="register-pager__range">
        {ar ? "عرض" : "Showing"} <bdi>{from}–{to}</bdi> {ar ? "من" : "of"} <bdi>{total}</bdi>
      </span>
      <div className="register-pager__actions">
        <button type="button" className="ui-button ui-button--secondary" onClick={() => onPage(page - 1)} disabled={busy || page <= 1}>
          <Prev size={16} aria-hidden="true" /> {ar ? "السابق" : "Previous"}
        </button>
        <span className="register-pager__page">
          <bdi>{page}</bdi> / <bdi>{pages}</bdi>
        </span>
        <button type="button" className="ui-button ui-button--secondary" onClick={() => onPage(page + 1)} disabled={busy || page >= pages}>
          {ar ? "التالي" : "Next"} <Next size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
