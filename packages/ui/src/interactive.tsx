"use client";

import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState
} from "react";

/* ---------------------------------------------------------------------------
 * ELHABAK V6 interactive primitives.
 *
 * Shared, role-agnostic building blocks for the authenticated product. Styling
 * lives in the app stylesheet (ui-* classes); these components only own
 * structure, state and accessibility behaviour.
 * ------------------------------------------------------------------------ */

/* --------------------------------- Tabs ----------------------------------- */

export type TabItem = { id: string; label: ReactNode; count?: number };

export function Tabs({
  tabs,
  active,
  onChange,
  className = ""
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={`ui-tabs ${className}`.trim()} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`ui-tabs__tab${active === tab.id ? " ui-tabs__tab--active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {typeof tab.count === "number" && <span className="ui-tabs__count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------- Segmented control --------------------------- */

export type SegmentOption = { value: string; label: ReactNode; icon?: ReactNode };

export function SegmentedControl({
  options,
  value,
  onChange,
  ariaLabel,
  className = ""
}: {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div className={`ui-segmented ${className}`.trim()} role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`ui-segmented__option${value === option.value ? " ui-segmented__option--active" : ""}`}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------- SearchField ------------------------------ */

export function SearchField({
  value,
  onValueChange,
  placeholder,
  label,
  className = "",
  autoFocus = false,
  debounceMs = 0
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  autoFocus?: boolean;
  debounceMs?: number;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setDraft(value), [value]);

  function handleChange(next: string) {
    setDraft(next);
    if (debounceMs > 0) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => onValueChange(next), debounceMs);
    } else {
      onValueChange(next);
    }
  }

  return (
    <div className={`ui-search-field ${className}`.trim()}>
      {label && (
        <label className="sr-only" htmlFor={id}>
          {label}
        </label>
      )}
      <svg className="ui-search-field__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        id={id}
        type="search"
        value={draft}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(event) => handleChange(event.target.value)}
        autoComplete="off"
      />
      {draft && (
        <button
          type="button"
          className="ui-search-field__clear"
          aria-label={label ?? "Clear"}
          onClick={() => handleChange("")}
        >
          ×
        </button>
      )}
    </div>
  );
}

/* --------------------------------- Drawer ---------------------------------- */

function useOverlayBehavior(open: boolean, onClose: () => void) {
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

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  width,
  className = ""
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number | string;
  className?: string;
}) {
  const titleId = useId();
  useOverlayBehavior(open, onClose);
  if (!open) return null;
  return (
    <div className="ui-overlay" role="presentation">
      <button type="button" className="ui-overlay__backdrop" aria-label="Close" onClick={onClose} />
      <aside
        className={`ui-drawer ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={width ? { maxWidth: typeof width === "number" ? `${width}px` : width } : undefined}
      >
        <header className="ui-drawer__header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="ui-icon-button" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </header>
        <div className="ui-drawer__body">{children}</div>
        {footer && <footer className="ui-drawer__footer">{footer}</footer>}
      </aside>
    </div>
  );
}

