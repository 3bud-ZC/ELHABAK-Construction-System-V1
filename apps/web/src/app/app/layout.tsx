import { Suspense } from "react";
import { AppShell } from "./app-shell";

export default function AuthenticatedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<main className="app-loading">Loading...</main>}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
