import { companySocialProfiles, type SocialProfile } from "@elhabak/contracts";
import type { Locale } from "../i18n/translations";

/* Monochrome 24px stroke glyphs, matching the lucide icon set used across the site. */
function SocialGlyph({ id }: { id: SocialProfile["id"] }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false
  };
  if (id === "instagram") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17.5 6.5h.01" />
      </svg>
    );
  }
  if (id === "tiktok") {
    return (
      <svg {...common}>
        <path d="M21 7.917v4.034a9.948 9.948 0 0 1-5-1.951v4.5a6.5 6.5 0 1 1-8-6.326v4.326a2.5 2.5 0 1 0 4 2v-11.5h4.083a6.005 6.005 0 0 0 4.917 4.917z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

type SocialLinksProps = {
  locale: Locale;
  /** "footer" sits on the dark footer, "contact" on the dark contact band. */
  variant?: "footer" | "contact";
  /** Visible heading for the row; omitted when the surrounding column already names it. */
  title?: string;
};

/** The three official ELHABAK profiles as labelled, keyboard-reachable external links. */
export function SocialLinks({ locale, variant = "footer", title }: SocialLinksProps) {
  const ar = locale === "ar";
  const listLabel = ar ? "حسابات الحباك على وسائل التواصل الاجتماعي" : "ELHABAK on social media";
  return (
    <div className={`social-links social-links--${variant}`}>
      {title ? <span className="social-links__title">{title}</span> : null}
      <ul className="social-links__list" aria-label={listLabel}>
        {companySocialProfiles.map((profile) => (
          <li key={profile.id}>
            <a
              className={`social-links__link social-links__link--${profile.id}`}
              href={profile.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={ar ? `${profile.name} — الحباك (يفتح في نافذة جديدة)` : `ELHABAK on ${profile.name} (opens in a new tab)`}
            >
              <SocialGlyph id={profile.id} />
              <span className="social-links__name" dir="ltr">{profile.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