/* ------------------------------- BottomSheet ------------------------------- */

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  className = ""
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const titleId = useId();
  useOverlayBehavior(open, onClose);
  if (!open) return null;
  return (
    <div className="ui-overlay ui-overlay--sheet" role="presentation">
      <button type="button" className="ui-overlay__backdrop" aria-label="Close" onClick={onClose} />
      <section className={`ui-bottom-sheet ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <span className="ui-bottom-sheet__grip" aria-hidden="true" />
        <header className="ui-bottom-sheet__header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="ui-icon-button" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </header>
        <div className="ui-bottom-sheet__body">{children}</div>
        {footer && <footer className="ui-bottom-sheet__footer">{footer}</footer>}
      </section>
    </div>
  );
}

/* ---------------------------------- Modal ---------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
  className = ""
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const titleId = useId();
  useOverlayBehavior(open, onClose);
  if (!open) return null;
  return (
    <div className="ui-overlay ui-overlay--modal" role="presentation">
      <button type="button" className="ui-overlay__backdrop" aria-label="Close" onClick={onClose} />
      <div className={`ui-modal${wide ? " ui-modal--wide" : ""} ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="ui-modal__header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="ui-icon-button" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </header>
        <div className="ui-modal__body">{children}</div>
        {footer && <footer className="ui-modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}

/* ------------------------------ ConfirmDialog ------------------------------ */

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
  busy = false
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  tone?: "primary" | "danger";
  busy?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" className="ui-button ui-button--secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`ui-button ${tone === "danger" ? "ui-button--danger" : "ui-button--primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {description ? <p className="ui-modal__description">{description}</p> : null}
    </Modal>
  );
}

/* -------------------------------- FormSection ------------------------------ */

export function FormSection({
  index,
  title,
  description,
  children,
  className = ""
}: {
  index?: string | number;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={`form-section ${className}`.trim()}>
      <div className="form-section__header">
        {index !== undefined && <span className="form-section__index">{index}</span>}
        <div className="form-section__headings">
          <h4>{title}</h4>
          {description && <p className="form-section__description">{description}</p>}
        </div>
      </div>
      {children}
    </fieldset>
  );
}

export function FormActions({ children, sticky = false, className = "" }: { children: ReactNode; sticky?: boolean; className?: string }) {
  return <div className={`form-actions-bar${sticky ? " form-actions-bar--sticky" : ""} ${className}`.trim()}>{children}</div>;
}

/* -------------------------------- FileDropzone ------------------------------ */

export function FileDropzone({
  onFiles,
  accept,
  multiple = true,
  label,
  hint,
  disabled = false,
  compact = false,
  className = ""
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function emit(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList);
    if (files.length > 0) onFiles(files);
  }

  return (
    <div
      className={`ui-dropzone${dragging ? " ui-dropzone--dragging" : ""}${compact ? " ui-dropzone--compact" : ""} ${className}`.trim()}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) emit(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          emit(event.target.files);
          event.target.value = "";
        }}
      />
      <button type="button" className="ui-dropzone__trigger" disabled={disabled} onClick={() => inputRef.current?.click()}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" x2="12" y1="3" y2="15" />
        </svg>
        <strong>{label}</strong>
        {hint && <span className="ui-dropzone__hint">{hint}</span>}
      </button>
    </div>
  );
}

/* ------------------------------- UploadProgress ----------------------------- */

export function UploadProgress({ value, label, className = "" }: { value: number; label?: ReactNode; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`ui-upload-progress ${className}`.trim()} role="status">
      <div className="ui-upload-progress__track" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${clamped}%` }} />
      </div>
      <span className="ui-upload-progress__meta">
        {label}
        <strong className="mono">{clamped}%</strong>
      </span>
    </div>
  );
}

/* -------------------------------- BulkActionBar ------------------------------ */

export function BulkActionBar({
  count,
  onClear,
  children,
  label,
  className = ""
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
  label?: ReactNode;
  className?: string;
}) {
  if (count === 0) return null;
  return (
    <div className={`ui-bulk-bar ${className}`.trim()} role="region" aria-live="polite">
      <span className="ui-bulk-bar__count">
        <strong className="mono">{count}</strong> {label}
      </span>
      <div className="ui-bulk-bar__actions">{children}</div>
      <button type="button" className="ui-bulk-bar__clear" onClick={onClear}>
        ×
      </button>
    </div>
  );
}

/* --------------------------------- Skeleton --------------------------------- */

export function Skeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`ui-skeleton ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} className="ui-skeleton__line" style={{ width: `${100 - index * 12}%` }} />
      ))}
    </div>
  );
}

export function SkeletonRows({ rows = 4, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`ui-skeleton-rows ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className="ui-skeleton-rows__row" />
      ))}
    </div>
  );
}

/* --------------------------------- ErrorState -------------------------------- */

export function ErrorState({
  title,
  description,
  retry,
  className = ""
}: {
  title: ReactNode;
  description?: ReactNode;
  retry?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`empty-state error-state ${className}`.trim()} role="alert">
      <svg className="empty-state__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" x2="12" y1="8" y2="12" />
        <line x1="12" x2="12.01" y1="16" y2="16" />
      </svg>
      <strong>{title}</strong>
      {description && <span>{description}</span>}
      {retry && <div className="empty-state__action">{retry}</div>}
    </div>
  );
}

/* -------------------------------- DataToolbar -------------------------------- */

export function DataToolbar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`ui-data-toolbar ${className}`.trim()}>{children}</div>;
}

/* -------------------------------- FilterDrawer ------------------------------- */

export function FilterDrawer({
  open,
  onClose,
  title,
  children,
  onApply,
  onClear,
  applyLabel = "Apply",
  clearLabel = "Clear"
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  onApply?: () => void;
  onClear?: () => void;
  applyLabel?: ReactNode;
  clearLabel?: ReactNode;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="ui-filter-drawer__actions">
          {onClear && (
            <button type="button" className="ui-button ui-button--secondary" onClick={onClear}>
              {clearLabel}
            </button>
          )}
          {onApply && (
            <button
              type="button"
              className="ui-button ui-button--primary"
              onClick={() => {
                onApply();
                onClose();
              }}
            >
              {applyLabel}
            </button>
          )}
        </div>
      }
    >
      <div className="ui-filter-drawer__body">{children}</div>
    </Drawer>
  );
}

