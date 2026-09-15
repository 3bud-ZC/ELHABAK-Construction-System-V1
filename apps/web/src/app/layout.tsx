import type { Metadata, Viewport } from "next";
import { Almarai, Rubik } from "next/font/google";
import { Suspense } from "react";
import { DirectionSync } from "./direction-sync";
import "./globals.css";

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
  title: "ELHABAK — الحباك للاستشارات الهندسية",
  description:
    "ELHABAK Construction — an engineering company in Sohag delivering design, construction, finishing, general contracting, and furnishing with organized follow-up."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={`${almarai.variable} ${rubik.variable}`}>
      <body>
        <Suspense fallback={null}>
          <DirectionSync />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
