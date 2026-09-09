import type { Metadata } from "next";
import { Almarai, Rubik } from "next/font/google";
import { Suspense } from "react";
import { DirectionSync } from "./direction-sync";
import "./globals.css";

const almarai = Almarai({
  subsets: ["arabic"],
  weight: ["300", "400", "700", "800"],
  variable: "--font-arabic",
  display: "swap"
});

const rubik = Rubik({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-latin",
  display: "swap"
});

export const metadata: Metadata = {
  title: "ELHABAK Construction System V1",
  description: "Official ELHABAK Construction website and system entry."
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
