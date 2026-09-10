import type { ComponentPropsWithoutRef, ReactNode } from "react";

type ButtonVariant = "primary" | "accent" | "secondary" | "ghost";

export type ButtonProps = ComponentPropsWithoutRef<"a"> & {
  variant?: ButtonVariant;
};

export function Button({ className = "", variant = "primary", ...props }: ButtonProps) {
  return <a className={`ui-button ui-button--${variant} ${className}`.trim()} {...props} />;
}

export type CardProps = ComponentPropsWithoutRef<"div">;

export function Card({ className = "", ...props }: CardProps) {
  return <div className={`ui-card ${className}`.trim()} {...props} />;
}

export type SectionProps = ComponentPropsWithoutRef<"section"> & {
  eyebrow?: string;
  title?: string;
  lead?: string;
  children: ReactNode;
};

export function Section({ className = "", eyebrow, title, lead, children, ...props }: SectionProps) {
  return (
    <section className={`ui-section ${className}`.trim()} {...props}>
      <div className="ui-section__inner">
        {(eyebrow || title || lead) && (
          <div className="ui-section__header">
            {eyebrow && <p className="ui-section__eyebrow">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
            {lead && <p>{lead}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export type InputProps = ComponentPropsWithoutRef<"input"> & {
  label: string;
};

export function Input({ className = "", label, id, ...props }: InputProps) {
  const inputId = id ?? label;

  return (
    <label className={`ui-field ${className}`.trim()} htmlFor={inputId}>
      <span>{label}</span>
      <input id={inputId} {...props} />
    </label>
  );
}

export type BadgeTone = "neutral" | "navy" | "orange" | "success" | "info" | "danger";

export type BadgeProps = ComponentPropsWithoutRef<"span"> & {
  tone?: BadgeTone;
};

export function Badge({ className = "", tone = "neutral", ...props }: BadgeProps) {
  return <span className={`ui-badge ui-badge--${tone} ${className}`.trim()} {...props} />;
}

export type PageHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, description, actions, className = "" }: PageHeaderProps) {
  return (
    <div className={`page-header ${className}`.trim()}>
      <div className="page-header__text">
        {eyebrow && <span className="page-header__eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}

export type MetricCardProps = {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: BadgeTone;
};

export function MetricCard({ label, value, hint, icon, tone = "navy" }: MetricCardProps) {
  return (
    <div className="metric-card">
      {icon && <span className={`metric-card__icon metric-card__icon--${tone}`}>{icon}</span>}
      <div className="metric-card__body">
        <span className="metric-card__label">{label}</span>
        <strong className="metric-card__value">{value}</strong>
        {hint && <span className="metric-card__hint">{hint}</span>}
      </div>
    </div>
  );
}

export type EmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      {icon && <span className="empty-state__icon">{icon}</span>}
      <strong>{title}</strong>
      {description && <span>{description}</span>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}

export type LoadingStateProps = {
  label?: ReactNode;
  className?: string;
};

export function LoadingState({ label, className = "" }: LoadingStateProps) {
  return (
    <div className={`loading-state ${className}`.trim()} role="status">
      <span className="loading-state__spinner" aria-hidden="true" />
      {label && <span>{label}</span>}
    </div>
  );
}

export type ProgressBarProps = ComponentPropsWithoutRef<"div"> & {
  value: number;
  tone?: "orange" | "success" | "navy";
};

export function ProgressBar({ value, tone = "orange", className = "", ...props }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`progress-track progress-track--${tone} ${className}`.trim()}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <span style={{ width: `${clamped}%` }} />
    </div>
  );
}
