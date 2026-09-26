import type { AdaptiveFiltersLabels } from "@elhabak/ui";

/** Shared copy for AdaptiveFilters / ActionMenu so every register reads the same. */
export function filterLabels(locale: "ar" | "en"): AdaptiveFiltersLabels {
  return locale === "ar"
    ? { filters: "تصفية", done: "عرض النتائج", clear: "مسح الكل", remove: "إزالة" }
    : { filters: "Filters", done: "Show results", clear: "Clear all", remove: "Remove" };
}

export function menuCloseLabel(locale: "ar" | "en"): string {
  return locale === "ar" ? "إغلاق" : "Close";
}
