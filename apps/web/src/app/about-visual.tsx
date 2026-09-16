/**
 * ELHABAK public About visual — original architectural drawing composition.
 *
 * "Idea → drawing → form" told in one sheet: a hand-dimensioned floor plan
 * (walls, openings, grid nodes) whose corners project upward into an
 * axonometric massing model of stacked volumes — glass face, concrete mass,
 * cantilevered slab. Oblique projection keeps it technical rather than
 * illustrative; all geometry is hand-plotted for the light section paper.
 * No readable text lives inside the sheet — labels and dimensions are drawn
 * as rails and ticks only, so nothing reads as fabricated data.
 */
export function AboutVisual() {
  return (
    <svg
      viewBox="0 0 660 540"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="avGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8fb0cc" />
          <stop offset="45%" stopColor="#5f7ea0" />
          <stop offset="100%" stopColor="#33496a" />
        </linearGradient>
        <linearGradient id="avTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f7fafc" />
          <stop offset="100%" stopColor="#d5ddea" />
        </linearGradient>
        <linearGradient id="avSide" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b4c1d4" />
          <stop offset="100%" stopColor="#7e90ab" />
        </linearGradient>
        <linearGradient id="avPaper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f3f6fa" />
        </linearGradient>
        <linearGradient id="avShadow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0c1736" stopOpacity="0" />
          <stop offset="50%" stopColor="#0c1736" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0c1736" stopOpacity="0" />
        </linearGradient>
        <pattern id="avGrid" width="22" height="22" patternUnits="userSpaceOnUse">
          <path d="M22 0H0V22" fill="none" stroke="#1c2f52" strokeOpacity="0.05" strokeWidth="1" />
        </pattern>
        <marker id="avTick" markerWidth="8" markerHeight="8" refX="4" refY="4">
          <path d="M1 7L7 1" stroke="#e87625" strokeWidth="1.4" />
        </marker>
      </defs>

      {/* drawing sheet */}
      <rect x="18" y="14" width="624" height="512" rx="4" fill="url(#avPaper)" stroke="#d7dfe9" strokeWidth="1.2" />
      <rect x="18" y="14" width="624" height="512" rx="4" fill="url(#avGrid)" />
      {/* sheet margin + title-block strip (kept blank — geometry only) */}
      <rect x="34" y="30" width="592" height="480" fill="none" stroke="#1c2f52" strokeOpacity="0.14" />
      <line x1="34" y1="474" x2="626" y2="474" stroke="#1c2f52" strokeOpacity="0.14" />
      <g stroke="#1c2f52" strokeOpacity="0.14" fill="none">
        <line x1="466" y1="474" x2="466" y2="510" />
        <line x1="546" y1="474" x2="546" y2="510" />
      </g>

      {/* ============ FLOOR PLAN (lower-left) ============ */}
      <g stroke="#1c2f52" strokeWidth="1.6" fill="none">
        {/* outer walls — double line */}
        <rect x="72" y="306" width="196" height="140" />
        <rect x="78" y="312" width="184" height="128" />
        {/* interior walls */}
        <line x1="166" y1="312" x2="166" y2="388" />
        <line x1="172" y1="312" x2="172" y2="388" />
        <line x1="172" y1="388" x2="230" y2="388" />
        <line x1="172" y1="382" x2="230" y2="382" />
        {/* door openings + swing arcs */}
        <path d="M118 440 V418" strokeWidth="1.1" />
        <path d="M118 418 A22 22 0 0 1 140 440" strokeWidth="0.9" strokeDasharray="3 3" />
        <path d="M166 340 h-24" strokeWidth="1.1" />
        <path d="M142 340 A24 24 0 0 0 166 364" strokeWidth="0.9" strokeDasharray="3 3" />
        {/* window marks on south + east walls */}
        <line x1="210" y1="440" x2="248" y2="440" strokeWidth="3" />
        <line x1="262" y1="346" x2="262" y2="384" strokeWidth="3" />
      </g>

      {/* plan dimension rail (top of plan) — ticks only, no values */}
      <g stroke="#e87625" strokeWidth="1.1" fill="none">
        <line x1="72" y1="284" x2="268" y2="284" markerStart="url(#avTick)" markerEnd="url(#avTick)" />
        <line x1="72" y1="292" x2="72" y2="306" stroke="#1c2f52" strokeOpacity="0.5" />
        <line x1="268" y1="292" x2="268" y2="306" stroke="#1c2f52" strokeOpacity="0.5" />
      </g>

      {/* plan grid nodes — plain structural intersections, no labels */}
      <g stroke="#1c2f52" strokeWidth="1" fill="#fff">
        <circle cx="72" cy="462" r="5" />
        <circle cx="170" cy="462" r="5" />
        <circle cx="268" cy="462" r="5" />
      </g>
      <g stroke="#1c2f52" strokeOpacity="0.4" strokeDasharray="2 4" fill="none">
        <line x1="72" y1="457" x2="72" y2="452" />
        <line x1="170" y1="457" x2="170" y2="452" />
        <line x1="268" y1="457" x2="268" y2="452" />
      </g>

      {/* ============ PROJECTION LINES plan → model ============ */}
      <g stroke="#e87625" strokeWidth="1" strokeDasharray="5 5" strokeOpacity="0.75" fill="none">
        <line x1="268" y1="312" x2="356" y2="236" />
        <line x1="268" y1="446" x2="356" y2="392" />
        <line x1="166" y1="306" x2="300" y2="212" />
      </g>
      <circle cx="268" cy="312" r="3" fill="#e87625" />
      <circle cx="268" cy="446" r="3" fill="#e87625" />

      {/* ============ MASSING MODEL (right) ============ */}
      {/* ground shadow */}
      <ellipse cx="452" cy="436" rx="170" ry="18" fill="url(#avShadow)" />
      {/* ground plane iso grid */}
      <g stroke="#1c2f52" strokeOpacity="0.12" strokeWidth="1" fill="none">
        <polygon points="292,392 512,392 596,436 376,436" />
        <line x1="336" y1="392" x2="420" y2="436" />
        <line x1="380" y1="392" x2="464" y2="436" />
        <line x1="424" y1="392" x2="508" y2="436" />
        <line x1="468" y1="392" x2="552" y2="436" />
        <line x1="512" y1="392" x2="596" y2="436" />
      </g>

      {/* base volume — concrete top/side planes, deep cool glass front */}
      <g>
        <polygon points="356,392 526,392 570,370 400,370" fill="url(#avTop)" stroke="#1c2f52" strokeWidth="1.4" />
        <polygon points="526,392 570,370 570,242 526,264" fill="url(#avSide)" stroke="#1c2f52" strokeWidth="1.4" />
        <polygon points="356,392 526,392 526,264 356,264" fill="url(#avGlass)" stroke="#1c2f52" strokeWidth="1.4" />
        {/* one restrained cool reflection sweep across the glass */}
        <polygon points="376,392 430,392 470,264 424,264" fill="#dbe9f5" opacity="0.22" />
        {/* front face mullions */}
        <g stroke="#16273f" strokeOpacity="0.55" strokeWidth="0.9">
          <line x1="356" y1="296" x2="526" y2="296" />
          <line x1="356" y1="328" x2="526" y2="328" />
          <line x1="356" y1="360" x2="526" y2="360" />
          <line x1="399" y1="264" x2="399" y2="392" />
          <line x1="441" y1="264" x2="441" y2="392" />
          <line x1="484" y1="264" x2="484" y2="392" />
        </g>
        {/* side face floor joints */}
        <g stroke="#1c2f52" strokeOpacity="0.4" strokeWidth="0.9">
          <line x1="526" y1="328" x2="570" y2="306" />
          <line x1="526" y1="296" x2="570" y2="274" />
          <line x1="526" y1="360" x2="570" y2="338" />
        </g>
      </g>

      {/* cantilevered slab above the glass face */}
      <g>
        <polygon points="336,238 546,238 590,216 380,216" fill="url(#avTop)" stroke="#1c2f52" strokeWidth="1.3" />
        <rect x="336" y="238" width="210" height="9" fill="#75839c" stroke="#1c2f52" strokeWidth="1.3" />
        <polygon points="546,238 590,216 590,225 546,247" fill="#97a6bc" stroke="#1c2f52" strokeWidth="1.3" />
      </g>

      {/* upper volume — solid mass w=104 h=64 depth (36,-18) */}
      <g>
        <polygon points="392,172 496,172 532,154 428,154" fill="url(#avTop)" stroke="#1c2f52" strokeWidth="1.4" />
        <polygon points="496,172 532,154 532,90 496,108" fill="url(#avSide)" stroke="#1c2f52" strokeWidth="1.4" />
        <polygon points="392,172 496,172 496,108 392,108" fill="#e9edf3" stroke="#1c2f52" strokeWidth="1.4" />
        <g stroke="#1c2f52" strokeOpacity="0.5" strokeWidth="0.9">
          <line x1="392" y1="140" x2="496" y2="140" />
          <line x1="444" y1="108" x2="444" y2="172" />
        </g>
        {/* parapet ticks */}
        <line x1="392" y1="108" x2="392" y2="98" stroke="#1c2f52" strokeWidth="1.4" />
        <line x1="496" y1="108" x2="496" y2="98" stroke="#1c2f52" strokeWidth="1.4" />
        <line x1="532" y1="90" x2="532" y2="80" stroke="#1c2f52" strokeWidth="1.4" />
      </g>

      {/* model dimension rail (right side) — ticks only, no values */}
      <g stroke="#e87625" strokeWidth="1.1" fill="none">
        <line x1="604" y1="392" x2="604" y2="264" markerStart="url(#avTick)" markerEnd="url(#avTick)" />
        <line x1="570" y1="392" x2="604" y2="392" stroke="#1c2f52" strokeOpacity="0.5" />
        <line x1="570" y1="264" x2="604" y2="264" stroke="#1c2f52" strokeOpacity="0.5" />
      </g>

      {/* section cut mark through the model — line only, no letter callouts */}
      <g stroke="#e87625" strokeWidth="1.4" fill="none">
        <line x1="330" y1="180" x2="330" y2="252" strokeDasharray="8 4 2 4" />
        <path d="M324 186 h12 M330 180 l-6 8 M330 180 l6 8" />
        <path d="M324 246 h12 M330 252 l-6 -8 M330 252 l6 -8" />
      </g>
    </svg>
  );
}
