"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";
import { Menu, X, MessageCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@elhabak/ui";
import type { Locale } from "../i18n/translations";

type HeaderNavLabels = {
  about: string;
  services: string;
  process: string;
  platform: string;
  contact: string;
  login: string;
  language: string;
};

type PublicHeaderProps = {
  locale: Locale;
  alternate: Locale;
  dir: "rtl" | "ltr";
  labels: HeaderNavLabels;
  whatsappUrl: string;
  loginHref: string;
  homeHref?: string;
  alternateHref?: string;
  navItems?: { href: string; label: string }[];
};

export function PublicHeader({
  locale,
  alternate,
  dir,
  labels,
  whatsappUrl,
  loginHref,
  homeHref,
  alternateHref,
  navItems
}: PublicHeaderProps) {
  const homeLink = homeHref ?? (locale === "ar" ? "/" : "/?lang=en");
  const alternateLink = alternateHref ?? (alternate === "ar" ? "/" : "/?lang=en");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const arrow = dir === "rtl" ? <ArrowLeft size={16} /> : <ArrowRight size={16} />;

  const items = navItems ?? [
    { href: "#about", label: labels.about },
    { href: "#services", label: labels.services },
    { href: "#process", label: labels.process },
    { href: "#platform", label: labels.platform },
    { href: "#contact", label: labels.contact }
  ];

  // Scroll handler for shadow / backdrop blur intensity
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Escape closes the drawer; Tab cycles inside it while it is open (modal drawer).
  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (e.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  // Focus moves into the drawer when it opens and back to the menu button when it closes.
  useEffect(() => {
    if (menuOpen) {
      wasOpen.current = true;
      drawerRef.current?.querySelector<HTMLElement>(".mobile-drawer__close")?.focus();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      menuButtonRef.current?.focus();
    }
  }, [menuOpen]);

  // A drawer left open while the viewport grows past the phone breakpoint closes itself.
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 981px)");
    const onChange = () => {
      if (wide.matches) setMenuOpen(false);
    };
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="container header-inner">
        {/* Brand Logo */}
        <a className="brand-link" href={homeLink} aria-label="ELHABAK Construction">
          <Image
            src="/brand/logo-horizontal.png"
            alt="ELHABAK Construction"
            width={210}
            height={88}
            priority
            className="brand-logo-img"
          />
        </a>

        {/* Desktop Navigation */}
        <nav
          className="header-nav"
          aria-label={locale === "ar" ? "التنقل الرئيسي" : "Main navigation"}
        >
          {items.map((item) => (
            <a href={item.href} key={item.href} className="header-nav__link">
              {item.label}
            </a>
          ))}
        </nav>

        {/* Desktop Header Actions */}
        <div className="header-actions">
          <a
            className="lang-link"
            href={alternateLink}
            aria-label={locale === "ar" ? "Switch to English" : "التحويل إلى العربية"}
          >
            {labels.language}
          </a>
          <Button
            href={loginHref}
            variant="primary"
            className="header-login header-login--solid"
          >
            {labels.login}
          </Button>
        </div>

        {/* Mobile Header Controls */}
        <div className="mobile-header-controls">
          <a
            className="lang-link lang-link--mobile"
            href={alternateLink}
            aria-label={locale === "ar" ? "Switch to English" : "التحويل إلى العربية"}
          >
            {labels.language}
          </a>
          <button
            ref={menuButtonRef}
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={menuOpen ? (locale === "ar" ? "إغلاق القائمة" : "Close menu") : (locale === "ar" ? "فتح القائمة" : "Open menu")}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer Backdrop & Panel */}
      <div
        className={`mobile-drawer-backdrop${menuOpen ? " is-open" : ""}`}
        onClick={closeMenu}
        aria-hidden={!menuOpen}
      />
      <aside
        id="mobile-nav-drawer"
        ref={drawerRef}
        className={`mobile-drawer${menuOpen ? " is-open" : ""}`}
        aria-label={locale === "ar" ? "قائمة الموقع" : "Site menu"}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <div className="mobile-drawer__header">
          <Image
            src="/brand/logo-horizontal.png"
            alt="ELHABAK Construction"
            width={160}
            height={68}
            className="mobile-drawer__logo"
          />
          <button
            type="button"
            className="mobile-drawer__close"
            onClick={closeMenu}
            aria-label={locale === "ar" ? "إغلاق" : "Close"}
          >
            <X size={22} />
          </button>
        </div>

        <nav className="mobile-drawer__nav" aria-label={locale === "ar" ? "روابط الأقسام" : "Section links"}>
          {items.map((item, idx) => (
            <a
              href={item.href}
              key={item.href}
              className="mobile-drawer__link"
              onClick={closeMenu}
            >
              <span className="mobile-drawer__link-num">{String(idx + 1).padStart(2, "0")}</span>
              <span className="mobile-drawer__link-text">{item.label}</span>
              <span className="mobile-drawer__link-arrow">{arrow}</span>
            </a>
          ))}
        </nav>

        <div className="mobile-drawer__actions">
          <Button
            href={loginHref}
            variant="primary"
            className="mobile-drawer__btn mobile-drawer__btn--login"
            onClick={closeMenu}
          >
            {labels.login}
          </Button>
          <Button
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            variant="accent"
            className="mobile-drawer__btn mobile-drawer__btn--whatsapp"
            onClick={closeMenu}
          >
            <MessageCircle size={18} />
            <span>{locale === "ar" ? "تواصل عبر واتساب" : "WhatsApp"}</span>
          </Button>
        </div>

        <div className="mobile-drawer__footer">
          <p className="mobile-drawer__slogan">
            {locale === "ar" ? "نبني اليوم ... لمستقبل أفضل" : "Building Today ... For a Better Tomorrow"}
          </p>
        </div>
      </aside>
    </header>
  );
}

