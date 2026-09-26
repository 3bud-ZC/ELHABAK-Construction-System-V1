"use client";

import { useState, type ReactNode } from "react";
import { FullscreenViewer } from "@elhabak/ui";
import { Download, Expand, FileText } from "lucide-react";

/**
 * Phone preview pattern shared by Design, Documents and Site media: a compact
 * summary card (file identity + Open/Download) that launches a dedicated
 * full-screen viewer instead of squeezing an embedded PDF workbench into a
 * 390px column.
 */
export function PreviewLauncher({
  title,
  meta,
  downloadHref,
  labels,
  children
}: {
  title: string;
  meta?: ReactNode;
  downloadHref?: string;
  labels: { open: string; download: string; close: string };
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="preview-launcher">
      <span className="preview-launcher__icon" aria-hidden="true"><FileText size={22} /></span>
      <div className="preview-launcher__copy">
        <strong dir="auto">{title}</strong>
        {meta && <span>{meta}</span>}
      </div>
      <div className="preview-launcher__actions">
        <button type="button" className="ui-button ui-button--primary" onClick={() => setOpen(true)} data-qa="open-preview">
          <Expand size={18} /> {labels.open}
        </button>
        {downloadHref && (
          <a className="ui-button ui-button--secondary" href={downloadHref}>
            <Download size={18} /> {labels.download}
          </a>
        )}
      </div>
      <FullscreenViewer
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        subtitle={meta}
        closeLabel={labels.close}
        actions={downloadHref ? <a className="adaptive-icon-button adaptive-icon-button--inverse" href={downloadHref} aria-label={labels.download}><Download size={20} /></a> : undefined}
      >
        {children}
      </FullscreenViewer>
    </div>
  );
}
