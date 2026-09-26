"use client";

import { LIFECYCLE_PHASES, phaseLabel, type ProjectPhase } from "../lib/api";
import { OperationsStagePath } from "@elhabak/ui";

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
      <OperationsStagePath
        className="delivery-path"
        stages={LIFECYCLE_PHASES.map((step, index) => {
          const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
          return {
            code: String(index + 1).padStart(2, "0"),
            label: phaseLabel(step, locale),
            state,
            caption: statusLabels[state]
          };
        })}
      />
    </section>
  );
}
