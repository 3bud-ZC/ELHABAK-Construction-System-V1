import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const languages = {
    ar: `${siteUrl}/`,
    en: `${siteUrl}/?lang=en`
  };

  return [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
      alternates: { languages }
    },
    {
      url: `${siteUrl}/?lang=en`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
      alternates: { languages }
    }
  ];
}
