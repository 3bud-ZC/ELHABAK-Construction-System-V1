"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";

type HeroState = {
  key: "design" | "execution" | "delivery";
  image: string;
  label: string;
};

type HeroStat = {
  value: string;
  label: string;
};

type PublicHeroProps = {
  states: HeroState[];
  children: ReactNode;
  railEnd: string;
  scopeIndex: string;
  scopeTitle: string;
  scopeText: string;
  alt: string;
  tag?: string;
  sideLabel?: string;
  stats?: readonly HeroStat[];
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
  stats
}: PublicHeroProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setActive((value) => (value + 1) % states.length);
    }, STATE_MS);
    return () => window.clearInterval(timer);
  }, [states.length]);

  return (
    <section className="hero">
      <div className="container hero-layout">
        <div className="hero-copy">
          {tag && (
            <div className="hero-tag">
              <span className="hero-tag__bar" aria-hidden="true" />
              <span className="hero-tag__text">{tag}</span>
            </div>
          )}
          {children}
          {stats && stats.length > 0 && (
            <div className="hero-stats">
              {stats.map((stat) => (
                <div className="hero-stat" key={stat.label}>
                  <strong className="hero-stat__value">{stat.value}</strong>
                  <span className="hero-stat__label">{stat.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop & Mobile Hero Visual Frame matching the target mockup */}
        <div className="hero-visual-frame" aria-hidden="true">
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
                  sizes="(max-width: 980px) 100vw, 50vw"
                />
              </div>
            ))}
            <div className="hero-watermark-corner">
              <span>BUILDING</span>
              <span>BETTER</span>
              <span>TOMORROW</span>
            </div>
          </div>
        </div>
      </div>

      {sideLabel && (
        <aside className="hero-side-rail" aria-hidden="true">
          <div className="hero-side-rail__indices">
            {states.map((_, i) => (
              <span
                key={i}
                className={`hero-side-rail__num${i === active ? " is-active" : ""}`}
                onClick={() => setActive(i)}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            ))}
          </div>
          <div className="hero-side-rail__text">
            <span>{sideLabel}</span>
          </div>
        </aside>
      )}

      {(scopeIndex || scopeTitle || scopeText) && (
        <aside className="hero-scope" aria-hidden="true">
          {scopeIndex && <span className="hero-scope__index">{scopeIndex}</span>}
          {scopeTitle && <strong className="hero-scope__title">{scopeTitle}</strong>}
          {scopeText && <p className="hero-scope__text">{scopeText}</p>}
        </aside>
      )}

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
              {state.label}
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
