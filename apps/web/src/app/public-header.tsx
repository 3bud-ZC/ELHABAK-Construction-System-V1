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
};

export function PublicHeader({
  locale,
  alternate,
  dir,
  labels,
  whatsappUrl,
  loginHref,
  homeHref,
  alternateHref
}: PublicHeaderProps) {
  const homeLink = homeHref ?? (locale === "ar" ? "/" : "/?lang=en");
  const alternateLink = alternateHref ?? (alternate === "ar" ? "/" : "/?lang=en");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const arrow = dir === "rtl" ? <ArrowLeft size={16} /> : <ArrowRight size={16} />;

  const navItems = [
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

  // Close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuOpen) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

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
          {navItems.map((item) => (
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
          {navItems.map((item, idx) => (
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

