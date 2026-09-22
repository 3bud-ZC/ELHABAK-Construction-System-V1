import type { Metadata, Viewport } from "next";
import { Almarai, Rubik } from "next/font/google";
import Script from "next/script";
import { headers } from "next/headers";
import { Suspense } from "react";
import { DirectionSync } from "./direction-sync";
import { siteUrl } from "../lib/site";
import "./globals.css";
import "./public-home.css";

const almarai = Almarai({
  subsets: ["arabic"],
  weight: ["400", "700", "800"],
  variable: "--font-arabic",
  display: "swap"
});

const rubik = Rubik({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-latin",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "الحباك للمقاولات والاستشارات الهندسية | ELHABAK Construction",
  description:
    "شركة الحباك للمقاولات والاستشارات الهندسية تقدم التصميم المعماري، إدارة المشروعات، الإشراف على التنفيذ، المقاولات والتشطيبات، مع نظام رقمي لمتابعة تقدم المشروع.",
  applicationName: "ELHABAK Construction Operations",
  creator: "ELHABAK Construction",
  category: "engineering and construction",
  alternates: {
    canonical: "/",
    languages: {
      ar: "/",
      en: "/?lang=en"
    }
  },
  openGraph: {
    title: "الحباك للمقاولات والاستشارات الهندسية | ELHABAK Construction",
    description:
      "شركة مقاولات واستشارات هندسية: تصميم معماري، إدارة مشروعات، إشراف على التنفيذ، وتشطيبات بمتابعة رقمية منظمة.",
    url: "/",
    siteName: "ELHABAK Construction",
    locale: "ar_EG",
    alternateLocale: ["en_US"],
    type: "website",
    images: [
      {
        url: "/marketing/hero-delivery.webp",
        width: 1536,
        height: 866,
        alt: "ELHABAK Construction completed building"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "الحباك للمقاولات والاستشارات الهندسية | ELHABAK Construction",
    description:
      "Architectural design, engineering consultancy, construction management, site supervision, and contracting with digital project tracking.",
    images: ["/marketing/hero-delivery.webp"]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Reading the nonce that proxy.ts generated for this request makes every route render
  // dynamically, which is exactly what the nonce-based Content-Security-Policy requires.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`${almarai.variable} ${rubik.variable}`}>
      <body>
        <Script
          id="elhabak-lang-boot"
          strategy="beforeInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    const params = new URLSearchParams(window.location.search);
    const locale = params.get("lang") === "en" ? "en" : "ar";
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "en" ? "ltr" : "rtl";
  } catch {}
})();`
          }}
        />
        <Suspense fallback={null}>
          <DirectionSync />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
