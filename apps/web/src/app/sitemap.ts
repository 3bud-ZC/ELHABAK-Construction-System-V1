import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/site";

const publicRoutes = [
  "",
  "/services",
  "/engineering-consultancy",
  "/construction-management",
  "/architectural-design",
  "/site-supervision",
  "/project-management",
  "/platform",
  "/about",
  "/contact"
] as const;

// A fixed content date: stamping `new Date()` on every request tells crawlers every page
// changed on every fetch. Bump this when public page content materially changes.
const CONTENT_UPDATED = new Date("2026-09-27T00:00:00Z");

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = CONTENT_UPDATED;

  return publicRoutes.flatMap((route) => {
    const arUrl = `${siteUrl}${route || "/"}`;
    const enUrl = `${siteUrl}${route}?lang=en`;
    const languages = { ar: arUrl, en: enUrl, "x-default": arUrl };
    const priority = route === "" ? 1 : route === "/contact" || route === "/services" ? 0.9 : 0.8;

    return [
      {
        url: arUrl,
        lastModified,
        changeFrequency: "monthly" as const,
        priority,
        alternates: { languages }
      },
      {
        url: enUrl,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: Math.max(priority - 0.1, 0.5),
        alternates: { languages }
      }
    ];
  });
}
