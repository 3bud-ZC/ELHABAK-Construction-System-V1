/**
 * ELHABAK "From Vision to Reality" — signature full-width scene.
 *
 * One stepped pavilion silhouette — a lower solid core wing, a ground-floor
 * glass band, and a cantilevered upper volume — rendered in three states
 * across a single ground datum: blueprint linework → structural frame →
 * built glass-and-concrete form. The states share the same outline so the
 * transition reads as one continuous act of construction, not three images.
 * It deliberately speaks the same architectural language as the hero scene.
 * No text lives inside the SVG — annotation stays outside, safe to mirror.
 */
export function VisionScene() {
  const colXs = [640, 780, 920, 1060];
  const bayXs = [700, 860, 1020, 1180, 1300];
  const finXs = [1150, 1230, 1310];
  const mullionXs = [1140, 1200, 1260, 1320];

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
        <radialGradient id="vsGlow" cx="76%" cy="48%" r="48%">
          <stop offset="0%" stopColor="#2a5580" stopOpacity="0.5" />
          <stop offset="60%" stopColor="#16304f" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#16304f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="vsGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#33547e" />
          <stop offset="50%" stopColor="#1b3050" />
          <stop offset="100%" stopColor="#0c1a2e" />
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
          <stop offset="0%" stopColor="#f2a65a" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#f2a65a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="vsGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1830" stopOpacity="0" />
          <stop offset="100%" stopColor="#060d19" />
        </linearGradient>
        <linearGradient id="vsBuiltFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0d2038" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0d2038" stopOpacity="0" />
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
      <ellipse cx="1090" cy="250" rx="560" ry="290" fill="url(#vsGlow)" />

      {/* shared ground datum */}
      <line x1="0" y1="448" x2="1440" y2="448" stroke="#3f6ea3" strokeOpacity="0.5" strokeWidth="1.2" />
      <line x1="0" y1="448" x2="380" y2="448" stroke="#6fb3e8" strokeOpacity="0.3" strokeDasharray="10 8" />
      <rect y="448" width="1440" height="112" fill="url(#vsGround)" />

      {/* ================================================================
          BLUEPRINT — the full silhouette as drafting linework, legible on
          the left and dissolving as structure and material take over.
          ================================================================ */}
      <g className="vision-blueprint" stroke="#6fb3e8" fill="none">
        {/* pavilion outline: core wing step → cantilever roof → down to datum */}
        <path
          d="M380 448 V304 H560 V232 H1380 V448"
          strokeWidth="1.3"
          strokeDasharray="7 5"
          strokeOpacity="0.8"
        />
        {/* floor separation inside the upper volume + ground band top */}
        <line x1="560" y1="348" x2="1380" y2="348" strokeWidth="1" strokeDasharray="6 5" strokeOpacity="0.55" />
        {/* bay lines through the silhouette */}
        {bayXs.map((x) => (
          <line key={x} x1={x} y1="232" x2={x} y2="448" strokeWidth="0.9" strokeDasharray="3 5" strokeOpacity="0.4" />
        ))}
        {/* core wing face divisions */}
        <g strokeWidth="0.9" strokeDasharray="3 5" strokeOpacity="0.4">
          <line x1="440" y1="304" x2="440" y2="448" />
          <line x1="500" y1="304" x2="500" y2="448" />
          <line x1="380" y1="376" x2="560" y2="376" />
        </g>
        {/* small plan footprint lower-left — plan → elevation reading */}
        <g strokeWidth="1" strokeDasharray="5 4" strokeOpacity="0.45">
          <rect x="96" y="368" width="210" height="80" />
          <line x1="96" y1="408" x2="306" y2="408" />
          <line x1="166" y1="368" x2="166" y2="448" />
        </g>
      </g>

      {/* one dimension rail — ticks at roof / floor separation / datum */}
      <g className="vision-blueprint" stroke="#6fb3e8" strokeWidth="1" fill="none" strokeOpacity="0.7">
        <line x1="352" y1="448" x2="352" y2="232" markerStart="url(#vsTick)" markerEnd="url(#vsTick)" />
        <line x1="352" y1="232" x2="380" y2="232" strokeOpacity="0.4" />
        <line x1="352" y1="348" x2="380" y2="348" strokeOpacity="0.4" strokeDasharray="3 3" />
        <line x1="352" y1="448" x2="380" y2="448" strokeOpacity="0.4" />
      </g>

      {/* ================================================================
          STRUCTURE — columns, beams and slabs matching the silhouette,
          building the middle of the same outline.
          ================================================================ */}
      <g className="vision-structure">
        <g stroke="#9db9d8" strokeWidth="1.5" fill="rgba(255,255,255,0.045)">
          {/* roof + floor beams inside the upper volume */}
          <rect x="560" y="232" width="820" height="8" />
          <rect x="560" y="340" width="820" height="8" />
          {/* ground band top beam + base */}
          <rect x="380" y="440" width="1000" height="8" />
          <rect x="380" y="296" width="180" height="8" />
          {/* core wing columns */}
          <rect x="380" y="304" width="9" height="136" />
          <rect x="551" y="232" width="9" height="208" />
          {/* upper-volume + ground columns on the shared bays */}
          {colXs.map((x) => (
            <rect key={x} x={x} y="240" width="9" height="200" />
          ))}
        </g>
        {/* dashed structural grid through the frame zone */}
        <g stroke="#6fb3e8" strokeWidth="0.9" strokeDasharray="2 5" strokeOpacity="0.4" fill="none">
          <line x1="560" y1="286" x2="1380" y2="286" />
          <line x1="380" y1="396" x2="1380" y2="396" />
        </g>
        {/* controlled connection nodes — three only */}
        <g fill="#e87625">
          <circle cx="644.5" cy="344" r="3.4" />
          <circle cx="924.5" cy="344" r="3.4" />
          <circle cx="555.5" cy="236" r="3.4" />
        </g>
      </g>

      {/* ================================================================
          BUILT FORM — the right portion of the same silhouette becomes
          solid: deep glass, concrete frame bands, fins, restrained warmth.
          ================================================================ */}
      <g className="vision-built">
        {/* upper curtain wall over the last three bays */}
        <rect x="1060" y="240" width="320" height="108" fill="url(#vsGlass)" />
        {/* cool reflection sweep */}
        <polygon points="1100,240 1170,240 1130,348 1080,348" fill="#7fb2e5" opacity="0.07" />
        {/* concrete frame bands + end wall */}
        <rect x="1060" y="232" width="320" height="10" fill="url(#vsConcrete)" />
        <rect x="1060" y="340" width="320" height="9" fill="#3c4a68" />
        <rect x="1330" y="232" width="50" height="117" fill="url(#vsConcrete)" />
        {/* vertical fins */}
        <g fill="#48577a" opacity="0.9">
          {finXs.map((x) => (
            <rect key={x} x={x} y="240" width="6" height="100" />
          ))}
        </g>
        {/* ground glass band under the cantilever */}
        <rect x="1060" y="349" width="320" height="91" fill="url(#vsGlass)" opacity="0.9" />
        <g stroke="#0a1524" strokeOpacity="0.5" strokeWidth="1.2">
          {mullionXs.map((x) => (
            <line key={x} x1={x} y1="349" x2={x} y2="440" />
          ))}
          <line x1="1060" y1="394" x2="1380" y2="394" />
        </g>
        {/* roofline highlight */}
        <line x1="560" y1="231" x2="1380" y2="231" stroke="#a8c8ea" strokeOpacity="0.35" strokeWidth="1" />
        {/* material transition — built face dissolves into the frame zone */}
        <rect x="1020" y="232" width="60" height="216" fill="url(#vsBuiltFade)" />
      </g>

      {/* selected warm light — entrance plus one occupied bay only */}
      <g className="vision-lights">
        <rect x="1150" y="382" width="52" height="58" fill="url(#vsLit)" opacity="0.8" />
        <rect x="1250" y="360" width="34" height="34" fill="url(#vsLit)" opacity="0.4" />
        <ellipse cx="1176" cy="444" rx="90" ry="20" fill="url(#vsLobby)" />
      </g>
    </svg>
  );
}
