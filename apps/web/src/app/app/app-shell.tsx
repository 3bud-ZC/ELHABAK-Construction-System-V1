"use client";

import Image from "next/image";
import Link from "next/link";
import { BriefcaseBusiness, Camera, LayoutGrid, LogOut, Users, UserRoundCog } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { apiRequest, roleLabel, type UserRecord } from "../../lib/api";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "en" ? "en" : "ar";
  const alternate = locale === "ar" ? "en" : "ar";
  const [user, setUser] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const labels = useMemo(
    () =>
      locale === "ar"
        ? {
            productTag: "نظام إدارة المشاريع",
            dashboard: "لوحة التحكم",
            users: "المستخدمون",
            clients: "العملاء",
            projects: "المشاريع",
            worker: "تحديثات الموقع",
            logout: "تسجيل الخروج",
            loading: "جاري تحميل النظام..."
          }
        : {
            productTag: "Project Management System",
            dashboard: "Dashboard",
            users: "Users",
            clients: "Clients",
            projects: "Projects",
            worker: "Site Updates",
            logout: "Logout",
            loading: "Loading system..."
          },
    [locale]
  );

  useEffect(() => {
    let alive = true;

    apiRequest<{ user: UserRecord }>("/auth/me")
      .then((result) => {
        if (alive) setUser(result.user);
      })
      .catch(() => {
        router.replace(locale === "ar" ? "/login" : "/login?lang=en");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [locale, router]);

  async function logout() {
    await apiRequest<{ ok: true }>("/auth/logout", { method: "POST", body: "{}" }).catch(() => undefined);
    router.replace(locale === "ar" ? "/login" : "/login?lang=en");
  }

  function href(path: string, targetLocale = locale) {
    return targetLocale === "ar" ? path : `${path}?lang=en`;
  }

  function isActive(path: string) {
    return pathname === path || (path !== "/app" && pathname.startsWith(path));
  }

  if (loading || !user) {
    return (
      <main className="app-loading" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
        {labels.loading}
      </main>
    );
  }

  const initials = user.displayName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <main className="app-shell" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <aside className="app-sidebar">
        <Link className="app-logo" href={href("/app")}>
          <Image src="/brand/logo-horizontal.png" alt="ELHABAK Construction" width={180} height={75} priority />
        </Link>
        <span className="app-product-tag">{labels.productTag}</span>
        <nav className="app-nav" aria-label="Application navigation">
          <Link className={isActive("/app") && pathname === "/app" ? "active" : ""} href={href("/app")}>
            <LayoutGrid size={17} /> {labels.dashboard}
          </Link>
          {user.role === "ADMIN" && (
            <>
              <Link className={isActive("/app/admin/projects") ? "active" : ""} href={href("/app/admin/projects")}>
                <BriefcaseBusiness size={17} /> {labels.projects}
              </Link>
              <Link className={isActive("/app/admin/clients") ? "active" : ""} href={href("/app/admin/clients")}>
                <UserRoundCog size={17} /> {labels.clients}
              </Link>
              <Link className={isActive("/app/admin/users") ? "active" : ""} href={href("/app/admin/users")}>
                <Users size={17} /> {labels.users}
              </Link>
            </>
          )}
          {user.role !== "ADMIN" && (
            <Link className={isActive("/app/projects") ? "active" : ""} href={href("/app/projects")}>
              {user.role === "WORKER" ? <Camera size={17} /> : <BriefcaseBusiness size={17} />}{" "}
              {user.role === "WORKER" ? labels.worker : labels.projects}
            </Link>
          )}
        </nav>
        <div className="app-sidebar-footer">
          <div className="app-user-card">
            <span className="app-user-avatar">{initials}</span>
            <span className="app-user-meta">
              <strong>{user.displayName}</strong>
              <span>{roleLabel(user.role, locale)}</span>
            </span>
          </div>
        </div>
      </aside>
      <section className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-context">
            <strong>{user.displayName}</strong>
            <span>&middot;</span>
            <span>{roleLabel(user.role, locale)}</span>
          </div>
          <div className="app-actions">
            <Link className="lang-link" href={href(pathname, alternate)}>
              {alternate === "ar" ? "العربية" : "English"}
            </Link>
            <button className="ui-button ui-button--secondary ui-button--sm" type="button" onClick={() => void logout()}>
              <LogOut size={16} /> {labels.logout}
            </button>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
