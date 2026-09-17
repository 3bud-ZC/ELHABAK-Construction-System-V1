/**
 * Canonical public base URL for the site. Driven by NEXT_PUBLIC_SITE_URL (set at build
 * and runtime on the web service) so a future custom domain only needs an env change;
 * falls back to the current Railway production hostname.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://elhabak-web-production.up.railway.app"
).replace(/\/+$/, "");
