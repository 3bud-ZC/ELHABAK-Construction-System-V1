import type { MetadataRoute } from "next";

/** Installable web app: field staff and clients can add the project platform to their home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "الحباك — منصة متابعة المشاريع",
    short_name: "الحباك",
    description: "ELHABAK Construction project operations platform: design reviews, site activity, finance and project chat.",
    lang: "ar",
    dir: "rtl",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f6fa",
    theme_color: "#0b132b",
    categories: ["business", "productivity"],
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }
    ]
  };
}
