"use client";

import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore
} from "react";

/* ---------------------------------------------------------------------------
 * ELHABAK adaptive primitives.
 *
 * One component, two compositions: the same controls render inline on
 * desktop/tablet and re-compose into phone-native patterns (bottom sheets,
 * full-screen viewers, disclosures) below the phone breakpoint. Nothing is
 * hidden with display:none — every desktop capability stays reachable.
 * Styling lives in apps/web/src/app/styles/system/*.css.
 * ------------------------------------------------------------------------ */

/** Mirrors the phone breakpoint documented in styles/tokens.css. */
export const PHONE_QUERY = "(max-width: 767.98px)";

export function useMediaQuery(query: string, serverFallback = false): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverFallback
  );
}

export function useIsPhone(): boolean {
  return useMediaQuery(PHONE_QUERY);
}

/** Locks page scroll and wires Escape while an overlay is open. */
function useOverlay(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);
}

/** Keeps Tab focus inside `container` while active. */
function useFocusTrap(active: boolean, container: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active || !container.current) return;
    const root = container.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const selector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';
    const first = root.querySelector<HTMLElement>(selector);
    first?.focus({ preventScroll: true });
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((node) => node.offsetParent !== null);
      if (nodes.length === 0) return;
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      if (!firstNode || !lastNode) return;
      if (event.shiftKey && document.activeElement === firstNode) {
        event.preventDefault();
        lastNode.focus();
      } else if (!event.shiftKey && document.activeElement === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    }
    root.addEventListener("keydown", onKeyDown);
    return () => {
      root.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [active, container]);
}

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const FilterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 5h18M6 12h12M10 19h4" />
  </svg>
);

/* ----------------------------- AdaptiveFilters ----------------------------- */

export type FilterChip = { key: string; label: ReactNode; onRemove: () => void };

export type AdaptiveFiltersLabels = {
  filters: string;
  done: string;
  clear: string;
  remove: string;
};

/**
 * Desktop/tablet: search + inline filter controls + meta in one toolbar.
 * Phone: search + a Filters button; controls move into a bottom sheet and the
 * active filters surface as removable chips under the search field.
 */
