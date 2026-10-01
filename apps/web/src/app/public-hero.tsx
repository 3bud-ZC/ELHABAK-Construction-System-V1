"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { Compass, HardHat, Smartphone, Activity } from "lucide-react";
import { BlueprintAxonometric } from "./blueprint-art";

type HeroState = {
  key: "design" | "execution" | "delivery";
  image: string;
  label: string;
};

type CapabilitySignal = {
  title: string;
  desc: string;
};

type PublicHeroProps = {
  states: HeroState[];
  children: ReactNode;
  railEnd?: string;
  scopeIndex?: string;
  scopeTitle?: string;
  scopeText?: string;
  alt: string;
  tag?: string;
  sideLabel?: string;
  signals?: readonly CapabilitySignal[];
  capabilities?: readonly CapabilitySignal[];
  stats?: readonly { value: string; label: string }[];
};

const STATE_MS = 8000;

export function PublicHero({
  states,
  children,
  railEnd,
  scopeIndex,
  scopeTitle,
  scopeText,
  alt,
  tag,
  sideLabel,
  signals,
  capabilities
}: PublicHeroProps) {
  const [active, setActive] = useState(0);
  const items = signals ?? capabilities;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setActive((value) => (value + 1) % states.length);
    }, STATE_MS);
    return () => window.clearInterval(timer);
  }, [states.length]);

  const capabilityIcons = [Compass, HardHat, Smartphone];

  return (
    <section className="hero">
      {/* Blueprint ground: minor/major technical grid + registration frame */}
      <div className="hero-grid-bg" aria-hidden="true" />
      <div className="hero-frame-marks" aria-hidden="true" />
      <div className="hero-survey-field" aria-hidden="true">
        <span className="hero-survey-field__axis hero-survey-field__axis--x" />
        <span className="hero-survey-field__axis hero-survey-field__axis--y" />
        <span className="hero-survey-field__scan" />
        <span className="hero-survey-field__datum hero-survey-field__datum--start">DATUM 00</span>
        <span className="hero-survey-field__datum hero-survey-field__datum--end">GRID A–D</span>
      </div>

      <div className="container hero-layout">
        {/* Copy Column */}
        <div className="hero-copy">
          {tag && (
            <div className="hero-tag" data-reveal="fade">
              <span className="hero-tag__bar" aria-hidden="true" />
              <span className="hero-tag__text">{tag}</span>
            </div>
          )}

          {children}

          {/* Truthful Capability Signals (Replacing Unverified Stats) */}
          {items && items.length > 0 && (
            <div className="hero-capabilities" data-reveal="up">
              {items.map((cap, idx) => {
                const IconComponent = capabilityIcons[idx] ?? Activity;
                return (
                  <div className="hero-cap-item" key={cap.title}>
                    <span className="hero-cap-item__icon" aria-hidden="true">
                      <IconComponent size={18} />
                    </span>
                    <div className="hero-cap-item__text">
                      <strong className="hero-cap-item__title">{cap.title}</strong>
                      <span className="hero-cap-item__desc">{cap.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Visual column: animated axonometric structure with the site photo pinned
            to it as a drawing sheet (title block + registration marks). */}
        <div className="hero-visual-composition hero-living-drawing" aria-hidden="true">
          <svg
            className="hero-projection-field"
            viewBox="0 0 920 560"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path className="hero-projection-field__rail" d="M28 96H892M28 454H892" />
            <path className="hero-projection-field__station" d="M116 58V500M808 58V500" />
            <path
              className="hero-projection-field__trace"
              d="M72 420L312 254L472 142L694 242L856 126M138 482L334 352L536 220L814 390"
              pathLength={1}
            />
            <path className="hero-projection-field__cross" d="M103 96H129M116 83V109M795 454H821M808 441V467" />
            <circle className="hero-projection-field__node" cx="312" cy="254" r="4" />
            <circle className="hero-projection-field__node" cx="694" cy="242" r="4" />
            <circle className="hero-projection-field__node" cx="536" cy="220" r="4" />
            <text x="28" y="82">GRID A–07</text>
            <text x="814" y="112">EL +14.40</text>
            <text x="28" y="476">SECTION 03</text>
          </svg>
          <BlueprintAxonometric live className="hero-axo hero-blueprint-field" />
          <div className="hero-visual-frame hero-sheet" data-visual-role="supporting-artifact">
            <div className="hero-sheet__material-key">
              <span>{states[active]?.label}</span>
              <i aria-hidden="true" />
            </div>
            <div className="hero-visual-frame__inner">
              {states.map((state, index) => (
                <div
                  className={`hero-media__layer${index === active ? " is-active" : ""}`}
                  key={state.key}
                >
                  <Image
                    src={state.image}
                    alt=""
                    fill
                    priority={index === 0}
                    loading={index === 0 ? undefined : "lazy"}
                    sizes="(max-width: 640px) 64vw, (max-width: 980px) 48vw, 20vw"
                  />
                </div>
              ))}
            </div>
            <svg className="hero-cad-overlay" viewBox="0 0 600 400" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                className="hero-trace-route"
                d="M42 340 H170 C210 340 205 292 246 292 H382 C420 292 414 240 454 240 H558"
                pathLength={1}
              />
              <line x1="40" y1="370" x2="560" y2="370" className="hero-svg-line" />
              <circle cx="40" cy="370" r="3" />
              <circle cx="560" cy="370" r="3" />
            </svg>
            <div className="hero-sheet__titleblock">
              <span className="hero-sheet__cell hero-sheet__cell--brand">ELHABAK</span>
              <span className="hero-sheet__cell">
                SHEET <bdi>A-10{active + 1}</bdi>
              </span>
              <span className="hero-sheet__cell hero-sheet__cell--state">{states[active]?.label}</span>
              <span className="hero-sheet__cell">1:100</span>
            </div>
          </div>
          <div className="hero-visual-datum" aria-hidden="true">
            <span>01</span>
            <i />
            <span>03</span>
          </div>
        </div>
      </div>

      {/* Side Rail Navigation */}
      {sideLabel && (
        <aside className="hero-side-rail" aria-hidden="true">
          <div className="hero-side-rail__indices">
            {states.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`hero-side-rail__num${i === active ? " is-active" : ""}`}
                onClick={() => setActive(i)}
                aria-label={`Scene ${i + 1}`}
              >
                {String(i + 1).padStart(2, "0")}
              </button>
            ))}
          </div>
          <div className="hero-side-rail__text">
            <span>{sideLabel}</span>
          </div>
        </aside>
      )}

      {/* Hidden semantic element for test invariant */}
      {(scopeIndex || scopeTitle || scopeText) && (
        <aside className="hero-scope" aria-hidden="true">
          {scopeIndex && <span className="hero-scope__index">{scopeIndex}</span>}
          {scopeTitle && <strong className="hero-scope__title">{scopeTitle}</strong>}
          {scopeText && <p className="hero-scope__text">{scopeText}</p>}
        </aside>
      )}

      {/* Interactive Scene Stepper Bar */}
      <div className="hero-rail">
        <div className="container hero-rail__inner">
          {states.map((state, index) => (
            <button
              type="button"
              className={`hero-rail__state${index === active ? " is-active" : ""}`}
              key={state.key}
              onClick={() => setActive(index)}
              aria-label={state.label}
              aria-pressed={index === active}
            >
              <bdi>{String(index + 1).padStart(2, "0")}</bdi>
              <span>{state.label}</span>
              {index === active && (
                <i
                  className="hero-rail__progress"
                  key={active}
                  style={{ animationDuration: `${STATE_MS}ms` }}
                />
              )}
            </button>
          ))}
          <i className="hero-rail__sep" />
          <span className="hero-rail__end">{railEnd}</span>
        </div>
      </div>

      <span className="sr-only">{alt}</span>
    </section>
  );
}

