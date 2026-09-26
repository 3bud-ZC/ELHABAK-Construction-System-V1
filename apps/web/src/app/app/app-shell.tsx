"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  BriefcaseBusiness,
  Camera,
  Database,
  FileText,
  LayoutGrid,
  LogOut,
  Menu,
  Search,
  Users,
  UserRoundCog,
  Wallet,
  X
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { apiRequest, roleLabel, type UserRecord } from "../../lib/api";
import { UserContext } from "../../lib/user-context";
import { NotificationBell } from "../../components/notification-bell";
import { ForcePasswordChange } from "./force-password-change";

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
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
  const [exitingImpersonation, setExitingImpersonation] = useState(false);

  const labels = useMemo(
    () =>
      locale === "ar"
        ? {
          productTag: "نظام تشغيل المشاريع",
          navPrimary: "التشغيل",
          navManagement: "الإدارة",
          navControl: "التحكم",
          navSystem: "النظام والأدوات",
          account: "الحساب",
          dashboard: "لوحة التحكم",
          users: "الفريق",
          clients: "العملاء",
          projects: "المشاريع",
          worker: "تحديثات الموقع",
          finance: "الشؤون المالية",
          reports: "التقارير",
          search: "البحث",
          searchPlaceholder: "بحث شامل",
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
          closeMenu: "إغلاق القائمة",
          impersonating: "أنت الآن تستعرض النظام بصلاحيات",
          returnToAdmin: "العودة لحساب المدير",
          returning: "جاري العودة...",
          dataOps: "عمليات البيانات",
          settings: "إعدادات الحساب",
          menu: "القائمة"
        }
        : {
          productTag: "Project Operations System",
          navPrimary: "Operations",
          navManagement: "Management",
          navControl: "Control",
          navSystem: "System / Tools",
          account: "Account",
          dashboard: "Dashboard",
          users: "Team",
          clients: "Clients",
          projects: "Projects",
          worker: "Site Updates",
          finance: "Finance",
          reports: "Reports",
          search: "Search",
          searchPlaceholder: "Global search",
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
          closeMenu: "Close menu",
          impersonating: "You are viewing the system as",
          returnToAdmin: "Return to Admin",
          returning: "Returning...",
          dataOps: "Data Ops",
          settings: "Account settings",
          menu: "Menu"
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
    else if (section === "reports") crumbs.push(labels.reports);
    else if (section === "search") return [labels.search];
    else if (section === "notifications") return [labels.notifications];
    else if (section === "data") return [labels.dataOps];
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
    await apiRequest<{ ok: true }>("/auth/logout", { method: "POST", body: "{}" }).catch(
      () => undefined
    );
    router.replace(locale === "ar" ? "/login" : "/login?lang=en");
  }

  async function exitImpersonation() {
    setExitingImpersonation(true);
    try {
      const result = await apiRequest<{ user: UserRecord }>("/auth/impersonation/exit", {
        method: "POST",
        body: "{}"
      });
      setUser(result.user);
      router.replace(href("/app/admin/users"));
    } finally {
      setExitingImpersonation(false);
    }
  }

  function href(path: string, targetLocale = locale) {
    return targetLocale === "ar" ? path : `${path}${path.includes("?") ? "&" : "?"}lang=en`;
  }

  function languageHref() {
    const params = new URLSearchParams(searchParams.toString());
    if (alternate === "en") params.set("lang", "en");
    else params.delete("lang");
    return `${pathname}${params.size ? `?${params.toString()}` : ""}`;
  }

  function isActive(path: string) {
    return pathname === path || (path !== "/app" && pathname.startsWith(path));
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    router.push(href(`/app/search${query ? `?q=${encodeURIComponent(query)}` : ""}`));
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

  if (user.mustChangePassword) {
    return (
      <ForcePasswordChange
        locale={locale}
        onDone={() => setUser({ ...user, mustChangePassword: false })}
      />
    );
  }

  return (
    <UserContext.Provider value={user}>
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
          <div className="app-brand-block">
            <Link className="app-logo" href={href("/app")}>
              <Image
                src="/brand/logo-horizontal.png"
                alt="ELHABAK Construction"
                width={180}
                height={75}
                priority
              />
            </Link>
            <div className="app-brand-meta">
              <span className="app-brand-code mono">ELHABAK CONSTRUCTION</span>
              <span className="app-product-tag">{labels.productTag}</span>
            </div>
          </div>
          <nav className="app-nav" aria-label={locale === "ar" ? "التنقل داخل النظام" : "Application navigation"}>
            <div className="app-nav-group">
              <span className="app-nav-label">{labels.navPrimary}</span>
              <Link
                className={isActive("/app") && pathname === "/app" ? "active" : ""}
                href={href("/app")}
              >
                <LayoutGrid size={17} /> {labels.dashboard}
              </Link>
              {user.role === "ADMIN" && (
                <Link
                  className={
                    isActive("/app/admin/projects") || isActive("/app/projects") ? "active" : ""
                  }
                  href={href("/app/admin/projects")}
                >
                  <BriefcaseBusiness size={17} /> {labels.projects}
                </Link>
              )}
              {user.role !== "ADMIN" && user.role !== "ACCOUNTANT" && (
                <Link
                  className={isActive("/app/projects") ? "active" : ""}
                  href={href("/app/projects")}
                >
                  {user.role === "WORKER" ? <Camera size={17} /> : <BriefcaseBusiness size={17} />} {" "}
                  {user.role === "WORKER" ? labels.worker : labels.projects}
                </Link>
              )}
            </div>
            {(user.role === "ADMIN" || user.role === "ACCOUNTANT" || user.role !== "WORKER") && (
              <div className="app-nav-group">
                <span className="app-nav-label">{labels.navManagement}</span>
                {user.role === "ADMIN" && (
                  <>
                    <Link
                      className={isActive("/app/admin/clients") ? "active" : ""}
                      href={href("/app/admin/clients")}
                    >
                      <UserRoundCog size={17} /> {labels.clients}
                    </Link>
                    <Link
                      className={isActive("/app/admin/users") ? "active" : ""}
                      href={href("/app/admin/users")}
                    >
                      <Users size={17} /> {labels.users}
                    </Link>
                  </>
                )}
                {(user.role === "ADMIN" || user.role === "ACCOUNTANT") && (
                  <Link
                    className={isActive("/app/finance") ? "active" : ""}
                    href={href("/app/finance")}
                  >
                    <Wallet size={17} /> {labels.finance}
                  </Link>
                )}
              </div>
            )}
            {(user.role === "ADMIN" || user.role === "ACCOUNTANT" || user.role === "ENGINEER") && (
              <div className="app-nav-group">
                <span className="app-nav-label">{labels.navControl}</span>
                <Link
                  className={isActive("/app/reports") ? "active" : ""}
                  href={href("/app/reports")}
                >
                  <FileText size={17} /> {labels.reports}
                </Link>
              </div>
            )}
            {(user.role === "ADMIN" || user.role === "ACCOUNTANT" || user.role === "ENGINEER") && (
              <div className="app-nav-group">
                <span className="app-nav-label">{labels.navSystem}</span>
                <Link
                  className={isActive("/app/data") ? "active" : ""}
                  href={href("/app/data")}
                >
                  <Database size={17} /> {labels.dataOps}
                </Link>
              </div>
            )}
          </nav>
          <div className="app-sidebar-footer">
            <span className="app-nav-label app-account-label">{labels.account}</span>
            <div className="app-user-card">
              <span className="app-user-avatar">{initials}</span>
              <span className="app-user-meta">
                <strong>{user.displayName}</strong>
                <span>{roleLabel(user.role, locale)}</span>
              </span>
            </div>
            <Link className="app-sidebar-settings" href={href("/app/settings")}><UserRoundCog size={15} /> {labels.settings}</Link>
            <button className="app-sidebar-logout" type="button" onClick={() => void logout()}>
              <LogOut size={15} /> {labels.logout}
            </button>
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
            <nav
              className="app-breadcrumb"
              aria-label={locale === "ar" ? "مسار الصفحة" : "Breadcrumb"}
            >
              {breadcrumb.map((crumb, index) => (
                <span key={crumb + index}>
                  {index > 0 && <span className="app-breadcrumb__sep" aria-hidden="true" />}
                  <span
                    className={
                      index === breadcrumb.length - 1 ? "app-breadcrumb__current" : undefined
                    }
                  >
                    {crumb}
                  </span>
                </span>
              ))}
            </nav>
            <form className="app-global-search" role="search" onSubmit={submitSearch}>
              <Search size={16} aria-hidden="true" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={labels.searchPlaceholder}
                aria-label={labels.searchPlaceholder}
              />
            </form>
            <div className="app-actions">
              <NotificationBell locale={locale} />
              <Link className="lang-link" href={languageHref()}>
                {alternate === "ar" ? "العربية" : "English"}
              </Link>
            </div>
          </header>
          {user.impersonation ? (
            <div className="impersonation-banner" role="status">
              <span>
                {labels.impersonating}: <strong>{user.displayName}</strong>
              </span>
              <button
                type="button"
                onClick={() => void exitImpersonation()}
                disabled={exitingImpersonation}
              >
                {exitingImpersonation ? labels.returning : labels.returnToAdmin}
              </button>
            </div>
          ) : null}
          {children}
        </section>
        <nav
          className="app-bottom-nav"
          aria-label={locale === "ar" ? "التنقل السريع" : "Quick navigation"}
        >
          <Link className={pathname === "/app" ? "active" : ""} href={href("/app")}>
            <LayoutGrid size={19} />
            <span>{labels.dashboard}</span>
          </Link>
          {user.role === "ADMIN" ? (
            <Link
              className={isActive("/app/admin/projects") || isActive("/app/projects") ? "active" : ""}
              href={href("/app/admin/projects")}
            >
              <BriefcaseBusiness size={19} />
              <span>{labels.projects}</span>
            </Link>
          ) : user.role === "ACCOUNTANT" ? (
            <Link className={isActive("/app/finance") ? "active" : ""} href={href("/app/finance")}>
              <Wallet size={19} />
              <span>{labels.finance}</span>
            </Link>
          ) : (
            <Link className={isActive("/app/projects") ? "active" : ""} href={href("/app/projects")}>
              {user.role === "WORKER" ? <Camera size={19} /> : <BriefcaseBusiness size={19} />}
              <span>{user.role === "WORKER" ? labels.worker : labels.projects}</span>
            </Link>
          )}
          {user.role === "ADMIN" ? (
            <Link className={isActive("/app/data") ? "active" : ""} href={href("/app/data")}>
              <Database size={19} />
              <span>{labels.dataOps}</span>
            </Link>
          ) : (
            <Link
              className={isActive("/app/notifications") ? "active" : ""}
              href={href("/app/notifications")}
            >
              <Bell size={19} />
              <span>{labels.notifications}</span>
            </Link>
          )}
          <Link className={isActive("/app/search") ? "active" : ""} href={href("/app/search")}>
            <Search size={19} />
            <span>{labels.search}</span>
          </Link>
          <button
            type="button"
            className={drawerOpen ? "active" : ""}
            aria-label={labels.openMenu}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={19} />
            <span>{labels.menu}</span>
          </button>
        </nav>
      </main>
    </UserContext.Provider>
  );
}
