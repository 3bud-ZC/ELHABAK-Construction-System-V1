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
      <div className="lifecycle-pipeline__summary">
        <div><span>{statusLabels.title}</span><strong>{phaseLabel(phase, locale)}</strong></div>
        <bdi className="mono"><span>{String(currentIndex + 1).padStart(2, "0")}</span>/06</bdi>
      </div>
      <div className="lifecycle-pipeline__track" aria-hidden="true" />
      <ol className="lifecycle">
        {LIFECYCLE_PHASES.map((step, index) => {
          const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
          return (
            <li className={`lifecycle-step lifecycle-step--${state}`} key={step} aria-current={state === "current" ? "step" : undefined}>
              <div className="lifecycle-step__indicator" aria-hidden="true">
                <span className="lifecycle-step__node"><bdi>{String(index + 1).padStart(2, "0")}</bdi></span>
              </div>
              <div className="lifecycle-step__body">
                <div className="lifecycle-step__meta">
                  <span className="lifecycle-step__index"><bdi>{String(index + 1).padStart(2, "0")}</bdi></span>
                  <span className="lifecycle-step__state-tag">{statusLabels[state]}</span>
                </div>
                <strong className="lifecycle-step__label">{phaseLabel(step, locale)}</strong>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
