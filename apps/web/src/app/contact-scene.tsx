/**
 * ELHABAK contact closing scene — restrained architectural silhouette.
 *
 * A layered blue-hour skyline crop: near-black building masses, a faint
 * structural grid fading into the sky, and a sparse scatter of warm lit
 * windows. Deliberately darker and quieter than the hero so the closing
 * statement carries the section. No text inside — safe to mirror in RTL.
 */
export function ContactScene() {
  return (
    <svg
      viewBox="0 0 1440 420"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="csSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1830" />
          <stop offset="60%" stopColor="#081222" />
          <stop offset="100%" stopColor="#050b16" />
        </linearGradient>
        <radialGradient id="csGlow" cx="30%" cy="78%" r="55%">
          <stop offset="0%" stopColor="#274d75" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#274d75" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="csWarm" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f2a65a" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#f2a65a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="csFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#081222" stopOpacity="1" />
          <stop offset="100%" stopColor="#081222" stopOpacity="0" />
        </linearGradient>
        <pattern id="csGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="#4d7fb3" strokeOpacity="0.05" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width="1440" height="420" fill="url(#csSky)" />
      <rect width="1440" height="420" fill="url(#csGrid)" />
      <ellipse cx="430" cy="330" rx="560" ry="240" fill="url(#csGlow)" />
      {/* sky fade so the section header above stays readable */}
      <rect width="1440" height="150" fill="url(#csFade)" />

      {/* far skyline — thin drafting silhouettes */}
      <g stroke="#31567e" strokeOpacity="0.4" fill="none" strokeWidth="1">
        <path d="M60 420 V250 h52 V420" strokeDasharray="6 5" />
        <path d="M160 420 V300 h70 V420" />
        <path d="M1240 420 V270 h60 V420" strokeDasharray="6 5" />
        <path d="M1340 420 V320 h50 V420" />
        <path d="M700 420 V240 h44 V420" strokeOpacity="0.3" />
        <line x1="182" y1="300" x2="182" y2="272" strokeOpacity="0.4" />
        <line x1="722" y1="240" x2="722" y2="208" strokeOpacity="0.3" />
      </g>

      {/* mid masses — dark filled blocks */}
      <g fill="#0c1930" stroke="#22365a" strokeWidth="1">
        <path d="M300 420 V300 h90 V420 Z" />
        <path d="M390 420 V260 h70 V420 Z" />
        <path d="M1020 420 V290 h84 V420 Z" />
        <path d="M1104 420 V250 h60 V420 Z" />
      </g>
      {/* mid lit windows */}
      <g fill="#f7b16a">
        <rect x="316" y="316" width="12" height="16" opacity="0.7" />
        <rect x="348" y="344" width="12" height="16" opacity="0.5" />
        <rect x="404" y="280" width="12" height="16" opacity="0.85" />
        <rect x="424" y="312" width="12" height="16" opacity="0.45" />
        <rect x="1036" y="310" width="12" height="16" opacity="0.7" />
        <rect x="1068" y="342" width="12" height="16" opacity="0.5" />
        <rect x="1120" y="270" width="12" height="16" opacity="0.9" />
        <rect x="1140" y="306" width="12" height="16" opacity="0.4" />
      </g>

      {/* hero foreground mass — tall near-black façade, right of center */}
      <g>
        <path d="M560 420 V180 h140 V420 Z" fill="#081020" stroke="#1d3050" strokeWidth="1.2" />
        {/* façade mullion hint */}
        <g stroke="#26466e" strokeOpacity="0.5" strokeWidth="0.8">
          <line x1="560" y1="220" x2="700" y2="220" />
          <line x1="560" y1="260" x2="700" y2="260" />
          <line x1="560" y1="300" x2="700" y2="300" />
          <line x1="560" y1="340" x2="700" y2="340" />
          <line x1="560" y1="380" x2="700" y2="380" />
          <line x1="595" y1="180" x2="595" y2="420" />
          <line x1="630" y1="180" x2="630" y2="420" />
          <line x1="665" y1="180" x2="665" y2="420" />
        </g>
        <g fill="#f7b16a">
          <rect x="600" y="228" width="26" height="24" opacity="0.85" />
          <rect x="638" y="268" width="26" height="24" opacity="0.5" />
          <rect x="565" y="308" width="26" height="24" opacity="0.75" />
          <rect x="638" y="348" width="26" height="24" opacity="0.9" />
          <rect x="600" y="388" width="26" height="24" opacity="0.55" />
        </g>
        <ellipse cx="630" cy="410" rx="150" ry="26" fill="url(#csWarm)" />
      </g>

      {/* left foreground slab */}
      <g>
        <path d="M0 420 V330 h120 V420 Z" fill="#07101e" stroke="#1b2c48" strokeWidth="1" />
        <g stroke="#24466e" strokeOpacity="0.4" strokeWidth="0.8">
          <line x1="0" y1="360" x2="120" y2="360" />
          <line x1="0" y1="390" x2="120" y2="390" />
          <line x1="40" y1="330" x2="40" y2="420" />
          <line x1="80" y1="330" x2="80" y2="420" />
        </g>
        <rect x="48" y="366" width="24" height="20" fill="#f7b16a" opacity="0.6" />
      </g>

      {/* right foreground mass */}
      <g>
        <path d="M1300 420 V340 h140 V420 Z" fill="#07101e" stroke="#1b2c48" strokeWidth="1" />
        <rect x="1330" y="360" width="26" height="20" fill="#f7b16a" opacity="0.55" />
        <rect x="1380" y="384" width="26" height="20" fill="#f7b16a" opacity="0.4" />
      </g>

      {/* construction accent — one thin orange survey line with node */}
      <g stroke="#e87625" strokeOpacity="0.8" fill="none">
        <line x1="560" y1="180" x2="560" y2="120" strokeWidth="1.2" strokeDasharray="3 4" />
        <circle cx="560" cy="116" r="3" fill="#e87625" stroke="none" />
      </g>
    </svg>
  );
}
