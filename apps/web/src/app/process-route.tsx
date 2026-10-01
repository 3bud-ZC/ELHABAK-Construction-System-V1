"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BlueprintBuildSequence } from "./blueprint-art";

type ProcessStage = readonly [string, string];

type ProcessRouteProps = {
  stages: readonly ProcessStage[];
  /** One short caption per stage naming what the drawing gains at that stage. */
  layers: readonly string[];
  stageWord: string;
  boardLabel: string;
  /** Section heading, rendered in the stations column. */
  children: ReactNode;
};

/**
 * Six-stage delivery route. One axonometric project is drawn beside the stations;
 * the last stage to cross the reading line decides how far the drawing has been built.
 * Without scripts or with reduced motion the drawing stays complete (stage six).
 */
export function ProcessRoute({ stages, layers, stageWord, boardLabel, children }: ProcessRouteProps) {
  const total = stages.length;
  const [active, setActive] = useState(total);
  const [driven, setDriven] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const route = list?.closest<HTMLElement>(".process-route");
    if (!list || !route || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const stations = Array.from(list.querySelectorAll<HTMLElement>("[data-station]"));
    if (stations.length === 0) return;
    const compact = window.matchMedia("(max-width: 900px)");
    let frame = 0;
    let listening = false;

    // The reading line: the last station whose node has crossed it is the active stage.
    // Measured from positions (not crossing events) so jumps and fast flings stay correct.
    // Compact screens pin the drawing to the bottom of the viewport, so the line sits in
    // the open reading area above it and the active stage is never behind the drawing.
    const measure = () => {
      frame = 0;
      const line = window.innerHeight * (compact.matches ? 0.4 : 0.5);
      let next = 1;
      stations.forEach((station, index) => {
        if (station.getBoundingClientRect().top <= line + 1) next = index + 1;
      });
      setActive(next);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    const listen = (on: boolean) => {
      if (on === listening) return;
      listening = on;
      if (on) {
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll, { passive: true });
      } else {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      }
    };
    // Only track scrolling while the route is near the viewport.
    const observer = new IntersectionObserver(
      ([entry]) => {
        listen(Boolean(entry?.isIntersecting));
        setDriven(true);
        onScroll();
      },
      { rootMargin: "25% 0px 25% 0px" }
    );
    observer.observe(route);
    return () => {
      window.cancelAnimationFrame(frame);
      listen(false);
      observer.disconnect();
    };
  }, []);

  return (
    <div className={`process-route${driven ? " is-driven" : ""}`} data-stage={active}>
      {children}

      {/* Board + stations: a layout box only on compact screens (display: contents on the
          desktop grid), so the bottom-pinned drawing is bounded by the stations alone. */}
      <div className="process-track">
        <div className="process-board" aria-hidden="true">
          <div className="process-board__sheet">
            <div className="process-board__stage">
              <BlueprintBuildSequence className="process-board__art" />
            </div>
            <div className="process-board__legend">
              <span className="process-board__count">
                <bdi>{String(active).padStart(2, "0")}</bdi>
                <i />
                <bdi>{String(total).padStart(2, "0")}</bdi>
              </span>
              <span className="process-board__layer" key={active}>
                {layers[active - 1]}
              </span>
            </div>
          </div>
          <span className="process-board__label">{boardLabel}</span>
        </div>

        <ol className="process-stations" ref={listRef}>
          {stages.map(([title, body], index) => {
            const number = index + 1;
            const state = number === active ? "current" : number < active ? "done" : "ahead";
            return (
              <li className="process-station" key={title} data-station={number} data-state={state}>
                <button
                  type="button"
                  className="process-station__node"
                  onClick={() => setActive(number)}
                  onFocus={() => setActive(number)}
                  aria-pressed={number === active}
                  aria-label={`${stageWord} ${number}: ${title}`}
                >
                  <bdi>{String(number).padStart(2, "0")}</bdi>
                </button>
                <div className="process-station__content">
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
