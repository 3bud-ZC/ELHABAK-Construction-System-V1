"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";

type HeroState = {
  key: "design" | "execution" | "delivery";
  image: string;
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
};

const STATE_MS = 9500;

export function PublicHero({
  states,
  children,
  railEnd,
  scopeIndex,
  scopeTitle,
  scopeText,
  alt
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
      <div className="hero-media" aria-hidden="true">
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
              sizes="100vw"
            />
          </div>
        ))}
      </div>

      <div className="container hero-layout">
        <div className="hero-copy">{children}</div>
        <aside className="hero-scope">
          <div className="hero-scope__head">
            <span>{scopeIndex}</span>
            <bdi>{String(active + 1).padStart(2, "0")} / {String(states.length).padStart(2, "0")}</bdi>
          </div>
          <div className="hero-scope__body">
            <div>
              <strong>{scopeTitle}</strong>
              <p>{scopeText}</p>
            </div>
          </div>
        </aside>
      </div>

      <div className="hero-rail">
        <div className="container hero-rail__inner">
          {states.map((state, index) => (
            <span
              className={`hero-rail__state${index === active ? " is-active" : ""}`}
              key={state.key}
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
            </span>
          ))}
          <i className="hero-rail__sep" />
          <span className="hero-rail__end">{railEnd}</span>
        </div>
      </div>

      <span className="sr-only">{alt}</span>
    </section>
  );
}
