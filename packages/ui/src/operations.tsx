import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";

type OperationsHeaderProps = ComponentPropsWithoutRef<"header"> & {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
};

export function OperationsHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
  className = "",
  ...props
}: OperationsHeaderProps) {
  return (
    <header className={`ops-header ${className}`.trim()} {...props}>
      <div className="ops-header__copy">
        {eyebrow && <span className="ops-header__eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {(meta || actions) && (
        <div className="ops-header__aside">
          {meta && <div className="ops-header__meta">{meta}</div>}
          {actions && <div className="ops-header__actions">{actions}</div>}
        </div>
      )}
    </header>
  );
}

export function OperationsToolbar({
  children,
  className = "",
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={`ops-toolbar ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function OperationsSurface({
  children,
  className = "",
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return (
    <section className={`ops-surface ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}

type OperationsPanelProps = ComponentPropsWithoutRef<"section"> & {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export function OperationsPanel({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = "",
  ...props
}: OperationsPanelProps) {
  return (
    <section className={`ops-panel ${className}`.trim()} {...props}>
      {(eyebrow || title || description || actions) && (
        <header className="ops-panel__head">
          <div>
            {eyebrow && <span className="ops-panel__eyebrow">{eyebrow}</span>}
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions && <div className="ops-panel__actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function OperationsGrid({
  children,
  className = "",
  style,
  columns,
  ...props
}: ComponentPropsWithoutRef<"div"> & { columns?: string }) {
  const gridStyle = {
    ...(columns ? { "--ops-grid-cols": columns } : {}),
    ...style
  } as CSSProperties;

  return (
    <div className={`ops-grid ${className}`.trim()} style={gridStyle} {...props}>
      {children}
    </div>
  );
}

export function OperationsMetric({
  label,
  value,
  hint,
  tone = "neutral",
  className = ""
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "navy" | "success" | "warning" | "danger";
  className?: string;
}) {
  return (
    <div className={`ops-metric ops-metric--${tone} ${className}`.trim()}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function OperationsTimeline({
  children,
  className = "",
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={`ops-timeline ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function OperationsTimelineItem({
  marker,
  title,
  meta,
  children,
  className = ""
}: {
  marker?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <article className={`ops-timeline__item ${className}`.trim()}>
      <span className="ops-timeline__marker" aria-hidden="true">{marker}</span>
      <div className="ops-timeline__body">
        <div className="ops-timeline__title">
          <strong>{title}</strong>
          {meta && <span>{meta}</span>}
        </div>
        {children}
      </div>
    </article>
  );
}

type OperationsStage = {
  code: ReactNode;
  label: ReactNode;
  state: "done" | "current" | "upcoming";
  caption?: ReactNode;
};

export function OperationsStagePath({
  stages,
  className = "",
  ...props
}: ComponentPropsWithoutRef<"ol"> & { stages: OperationsStage[] }) {
  return (
    <ol className={`ops-stage-path ${className}`.trim()} {...props}>
      {stages.map((stage, index) => (
        <li
          className={`ops-stage-path__item ops-stage-path__item--${stage.state}`}
          key={index}
          aria-current={stage.state === "current" ? "step" : undefined}
        >
          <span className="ops-stage-path__code" dir="ltr">{stage.code}</span>
          <span className="ops-stage-path__copy">
            <strong>{stage.label}</strong>
            {stage.caption && <small>{stage.caption}</small>}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function OperationsFormSection({
  title,
  description,
  children,
  className = "",
  ...props
}: ComponentPropsWithoutRef<"fieldset"> & { title: ReactNode; description?: ReactNode }) {
  return (
    <fieldset className={`ops-form-section ${className}`.trim()} {...props}>
      <legend>
        <span>{title}</span>
        {description && <small>{description}</small>}
      </legend>
      {children}
    </fieldset>
  );
}

type RegisterProps = ComponentPropsWithoutRef<"div"> & {
  columns?: string;
  head?: ReactNode;
};

export function Register({ columns, head, children, className = "", style, ...props }: RegisterProps) {
  const registerStyle = {
    ...(columns ? { "--ops-register-cols": columns } : {}),
    ...style
  } as CSSProperties;

  return (
    <div className={`ops-register ${className}`.trim()} style={registerStyle} {...props}>
      {head && <div className="ops-register__head">{head}</div>}
      {children}
    </div>
  );
}

export function RegisterRow({
  children,
  className = "",
  ...props
}: ComponentPropsWithoutRef<"article">) {
  return (
    <article className={`ops-register__row ${className}`.trim()} {...props}>
      {children}
    </article>
  );
}

export function RegisterCell({
  label,
  children,
  className = "",
  ...props
}: ComponentPropsWithoutRef<"div"> & { label?: ReactNode }) {
  return (
    <div className={`ops-register__cell ${className}`.trim()} data-label={typeof label === "string" ? label : undefined} {...props}>
      {label && <span className="ops-register__mobile-label">{label}</span>}
      {children}
    </div>
  );
}

export function MetaRow({ items, className = "" }: { items: Array<{ label: ReactNode; value: ReactNode }>; className?: string }) {
  return (
    <dl className={`ops-meta-row ${className}`.trim()}>
      {items.map((item, index) => (
        <div key={index}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
