"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Compass, HardHat, Smartphone, Activity } from "lucide-react";
import { BlueprintElevationAxes, BlueprintElevationDraft, ELEVATION_SURVEY_POINTS } from "./blueprint-art";

type HeroState = {
  key: "design" | "execution" | "delivery";
  label: string;
};

type CapabilitySignal = {
  title: string;
  desc: string;
};

type PublicHeroProps = {
  image: string;
  states: HeroState[];
  /** Index of the state rendered on the server and held when motion is reduced. */
  initialState?: number;
  stepperLabel: string;
  children: ReactNode;
  alt: string;
  capabilities?: readonly CapabilitySignal[];
};

const STATE_MS = 9000;
const INTRO_MS = 3200;
const MAX_TILT = 2.4;

/**
 * Homepage hero. The visual is one drawing board: a measured elevation traced over
 * the delivery photo, with the photo revealed across a section cut. The three
 * states move that cut — drawing only, half built, delivered.
 */
export function PublicHero({
  image,
  states,
  initialState = 1,
  stepperLabel,
  children,
  alt,
  capabilities
}: PublicHeroProps) {
  const [active, setActive] = useState(initialState);
  const [auto, setAuto] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Autoplay only while the hero is on screen and the visitor has not taken over.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        window.clearTimeout(timer);
        if (entry?.isIntersecting) timer = window.setTimeout(() => setAuto(true), INTRO_MS);
        else setAuto(false);
      },
      { threshold: 0.35 }
    );
    observer.observe(section);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!auto) return;
    const timer = window.setInterval(() => {
      setActive((value) => (value + 1) % states.length);
    }, STATE_MS);
    return () => window.clearInterval(timer);
  }, [auto, states.length]);

  // Pointer depth: the board tilts a couple of degrees toward the cursor.
  useEffect(() => {
    const section = sectionRef.current;
    const board = boardRef.current;
    if (!section || !board) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        board.style.setProperty("--tilt-y", (x * MAX_TILT * 2).toFixed(2));
        board.style.setProperty("--tilt-x", (-y * MAX_TILT * 2).toFixed(2));
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      board.style.setProperty("--tilt-y", "0");
      board.style.setProperty("--tilt-x", "0");
    };
    section.addEventListener("pointermove", onMove, { passive: true });
    section.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const select = (index: number) => {
    setAuto(false);
    setActive(index);
  };

  const capabilityIcons = [Compass, HardHat, Smartphone];
  const current = states[active] ?? states[0];

  return (
    <section className="hero" ref={sectionRef}>
      <div className="hero-grid-bg" aria-hidden="true" />

      <div className="container hero-layout">
        <div className="hero-copy">{children}</div>

        <div className="hero-board" ref={boardRef} data-state={current?.key}>
          <div className="hero-board__viewport" aria-hidden="true">
            <div className="hero-board__plane">
              <div className="hero-board__canvas">
                <BlueprintElevationDraft className="hero-board__draft" />
                <div className="hero-built" data-visual-role="built-reference">
                  <div className="hero-built__reveal">
                    <div className="hero-built__ground">
                      <Image
                        src={image}
                        alt=""
                        fill
                        priority
                        sizes="(max-width: 640px) 150vw, (max-width: 980px) 92vw, 56vw"
                        className="hero-built__img"
                      />
                    </div>
                  </div>
                </div>
                {ELEVATION_SURVEY_POINTS.map((point, index) => (
                  <i
                    className="hero-survey-point"
                    key={point.left}
                    style={{ left: point.left, top: point.top, animationDelay: `${index * 1.6 + 2.4}s` }}
                  />
                ))}
                <span className="hero-cut">
                  <i className="hero-cut__mark hero-cut__mark--top" />
                  <i className="hero-cut__mark hero-cut__mark--bottom" />
                </span>
                <BlueprintElevationAxes className="hero-board__axes" />
              </div>
            </div>
          </div>

          <div className="hero-stepper" role="group" aria-label={stepperLabel}>
            {states.map((state, index) => (
              <button
                type="button"
                className={`hero-stepper__state${index === active ? " is-active" : ""}`}
                key={state.key}
                onClick={() => select(index)}
                aria-pressed={index === active}
              >
                <span className="hero-stepper__node" aria-hidden="true" />
                <bdi className="hero-stepper__index">{String(index + 1).padStart(2, "0")}</bdi>
                <span className="hero-stepper__label">{state.label}</span>
                {index === active && auto && (
                  <i
                    className="hero-stepper__progress"
                    key={active}
                    aria-hidden="true"
                    style={{ animationDuration: `${STATE_MS}ms` }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {capabilities && capabilities.length > 0 && (
        <div className="hero-base">
          <ul className="container hero-capabilities">
            {capabilities.map((cap, idx) => {
              const IconComponent = capabilityIcons[idx] ?? Activity;
              return (
                <li className="hero-cap-item" key={cap.title}>
                  <span className="hero-cap-item__icon" aria-hidden="true">
                    <IconComponent size={18} />
                  </span>
                  <div className="hero-cap-item__text">
                    <strong className="hero-cap-item__title">{cap.title}</strong>
                    <span className="hero-cap-item__desc">{cap.desc}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <span className="sr-only">{alt}</span>
    </section>
  );
}
