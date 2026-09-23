/**
 * Canonical public base URL for the site. Driven by NEXT_PUBLIC_SITE_URL (set at build
 * and runtime on the web service) while the canonical production domain remains the safe fallback.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://elhabak.com"
).replace(/\/+$/, "");
