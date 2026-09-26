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
