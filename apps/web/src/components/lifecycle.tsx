"use client";

import { LIFECYCLE_PHASES, phaseLabel, type ProjectPhase } from "../lib/api";

type LifecycleProps = {
  phase: ProjectPhase;
  locale: "ar" | "en";
};

export function Lifecycle({ phase, locale }: LifecycleProps) {
  const currentIndex = LIFECYCLE_PHASES.indexOf(phase);
  const ar = locale === "ar";
  const statusLabels = ar
    ? { done: "مكتمل", current: "المرحلة الحالية", upcoming: "قادمة", title: "مسار التسليم الهندسي" }
    : { done: "Completed", current: "Current phase", upcoming: "Upcoming", title: "Engineering delivery sequence" };

  return (
    <section className="lifecycle-control" aria-label={statusLabels.title}>
      <div className="delivery-path__heading"><strong>{statusLabels.title}</strong><span>{statusLabels.current}: {phaseLabel(phase, locale)}</span></div>
      <ol className="delivery-path">
        {LIFECYCLE_PHASES.map((step, index) => {
          const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
          return (
            <li className={`delivery-path__stage delivery-path__stage--${state}`} key={step} aria-current={state === "current" ? "step" : undefined}>
              <div className="delivery-path__rail" aria-hidden="true"><span className="delivery-path__number" dir="ltr">{String(index + 1).padStart(2, "0")}</span></div>
              <div className="delivery-path__info"><strong>{phaseLabel(step, locale)}</strong><small>{statusLabels[state]}</small></div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
