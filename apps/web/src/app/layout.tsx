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
  title: "ELHABAK Construction | الحباك للمقاولات والاستشارات الهندسية",
  description:
    "الحباك للمقاولات والاستشارات الهندسية — خدمات التصميم والاستشارات الهندسية، إدارة والإشراف على المشروعات، المقاولات والتنفيذ والتشطيبات في مصر.",
  applicationName: "ELHABAK Construction Operations",
  creator: "ELHABAK Construction",
  category: "engineering and construction",
  alternates: {
    canonical: "/",
    languages: {
      ar: "/",
      en: "/?lang=en",
      "x-default": "/"
    }
  },
  openGraph: {
    title: "ELHABAK Construction | الحباك للمقاولات والاستشارات الهندسية",
    description:
      "الحباك للمقاولات والاستشارات الهندسية — خدمات التصميم والاستشارات الهندسية، إدارة والإشراف على المشروعات، المقاولات والتنفيذ والتشطيبات في مصر.",
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
    title: "ELHABAK Construction | الحباك للمقاولات والاستشارات الهندسية",
    description:
      "الحباك للمقاولات والاستشارات الهندسية — خدمات التصميم والاستشارات الهندسية، إدارة والإشراف على المشروعات، المقاولات والتنفيذ والتشطيبات في مصر.",
    images: ["/marketing/hero-delivery.webp"]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b132b",
  // Android Chrome shrinks the layout viewport (and dvh) above the virtual keyboard,
  // so viewport-tall layouts such as the chat column keep the composer on screen.
  interactiveWidget: "resizes-content"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Reading the nonce that proxy.ts generated for this request makes every route render
  // dynamically, which is exactly what the nonce-based Content-Security-Policy requires.
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  const locale = requestHeaders.get("x-elhabak-locale") === "en" ? "en" : "ar";
  return (
    <html lang={locale} dir={locale === "en" ? "ltr" : "rtl"} suppressHydrationWarning className={`${almarai.variable} ${rubik.variable}`}>
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
