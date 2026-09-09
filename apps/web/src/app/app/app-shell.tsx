"use client";

import Image from "next/image";
import Link from "next/link";
import { LogOut, Users, UserRoundCog, Home } from "lucide-react";
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
            home: "الرئيسية",
            users: "المستخدمون",
            clients: "العملاء",
            logout: "تسجيل الخروج",
            loading: "جاري تحميل النظام...",
            empty: "هذه المساحة جاهزة للوحدات القادمة بدون بيانات وهمية."
          }
        : {
            home: "Home",
            users: "Users",
            clients: "Clients",
            logout: "Logout",
            loading: "Loading system...",
            empty: "This area is ready for upcoming modules without fake data."
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

  if (loading || !user) {
    return (
      <main className="app-loading" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
        {labels.loading}
      </main>
    );
  }

  return (
    <main className="app-shell" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <aside className="app-sidebar">
        <Link className="app-logo" href={href("/app")}>
          <Image src="/brand/logo-primary-horizontal.png" alt="ELHABAK Construction" width={180} height={60} />
        </Link>
        <nav className="app-nav" aria-label="Application navigation">
          <Link className={pathname === "/app" ? "active" : ""} href={href("/app")}>
            <Home size={18} /> {labels.home}
          </Link>
          {user.role === "ADMIN" && (
            <>
              <Link className={pathname.includes("/admin/users") ? "active" : ""} href={href("/app/admin/users")}>
                <Users size={18} /> {labels.users}
              </Link>
              <Link
                className={pathname.includes("/admin/clients") ? "active" : ""}
                href={href("/app/admin/clients")}
              >
                <UserRoundCog size={18} /> {labels.clients}
              </Link>
            </>
          )}
        </nav>
      </aside>
      <section className="app-main">
        <header className="app-topbar">
          <div>
            <strong>{user.displayName}</strong>
            <span>{roleLabel(user.role, locale)}</span>
          </div>
          <div className="app-actions">
            <Link className="lang-link" href={href(pathname, alternate)}>
              {alternate === "ar" ? "العربية" : "English"}
            </Link>
            <button className="ui-button ui-button--secondary" type="button" onClick={() => void logout()}>
              <LogOut size={18} /> {labels.logout}
            </button>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
