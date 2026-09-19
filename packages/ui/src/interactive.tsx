"use client";

import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState
} from "react";

/* ---------------------------------------------------------------------------
 * ELHABAK interactive primitives.
 *
 * Shared, role-agnostic building blocks for the authenticated product. Styling
 * lives in the app stylesheet (ui-* classes); these components only own
 * structure, state and accessibility behaviour.
 * ------------------------------------------------------------------------ */

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
