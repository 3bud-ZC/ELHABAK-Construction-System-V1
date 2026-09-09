import type { Metadata } from "next";
import { Suspense } from "react";
import { DirectionSync } from "./direction-sync";
import "./globals.css";

export const metadata: Metadata = {
  title: "ELHABAK Construction System V1",
  description: "Official ELHABAK Construction website and system entry."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <Suspense fallback={null}>
          <DirectionSync />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
