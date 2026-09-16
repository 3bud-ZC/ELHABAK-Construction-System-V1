/**
 * ELHABAK contact closing scene — restrained architectural silhouette.
 *
 * One coherent stepped pavilion profile at blue hour — a low solid wing,
 * a glass band, and a cantilevered upper volume — echoing the hero and
 * vision scenes. Sparse warm openings and a single survey datum keep it
 * quiet so the closing statement carries the section. No text inside —
 * safe to mirror in RTL.
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
        <linearGradient id="csGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1b3050" />
          <stop offset="100%" stopColor="#0a1526" />
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

      {/* one coherent stepped silhouette, right of center — the same
          pavilion profile the hero and vision scenes draw */}
      <g>
        {/* ground band */}
        <path d="M520 420 V330 H1300 V420 Z" fill="#081020" stroke="#1d3050" strokeWidth="1.2" />
        {/* cantilevered upper volume */}
        <path d="M660 330 V212 H1360 V330 Z" fill="url(#csGlass)" stroke="#26466e" strokeWidth="1.1" />
        {/* solid core wing stepping down at the left */}
        <path d="M520 330 V262 H660 V330 Z" fill="#0c1930" stroke="#22365a" strokeWidth="1" />
        {/* curtain mullions */}
        <g stroke="#26466e" strokeOpacity="0.45" strokeWidth="0.8">
          <line x1="660" y1="270" x2="1360" y2="270" />
          <line x1="720" y1="212" x2="720" y2="330" />
          <line x1="830" y1="212" x2="830" y2="330" />
          <line x1="940" y1="212" x2="940" y2="330" />
          <line x1="1050" y1="212" x2="1050" y2="330" />
          <line x1="1160" y1="212" x2="1160" y2="330" />
          <line x1="1270" y1="212" x2="1270" y2="330" />
          <line x1="580" y1="330" x2="580" y2="420" />
          <line x1="700" y1="330" x2="700" y2="420" />
          <line x1="880" y1="330" x2="880" y2="420" />
          <line x1="1060" y1="330" x2="1060" y2="420" />
          <line x1="1240" y1="330" x2="1240" y2="420" />
        </g>
        {/* sparse warm openings — entrance + two bays */}
        <g fill="#f7b16a">
          <rect x="960" y="368" width="44" height="52" opacity="0.8" />
          <rect x="1080" y="238" width="30" height="30" opacity="0.5" />
          <rect x="560" y="352" width="26" height="30" opacity="0.35" />
        </g>
        {/* horizon / contact glow at the entrance */}
        <ellipse cx="982" cy="414" rx="170" ry="26" fill="url(#csWarm)" />
      </g>

      {/* purposeful construction datum — one survey line with node */}
      <g stroke="#e87625" strokeOpacity="0.75" fill="none">
        <line x1="1360" y1="212" x2="1360" y2="148" strokeWidth="1.2" strokeDasharray="3 4" />
        <line x1="1346" y1="212" x2="1360" y2="212" strokeWidth="1" />
        <circle cx="1360" cy="144" r="3" fill="#e87625" stroke="none" />
      </g>
    </svg>
  );
}
