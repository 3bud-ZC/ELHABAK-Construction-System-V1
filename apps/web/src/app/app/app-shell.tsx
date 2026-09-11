"use client";

import Image from "next/image";
import Link from "next/link";
import { BriefcaseBusiness, Camera, LayoutGrid, LogOut, Menu, Users, UserRoundCog, Wallet, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { apiRequest, roleLabel, type UserRecord } from "../../lib/api";
import { NotificationBell } from "../../components/notification-bell";

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
  const [drawerOpen, setDrawerOpen] = useState(false);

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
            finance: "الشؤون المالية",
            logout: "تسجيل الخروج",
            loading: "جاري تحميل النظام...",
            new: "إنشاء",
            edit: "تعديل",
            workspace: "مساحة المشروع",
            design: "التصميمات",
            siteActivity: "نشاط الموقع",
            documents: "المستندات",
            chat: "الدردشة",
            notifications: "الإشعارات",
            openMenu: "فتح القائمة",
            closeMenu: "إغلاق القائمة"
          }
        : {
            productTag: "Project Management System",
            dashboard: "Dashboard",
            users: "Users",
            clients: "Clients",
            projects: "Projects",
            worker: "Site Updates",
            finance: "Finance",
            logout: "Logout",
            loading: "Loading system...",
            new: "New",
            edit: "Edit",
            workspace: "Workspace",
            design: "Design",
            siteActivity: "Site Activity",
            documents: "Documents",
            chat: "Chat",
            notifications: "Notifications",
            openMenu: "Open menu",
            closeMenu: "Close menu"
          },
    [locale]
  );

  const breadcrumb = useMemo(() => {
    const raw = pathname.split("/").filter(Boolean);
    const rest = raw.slice(1);
    if (rest.length === 0) return [labels.dashboard];
    let i = 0;
    const isAdmin = rest[i] === "admin";
    if (isAdmin) i++;
    const section = rest[i];
    i++;
    const crumbs: string[] = [];
    if (section === "projects") crumbs.push(labels.projects);
    else if (section === "clients") crumbs.push(labels.clients);
    else if (section === "users") crumbs.push(labels.users);
    else if (section === "finance") crumbs.push(labels.finance);
    else if (section === "notifications") return [labels.notifications];
    else return [labels.dashboard];
    let sawId = false;
    for (const seg of rest.slice(i)) {
      if (seg === "new") crumbs.push(labels.new);
      else if (seg === "design") crumbs.push(labels.design);
      else if (seg === "site-activity") crumbs.push(labels.siteActivity);
      else if (seg === "finance") crumbs.push(labels.finance);
      else if (seg === "documents") crumbs.push(labels.documents);
      else if (seg === "chat") crumbs.push(labels.chat);
      else if (!sawId) {
        crumbs.push(isAdmin ? labels.edit : labels.workspace);
        sawId = true;
      }
    }
    return crumbs;
  }, [pathname, labels]);

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

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

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
      {drawerOpen && (
        <button
          type="button"
          className="app-mobile-backdrop"
          aria-label={labels.closeMenu}
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <aside className={drawerOpen ? "app-sidebar app-sidebar--open" : "app-sidebar"}>
        <button
          type="button"
          className="app-mobile-close"
          aria-label={labels.closeMenu}
          onClick={() => setDrawerOpen(false)}
        >
          <X size={20} />
        </button>
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
              <Link className={isActive("/app/admin/projects") || isActive("/app/projects") ? "active" : ""} href={href("/app/admin/projects")}>
                <BriefcaseBusiness size={17} /> {labels.projects}
              </Link>
              <Link className={isActive("/app/admin/clients") ? "active" : ""} href={href("/app/admin/clients")}>
                <UserRoundCog size={17} /> {labels.clients}
              </Link>
              <Link className={isActive("/app/admin/users") ? "active" : ""} href={href("/app/admin/users")}>
                <Users size={17} /> {labels.users}
              </Link>
              <Link className={isActive("/app/finance") ? "active" : ""} href={href("/app/finance")}>
                <Wallet size={17} /> {labels.finance}
              </Link>
            </>
          )}
          {user.role === "ACCOUNTANT" && (
            <Link className={isActive("/app/finance") ? "active" : ""} href={href("/app/finance")}>
              <Wallet size={17} /> {labels.finance}
            </Link>
          )}
          {user.role !== "ADMIN" && user.role !== "ACCOUNTANT" && (
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
          <button
            type="button"
            className="app-mobile-toggle"
            aria-label={labels.openMenu}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={20} />
          </button>
          <nav className="app-breadcrumb" aria-label={locale === "ar" ? "مسار الصفحة" : "Breadcrumb"}>
            {breadcrumb.map((crumb, index) => (
              <span key={crumb + index}>
                {index > 0 && <span className="app-breadcrumb__sep" aria-hidden="true" />}
                <span className={index === breadcrumb.length - 1 ? "app-breadcrumb__current" : undefined}>{crumb}</span>
              </span>
            ))}
          </nav>
          <div className="app-actions">
            <NotificationBell locale={locale} />
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