export function AdaptiveFilters({
  search,
  children,
  chips = [],
  onClear,
  meta,
  labels,
  className = ""
}: {
  search?: ReactNode;
  children?: ReactNode;
  chips?: FilterChip[];
  onClear?: () => void;
  meta?: ReactNode;
  labels: AdaptiveFiltersLabels;
  className?: string;
}) {
  const isPhone = useIsPhone();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const sheetOpen = isPhone && open;
  const close = useCallback(() => setOpen(false), []);
  useOverlay(sheetOpen, close);
  useFocusTrap(sheetOpen, panelRef);

  useEffect(() => {
    if (!isPhone) setOpen(false);
  }, [isPhone]);

  const hasControls = Boolean(children);

  return (
    <div className={`adaptive-filters${sheetOpen ? " is-open" : ""} ${className}`.trim()}>
      <div className="adaptive-filters__bar">
        {search && <div className="adaptive-filters__search">{search}</div>}
        {hasControls && (
          <button
            type="button"
            className={`adaptive-filters__toggle${chips.length ? " has-active" : ""}`}
            aria-expanded={sheetOpen}
            aria-controls={panelId}
            onClick={() => setOpen(true)}
          >
            <FilterIcon />
            <span>{labels.filters}</span>
            {chips.length > 0 && <span className="adaptive-filters__count" dir="ltr">{chips.length}</span>}
          </button>
        )}
        {hasControls && (
          <div
            ref={panelRef}
            id={panelId}
            className="adaptive-filters__panel"
            role={sheetOpen ? "dialog" : undefined}
            aria-modal={sheetOpen ? true : undefined}
            aria-labelledby={sheetOpen ? titleId : undefined}
          >
            <header className="adaptive-filters__sheet-head">
              <strong id={titleId}>{labels.filters}</strong>
              <button type="button" className="adaptive-icon-button" onClick={close} aria-label={labels.done}>
                <CloseIcon />
              </button>
            </header>
            <div className="adaptive-filters__controls">{children}</div>
            <footer className="adaptive-filters__sheet-foot">
              {onClear && (
                <button type="button" className="ui-button ui-button--secondary" onClick={onClear} disabled={chips.length === 0}>
                  {labels.clear}
                </button>
              )}
              <button type="button" className="ui-button ui-button--primary" onClick={close}>
                {labels.done}
              </button>
            </footer>
          </div>
        )}
        {meta && <div className="adaptive-filters__meta">{meta}</div>}
      </div>
      {sheetOpen && <button type="button" className="adaptive-filters__backdrop" aria-label={labels.done} onClick={close} tabIndex={-1} />}
      {chips.length > 0 && (
        <div className="adaptive-filters__chips" aria-live="polite">
          {chips.map((chip) => (
            <button type="button" className="adaptive-chip" key={chip.key} onClick={chip.onRemove}>
              <span>{chip.label}</span>
              <span className="adaptive-chip__x" aria-label={labels.remove}>×</span>
            </button>
          ))}
          {onClear && chips.length > 1 && (
            <button type="button" className="adaptive-chip adaptive-chip--clear" onClick={onClear}>
              {labels.clear}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- ActionMenu ------------------------------- */

export type ActionMenuItem = {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  href?: string;
  download?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
};

/**
 * A single trigger that groups secondary actions (exports, overflow). Opens as
 * a popover on desktop and as a bottom sheet on phones.
 */
export function ActionMenu({
  label,
  icon,
  items,
  title,
  closeLabel,
  className = "",
  variant = "secondary"
}: {
  label: ReactNode;
  icon?: ReactNode;
  items: ActionMenuItem[];
  title?: ReactNode;
  closeLabel: string;
  className?: string;
  variant?: "secondary" | "primary" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const isPhone = useIsPhone();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOverlay(open && isPhone, close);
  useFocusTrap(open, listRef);

  useEffect(() => {
    if (!open || isPhone) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, isPhone]);

  return (
    <div className={`action-menu${open ? " is-open" : ""} ${className}`.trim()} ref={rootRef}>
      <button
        type="button"
        className={`ui-button ui-button--${variant} action-menu__trigger`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {icon}
        <span>{label}</span>
        <svg className="action-menu__caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && isPhone && <button type="button" className="action-menu__backdrop" aria-label={closeLabel} onClick={close} tabIndex={-1} />}
      {open && (
        <div className="action-menu__list" role="menu" id={menuId} ref={listRef}>
          {isPhone && (
            <header className="action-menu__head">
              <strong>{title ?? label}</strong>
              <button type="button" className="adaptive-icon-button" onClick={close} aria-label={closeLabel}><CloseIcon /></button>
            </header>
          )}
          {items.map((item) =>
            item.href ? (
              <a
                key={item.key}
                role="menuitem"
                className="action-menu__item"
                href={item.href}
                download={item.download ? "" : undefined}
                aria-disabled={item.disabled || undefined}
                onClick={() => setOpen(false)}
              >
                {item.icon}
                <span>{item.label}</span>
              </a>
            ) : (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                className="action-menu__item"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------- AdaptiveDisclosure --------------------------- */

/**
 * Always expanded on tablet/desktop. On phones the body collapses behind a
 * full-width toggle (e.g. "Project details") so secondary context never pushes
 * the primary module content below the fold.
 */
export function AdaptiveDisclosure({
  label,
  summary,
  children,
  className = "",
  defaultOpen = false
}: {
  label: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <div className={`adaptive-disclosure${open ? " is-open" : ""} ${className}`.trim()}>
      <button type="button" className="adaptive-disclosure__toggle" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((value) => !value)}>
        <span className="adaptive-disclosure__label">{label}</span>
        {summary && <span className="adaptive-disclosure__summary">{summary}</span>}
        <svg className="adaptive-disclosure__caret" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <div className="adaptive-disclosure__body" id={bodyId}>
        {children}
      </div>
    </div>
  );
}

/* ----------------------------- FullscreenViewer ---------------------------- */

/**
 * Dedicated full-screen preview surface for drawings, documents and media on
 * phones (and on demand on desktop). Header carries identity + actions; the
 * body gives the file the entire viewport.
 */
export function FullscreenViewer({
  open,
  onClose,
  title,
  subtitle,
  actions,
  children,
  closeLabel
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  closeLabel: string;
}) {
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  useOverlay(open, onClose);
  useFocusTrap(open, rootRef);
  if (!open) return null;
  return (
    <div className="fullscreen-viewer" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={rootRef}>
      <header className="fullscreen-viewer__head">
        <button type="button" className="adaptive-icon-button adaptive-icon-button--inverse" onClick={onClose} aria-label={closeLabel}>
          <CloseIcon />
        </button>
        <div className="fullscreen-viewer__title">
          <strong id={titleId} dir="auto">{title}</strong>
          {subtitle && <span>{subtitle}</span>}
        </div>
        {actions && <div className="fullscreen-viewer__actions">{actions}</div>}
      </header>
      <div className="fullscreen-viewer__body">{children}</div>
    </div>
  );
}

/* ------------------------------- StickyActions ----------------------------- */

/** Form action footer that pins to the bottom of the viewport on phones. */
export function StickyActions({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`sticky-actions ${className}`.trim()}>{children}</div>;
}