/* ------------------------------- PreviewDrawer ------------------------------- */

export function PreviewDrawer({
  open,
  onClose,
  title,
  url,
  mimeType,
  downloadUrl,
  downloadLabel = "Download",
  className = ""
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  url: string | null;
  mimeType?: string | null;
  downloadUrl?: string | null;
  downloadLabel?: ReactNode;
  className?: string;
}) {
  const isImage = mimeType?.startsWith("image/");
  const isPdf = mimeType === "application/pdf";
  const isVideo = mimeType?.startsWith("video/");
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      width={720}
      className={`ui-preview-drawer ${className}`.trim()}
      footer={
        downloadUrl ? (
          <a className="ui-button ui-button--secondary" href={downloadUrl} target="_blank" rel="noreferrer">
            {downloadLabel}
          </a>
        ) : undefined
      }
    >
      <div className="ui-preview-drawer__stage">
        {url && isImage ? <img src={url} alt={typeof title === "string" ? title : "preview"} /> : null}
        {url && isPdf ? <iframe src={url} title={typeof title === "string" ? title : "preview"} /> : null}
        {url && isVideo ? <video src={url} controls /> : null}
        {url && !isImage && !isPdf && !isVideo ? (
          <p className="ui-preview-drawer__fallback">Preview is not available for this file type.</p>
        ) : null}
        {!url ? <p className="ui-preview-drawer__fallback">No file to preview.</p> : null}
      </div>
    </Drawer>
  );
}

/* -------------------------------- ImportStepper ------------------------------ */

export function ImportStepper({ steps, current, className = "" }: { steps: string[]; current: number; className?: string }) {
  return (
    <ol className={`ui-import-stepper ${className}`.trim()}>
      {steps.map((step, index) => (
        <li
          key={step}
          className={`ui-import-stepper__step${index === current ? " ui-import-stepper__step--current" : ""}${index < current ? " ui-import-stepper__step--done" : ""}`}
          aria-current={index === current ? "step" : undefined}
        >
          <span className="ui-import-stepper__index mono">{index < current ? "✓" : index + 1}</span>
          <span className="ui-import-stepper__label">{step}</span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------- ActivityTimeline ---------------------------- */

export type TimelineItem = {
  id: string;
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  timestamp?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
};

export function ActivityTimeline({ items, className = "" }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={`ui-activity-timeline ${className}`.trim()}>
      {items.map((item) => (
        <li key={item.id} className={`ui-activity-timeline__item ui-activity-timeline__item--${item.tone ?? "default"}`}>
          <span className="ui-activity-timeline__marker">{item.icon ?? <i aria-hidden="true" />}</span>
          <div className="ui-activity-timeline__body">
            <strong>{item.title}</strong>
            {item.description && <p>{item.description}</p>}
            {item.timestamp && <small className="mono">{item.timestamp}</small>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------- MobileRecordCard ---------------------------- */

export function MobileRecordCard({
  title,
  subtitle,
  badge,
  meta,
  actions,
  onOpen,
  openLabel,
  className = ""
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  meta?: Array<{ label: ReactNode; value: ReactNode }>;
  actions?: ReactNode;
  onOpen?: () => void;
  openLabel?: ReactNode;
  className?: string;
}) {
  const interactive = Boolean(onOpen);
  const body = (
    <>
      <div className="record-card__head">
        <div className="record-card__identity">
          <strong>{title}</strong>
          {subtitle && <span className="record-card__subtitle">{subtitle}</span>}
        </div>
        {badge}
      </div>
      {meta && meta.length > 0 && (
        <dl className="record-card__meta">
          {meta.map((item, index) => (
            <div key={index}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {(actions || onOpen) && (
        <div className="record-card__foot">
          {actions}
          {onOpen && (
            <span className="record-card__open">
              {openLabel ?? "Open"} <span aria-hidden="true">←</span>
            </span>
          )}
        </div>
      )}
    </>
  );

  if (!interactive) {
    return <article className={`record-card ${className}`.trim()}>{body}</article>;
  }
  return (
    <article
      className={`record-card record-card--interactive ${className}`.trim()}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen?.();
        }
      }}
    >
      {body}
    </article>
  );
}

/* --------------------------------- CommandBar -------------------------------- */

export function CommandBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`ui-command-bar ${className}`.trim()}>{children}</div>;
}
