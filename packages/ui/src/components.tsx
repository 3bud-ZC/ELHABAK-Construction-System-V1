import type { ComponentPropsWithoutRef, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

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
