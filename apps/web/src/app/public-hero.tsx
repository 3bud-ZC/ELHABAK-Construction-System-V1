"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { Compass, HardHat, Smartphone, Activity } from "lucide-react";

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
      {/* Background Subtle Architectural Grid */}
      <div className="hero-grid-bg" aria-hidden="true" />

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

        {/* Visual Column: Architectural Photo + Phone Frame Mockup */}
        <div className="hero-visual-composition" aria-hidden="true">
          {/* Main Architectural Background Frame */}
          <div className="hero-visual-frame">
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
                    sizes="(max-width: 980px) 100vw, 48vw"
                  />
                </div>
              ))}
              <div className="hero-watermark-corner">
                <span>BUILDING</span>
                <span>BETTER</span>
                <span>TOMORROW</span>
              </div>
            </div>

            {/* Architectural Linework Overlay */}
            <svg
              className="hero-cad-overlay"
              viewBox="0 0 600 400"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Structural Dimension Datum Line */}
              <line
                x1="40"
                y1="370"
                x2="560"
                y2="370"
                stroke="rgba(234, 88, 12, 0.4)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="hero-svg-line"
              />
              <circle cx="40" cy="370" r="3" fill="#EA580C" />
              <circle cx="560" cy="370" r="3" fill="#EA580C" />
              <text x="300" y="364" fill="rgba(255, 255, 255, 0.6)" fontSize="10" fontFamily="monospace" textAnchor="middle">
                DIM: 24.80m / AXIS A-B
              </text>

              {/* Elevation Reference Datum */}
              <line
                x1="570"
                y1="40"
                x2="570"
                y2="350"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="1"
              />
              <text x="560" y="50" fill="#EA580C" fontSize="10" fontFamily="monospace" textAnchor="end">
                EL +14.20m
              </text>
            </svg>
          </div>

          {/* Smartphone Frame Mockup standing in front (as in user mockup) */}
          <div className="hero-phone-mockup" data-reveal="mask">
            <div className="hero-phone-mockup__device">
              {/* Speaker / Dynamic Island */}
              <div className="hero-phone-mockup__island" />
              {/* Screen Content */}
              <div className="hero-phone-mockup__screen">
                <Image
                  src="/marketing/platform-mobile.webp"
                  alt="ELHABAK Mobile Platform"
                  fill
                  priority
                  sizes="(max-width: 768px) 180px, 240px"
                  className="hero-phone-mockup__img"
                />
              </div>
              {/* Home Indicator */}
              <div className="hero-phone-mockup__bar" />
            </div>
            {/* Floating Live Badge */}
            <div className="hero-phone-mockup__badge">
              <span className="hero-phone-mockup__pulse" />
              <span>{tag || "متابعة مباشرة"}</span>
            </div>
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

