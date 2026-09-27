import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "./app-shell";

// Authenticated workspace: never indexed (robots.txt also disallows /app).
export const metadata: Metadata = {
  title: "ELHABAK | منصة المشاريع",
  robots: { index: false, follow: false }
};

export default function AuthenticatedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<main className="app-loading">Loading...</main>}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
