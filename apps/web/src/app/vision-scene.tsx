/**
 * ELHABAK "From Vision to Reality" — signature full-width scene.
 *
 * One building silhouette rendered in three states across a single ground
 * line: blueprint wireframe → structural frame → finished glass-and-concrete
 * architecture at blue hour. The states overlap along the same outline so the
 * transition reads as one continuous act of construction, not three images.
 * All annotation text lives outside the SVG so the scene can mirror in RTL.
 */
export function VisionScene() {
  return (
    <svg
      viewBox="0 0 1440 560"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="vsSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1a30" />
          <stop offset="55%" stopColor="#0d2038" />
          <stop offset="100%" stopColor="#081324" />
        </linearGradient>
        <radialGradient id="vsGlow" cx="78%" cy="46%" r="46%">
          <stop offset="0%" stopColor="#2a5580" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#16304f" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#16304f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="vsGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3d648f" />
          <stop offset="50%" stopColor="#1e385a" />
          <stop offset="100%" stopColor="#0e2036" />
        </linearGradient>
        <linearGradient id="vsGlassDim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c4a6e" />
          <stop offset="100%" stopColor="#122741" />
        </linearGradient>
        <linearGradient id="vsLit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd9a4" />
          <stop offset="100%" stopColor="#ef9d4e" />
        </linearGradient>
        <linearGradient id="vsConcrete" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#45526e" />
          <stop offset="100%" stopColor="#222b3d" />
        </linearGradient>
        <radialGradient id="vsLobby" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f2a65a" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#f2a65a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="vsGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1830" stopOpacity="0" />
          <stop offset="100%" stopColor="#060d19" />
        </linearGradient>
        <pattern id="vsGrid" width="44" height="44" patternUnits="userSpaceOnUse">
          <path d="M44 0H0V44" fill="none" stroke="#5e9cd6" strokeOpacity="0.05" strokeWidth="1" />
        </pattern>
        <marker id="vsTick" markerWidth="8" markerHeight="8" refX="4" refY="4">
          <path d="M1 7L7 1" stroke="#6fb3e8" strokeWidth="1.2" />
        </marker>
      </defs>

      {/* atmosphere */}
      <rect width="1440" height="560" fill="url(#vsSky)" />
      <rect width="1440" height="560" fill="url(#vsGrid)" />
      <ellipse cx="1080" cy="250" rx="560" ry="290" fill="url(#vsGlow)" />

      {/* shared ground line */}
      <line x1="0" y1="448" x2="1440" y2="448" stroke="#3f6ea3" strokeOpacity="0.5" strokeWidth="1.2" />
      <line x1="0" y1="448" x2="700" y2="448" stroke="#6fb3e8" strokeOpacity="0.35" strokeDasharray="10 8" />
      <rect y="448" width="1440" height="112" fill="url(#vsGround)" />
      {/* ground reflection of lit zone */}
      <polygon points="980,448 1240,448 1290,540 930,540" fill="#f2a65a" opacity="0.05" />

      {/* ================================================================
          ZONE 1 — BLUEPRINT (left). Same silhouette, pure linework.
          ================================================================ */}
      <g stroke="#6fb3e8" fill="none">
        {/* tower outline dashed */}
        <g strokeWidth="1.3" strokeDasharray="7 5" strokeOpacity="0.85">
          <path d="M430 448 V186 H760 V448" />
          <path d="M430 186 H760" strokeDasharray="none" strokeOpacity="0.9" />
          <path d="M520 186 V148 H650 V186" strokeWidth="1.1" />
          {/* crown element */}
          <path d="M560 148 V120 H610 V148" strokeWidth="1" strokeOpacity="0.7" />
        </g>
        {/* window grid as empty rectangles */}
        <g strokeWidth="0.9" strokeOpacity="0.55">
          {Array.from({ length: 7 }).map((_, r) =>
            Array.from({ length: 5 }).map((_, c) => (
              <rect
                key={`${r}-${c}`}
                x={452 + c * 58}
                y={210 + r * 32}
                width="40"
                height="20"
              />
            ))
          )}
        </g>
        {/* structural columns hinted inside blueprint zone */}
        <g strokeWidth="1" strokeOpacity="0.4" strokeDasharray="2 5">
          <line x1="452" y1="186" x2="452" y2="448" />
          <line x1="568" y1="186" x2="568" y2="448" />
          <line x1="684" y1="186" x2="684" y2="448" />
        </g>
      </g>

      {/* blueprint dimension rails */}
      <g stroke="#6fb3e8" strokeWidth="1" fill="none" strokeOpacity="0.8">
        <line x1="400" y1="448" x2="400" y2="186" markerStart="url(#vsTick)" markerEnd="url(#vsTick)" />
        <line x1="394" y1="448" x2="430" y2="448" strokeOpacity="0.4" />
        <line x1="394" y1="186" x2="430" y2="186" strokeOpacity="0.4" />
        {/* baseline extension to left edge */}
        <line x1="60" y1="448" x2="400" y2="448" strokeDasharray="4 8" strokeOpacity="0.4" />
        {/* section marks */}
        <line x1="380" y1="120" x2="380" y2="448" strokeDasharray="10 4 2 4" strokeOpacity="0.5" />
      </g>
      {/* axis bubbles */}
      <g stroke="#6fb3e8" strokeWidth="1" fill="#0a1a30">
        <circle cx="452" cy="472" r="10" strokeOpacity="0.8" />
        <circle cx="568" cy="472" r="10" strokeOpacity="0.8" />
        <circle cx="684" cy="472" r="10" strokeOpacity="0.8" />
      </g>
      <g fontFamily="monospace" fontSize="10" fill="#8fc4ee" textAnchor="middle">
        <text x="452" y="476">A</text>
        <text x="568" y="476">B</text>
        <text x="684" y="476">C</text>
      </g>

      {/* ================================================================
          ZONE 2 — STRUCTURAL FRAME (middle). Columns, slabs, nodes.
          ================================================================ */}
      <g>
        {/* frame extends the same tower + a lower wing to the right */}
        <g stroke="#9db9d8" strokeWidth="1.6" fill="rgba(255,255,255,0.045)">
          {/* columns */}
          <rect x="752" y="186" width="10" height="262" />
          <rect x="812" y="186" width="10" height="262" />
          <rect x="872" y="186" width="10" height="262" />
          <rect x="932" y="240" width="10" height="208" />
          <rect x="992" y="240" width="10" height="208" />
          {/* slabs */}
          <rect x="752" y="240" width="250" height="9" />
          <rect x="752" y="300" width="250" height="9" />
          <rect x="752" y="360" width="250" height="9" />
          <rect x="752" y="420" width="250" height="9" />
          <rect x="752" y="186" width="120" height="9" />
        </g>
        {/* slab edges dashed continuation (wireframe remainder) */}
        <g stroke="#6fb3e8" strokeWidth="1" strokeDasharray="6 5" strokeOpacity="0.5" fill="none">
          <line x1="762" y1="214" x2="1002" y2="214" />
          <line x1="762" y1="272" x2="1002" y2="272" />
          <line x1="762" y1="332" x2="1002" y2="332" />
          <line x1="762" y1="392" x2="1002" y2="392" />
          <line x1="1002" y1="240" x2="1002" y2="448" />
        </g>
        {/* orange structural nodes at intersections */}
        <g fill="#e87625">
          <circle cx="817" cy="240" r="3.4" />
          <circle cx="877" cy="240" r="3.4" />
          <circle cx="817" cy="300" r="3.4" />
          <circle cx="877" cy="360" r="3.4" />
          <circle cx="937" cy="300" r="3.4" />
          <circle cx="997" cy="360" r="3.4" />
        </g>
        {/* diagonal bracing hint */}
        <line x1="762" y1="249" x2="872" y2="300" stroke="#9db9d8" strokeWidth="0.9" strokeOpacity="0.5" />
        <line x1="822" y1="309" x2="932" y2="360" stroke="#9db9d8" strokeWidth="0.9" strokeOpacity="0.5" />
      </g>

      {/* ================================================================
          ZONE 3 — BUILT FORM (right). Glass, concrete, warm light.
          ================================================================ */}
      <g>
        {/* main finished tower */}
        <rect x="1052" y="160" width="240" height="288" fill="url(#vsGlass)" stroke="#4a6f9c" strokeWidth="1.4" />
        {/* concrete blade on the left edge of the finished tower */}
        <rect x="1036" y="176" width="16" height="272" fill="url(#vsConcrete)" stroke="#2a3550" strokeWidth="1" />
        {/* curtain wall mullions */}
        <g stroke="#6f94bd" strokeOpacity="0.55" strokeWidth="0.8">
          {Array.from({ length: 7 }).map((_, i) => (
            <line key={`h${i}`} x1="1052" y1={200 + i * 36} x2="1292" y2={200 + i * 36} />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <line key={`v${i}`} x1={1100 + i * 48} y1="160" x2={1100 + i * 48} y2="448" />
          ))}
        </g>
        {/* lit windows — warm cells scattered across the grid */}
        <g fill="url(#vsLit)">
          <rect x="1104" y="206" width="40" height="26" opacity="0.92" />
          <rect x="1196" y="206" width="40" height="26" opacity="0.7" />
          <rect x="1056" y="242" width="40" height="26" opacity="0.55" />
          <rect x="1148" y="242" width="40" height="26" opacity="0.95" />
          <rect x="1244" y="278" width="40" height="26" opacity="0.75" />
          <rect x="1104" y="314" width="40" height="26" opacity="0.85" />
          <rect x="1196" y="314" width="40" height="26" opacity="0.5" />
          <rect x="1056" y="350" width="40" height="26" opacity="0.9" />
          <rect x="1244" y="350" width="40" height="26" opacity="0.65" />
          <rect x="1148" y="386" width="40" height="26" opacity="0.9" />
          <rect x="1104" y="422" width="40" height="20" opacity="0.7" />
        </g>
        {/* cool dim cells for variation */}
        <g fill="#a9c9e8">
          <rect x="1244" y="206" width="40" height="26" opacity="0.22" />
          <rect x="1056" y="314" width="40" height="26" opacity="0.18" />
          <rect x="1244" y="422" width="40" height="20" opacity="0.25" />
        </g>
        {/* crown / parapet */}
        <rect x="1052" y="152" width="240" height="8" fill="#32415c" />
        <rect x="1180" y="128" width="70" height="24" fill="url(#vsGlassDim)" stroke="#4a6f9c" strokeWidth="1" />
        {/* adjoining lower finished wing */}
        <rect x="1292" y="252" width="110" height="196" fill="url(#vsGlassDim)" stroke="#3c5c84" strokeWidth="1.2" />
        <g stroke="#6f94bd" strokeOpacity="0.4" strokeWidth="0.8">
          <line x1="1292" y1="300" x2="1402" y2="300" />
          <line x1="1292" y1="348" x2="1402" y2="348" />
          <line x1="1292" y1="396" x2="1402" y2="396" />
          <line x1="1328" y1="252" x2="1328" y2="448" />
          <line x1="1366" y1="252" x2="1366" y2="448" />
        </g>
        <rect x="1300" y="308" width="24" height="34" fill="url(#vsLit)" opacity="0.8" />
        <rect x="1340" y="356" width="24" height="34" fill="url(#vsLit)" opacity="0.55" />
        <rect x="1372" y="404" width="24" height="34" fill="url(#vsLit)" opacity="0.85" />
        {/* lobby glow at base */}
        <ellipse cx="1170" cy="444" rx="190" ry="34" fill="url(#vsLobby)" />
        <rect x="1052" y="424" width="240" height="24" fill="#f7b16a" opacity="0.22" />
      </g>

      {/* transition haze between zones — keeps the three states continuous */}
      <rect x="700" y="120" width="80" height="330" fill="#0d2038" opacity="0.35" />
      <rect x="990" y="150" width="70" height="300" fill="#0d2038" opacity="0.3" />

      {/* far-left + far-right faint skyline for depth */}
      <g stroke="#31567e" strokeOpacity="0.35" fill="none" strokeWidth="1">
        <path d="M40 448 V300 H96 V448 M60 300 V262 H80 V300" />
        <path d="M150 448 V340 H220 V448" strokeDasharray="5 5" />
        <path d="M250 448 V380 H310 V448" strokeOpacity="0.25" />
      </g>
      <g fill="#0f2138" stroke="#2c4a6e" strokeOpacity="0.5" strokeWidth="1">
        <path d="M1396 448 V330 H1440 V448" />
      </g>
    </svg>
  );
}
