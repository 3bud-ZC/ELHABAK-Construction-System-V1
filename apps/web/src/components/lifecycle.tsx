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
    ? { done: "مكتمل", current: "المرحلة الحالية", upcoming: "قادمة" }
    : { done: "Completed", current: "Active Phase", upcoming: "Pending" };

  return (
    <div className="lifecycle-pipeline">
      <div className="lifecycle-pipeline__track" aria-hidden="true" />
      <div className="lifecycle">
        {LIFECYCLE_PHASES.map((step, index) => {
          const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
          return (
            <div className={`lifecycle-step lifecycle-step--${state}`} key={step}>
              <div className="lifecycle-step__indicator" aria-hidden="true">
                <span className="lifecycle-step__node" />
              </div>
              <div className="lifecycle-step__body">
                <div className="lifecycle-step__meta">
                  <span className="lifecycle-step__index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="lifecycle-step__state-tag">{statusLabels[state]}</span>
                </div>
                <span className="lifecycle-step__label">{phaseLabel(step, locale)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
