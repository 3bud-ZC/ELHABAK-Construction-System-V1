"use client";

import { LIFECYCLE_PHASES, phaseLabel, type ProjectPhase } from "../lib/api";

type LifecycleProps = {
  phase: ProjectPhase;
  locale: "ar" | "en";
};

export function Lifecycle({ phase, locale }: LifecycleProps) {
  const currentIndex = LIFECYCLE_PHASES.indexOf(phase);

  return (
    <div className="lifecycle">
      {LIFECYCLE_PHASES.map((step, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
        return (
          <div className={`lifecycle-step lifecycle-step--${state}`} key={step}>
            <span className="lifecycle-step__index">{String(index + 1).padStart(2, "0")}</span>
            <span className="lifecycle-step__label">{phaseLabel(step, locale)}</span>
          </div>
        );
      })}
    </div>
  );
}
