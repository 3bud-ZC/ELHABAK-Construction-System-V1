/**
 * ELHABAK public hero — original architectural scene.
 *
 * An inline SVG composition built for this brand: a stepped contemporary
 * pavilion — concrete frame, cantilevered upper volume over slim pilotis,
 * vertical fins, and a warm-lit entrance on a raised podium — with a tower
 * crane placing the last façade module beside the one still-open bay. The
 * roofline continues upward as drafting wireframe: the "design → built form"
 * transition that anchors the brand concept. All geometry is hand-plotted in
 * a loose two-point perspective; no photography or external artwork is used,
 * and no readable text lives inside the SVG because the scene mirrors in LTR.
 */
export function HeroScene() {
  // repeated drafting strokes generated from fixed geometry
  const mastBraceYs = [160, 188, 216, 244, 272, 300, 328, 356, 384, 412, 440, 468, 496, 524, 552, 580];
  const mastRungs = [160, 216, 272, 328, 384, 440, 496, 552];
  const jibBayXs = [412, 436, 460, 484, 508, 532, 556, 580, 604, 628, 652, 676, 700, 724, 748];
  const finXs = [278, 316, 354, 392, 430, 468, 506];
  const mullionXs = [269, 300, 331, 362, 393, 424, 455, 486, 517];
  const bayXs = [240, 392, 544, 696];

  return (
    <svg
      viewBox="0 0 920 640"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="hsAtmo" cx="46%" cy="52%" r="60%">
          <stop offset="0%" stopColor="#24517c" stopOpacity="0.45" />
          <stop offset="55%" stopColor="#16304f" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#16304f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hsLobbyGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f2a65a" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#f2a65a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hsGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#33547e" />
          <stop offset="45%" stopColor="#1b3050" />
          <stop offset="100%" stopColor="#0c1a2e" />
        </linearGradient>
        <linearGradient id="hsLit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd9a4" />
          <stop offset="100%" stopColor="#ef9d4e" />
        </linearGradient>
        <linearGradient id="hsConcrete" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#46536f" />
          <stop offset="100%" stopColor="#242e40" />
        </linearGradient>
        <linearGradient id="hsPodium" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#39476a" />
          <stop offset="100%" stopColor="#1c2636" />
        </linearGradient>
        <linearGradient id="hsFog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#060d19" stopOpacity="0" />
          <stop offset="100%" stopColor="#050b16" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="hsFadeTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c1c33" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0c1c33" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hsSlotShadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#040a14" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#040a14" stopOpacity="0" />
        </linearGradient>
        <clipPath id="hsUpperFace">
          <polygon points="240,246 620,278 620,368 240,336" />
        </clipPath>
      </defs>

      {/* atmosphere behind the building */}
      <ellipse cx="430" cy="350" rx="400" ry="270" fill="url(#hsAtmo)" />

      {/* drafting sheet grid — faint, covers the whole canvas */}
      <g stroke="#8fb4dd" strokeOpacity="0.045" strokeWidth="1">
        <line x1="0" y1="106" x2="920" y2="106" />
        <line x1="0" y1="252" x2="920" y2="252" />
        <line x1="0" y1="398" x2="920" y2="398" />
        <line x1="0" y1="544" x2="920" y2="544" />
        <line x1="115" y1="0" x2="115" y2="640" />
        <line x1="345" y1="0" x2="345" y2="640" />
        <line x1="575" y1="0" x2="575" y2="640" />
        <line x1="805" y1="0" x2="805" y2="640" />
      </g>

      {/* structural bay grid — column lines carried through the section,
          drawn first in the entrance sequence */}
      <g className="hero-structural-grid" stroke="#96c2f0" strokeOpacity="0.18" strokeWidth="1" fill="none">
        {bayXs.map((x) => (
          <line key={x} x1={x} y1="132" x2={x} y2="560" pathLength={100} />
        ))}
        {bayXs.map((x) => (
          <line key={`tick-${x}`} x1={x} y1="555" x2={x} y2="565" pathLength={100} />
        ))}
      </g>

      {/* ground plane */}
      <polygon points="0,560 920,560 920,640 0,640" fill="#060d19" />
      <g stroke="#79a5d4" strokeOpacity="0.1" strokeWidth="1">
        <line x1="0" y1="585" x2="920" y2="578" />
        <line x1="0" y1="612" x2="920" y2="606" />
      </g>
      {/* perspective lines converging toward a right-hand vanishing point */}
      <g stroke="#79a5d4" strokeOpacity="0.07" strokeWidth="1">
        <line x1="0" y1="640" x2="1240" y2="555" />
        <line x1="170" y1="640" x2="1240" y2="555" />
        <line x1="360" y1="640" x2="1240" y2="555" />
        <line x1="580" y1="640" x2="1240" y2="555" />
        <line x1="840" y1="640" x2="1240" y2="555" />
      </g>
      <g stroke="#79a5d4" strokeOpacity="0.05" strokeWidth="1">
        <line x1="640" y1="640" x2="-260" y2="555" />
        <line x1="860" y1="640" x2="-260" y2="555" />
      </g>

      {/* ============ tower crane — blueprint wireframe, behind the building ============ */}
      <g className="hero-crane" stroke="#9ec3ea" strokeWidth="1.3" fill="none" strokeOpacity="0.62">
        {/* mast */}
        <line x1="772" y1="596" x2="772" y2="100" />
        <line x1="784" y1="596" x2="784" y2="100" />
        {/* mast cross bracing */}
        {mastBraceYs.map((y, i) =>
          i % 2 === 0 ? (
            <line key={y} x1="772" y1={y} x2="784" y2={y - 14} />
          ) : (
            <line key={y} x1="784" y1={y} x2="772" y2={y - 14} />
          )
        )}
        {mastRungs.map((y) => (
          <line key={y} x1="772" y1={y} x2="784" y2={y} />
        ))}
        {/* base feet */}
        <line x1="764" y1="596" x2="792" y2="596" />
        {/* tower head */}
        <line x1="772" y1="100" x2="784" y2="100" />
        <line x1="778" y1="100" x2="778" y2="68" />
        {/* jib truss */}
        <line x1="778" y1="112" x2="400" y2="112" />
        <line x1="778" y1="120" x2="400" y2="120" />
        {jibBayXs.map((x) => (
          <line key={x} x1={x} y1="120" x2={x + 24} y2="112" />
        ))}
        <line x1="772" y1="120" x2="772" y2="112" />
        {/* counter-jib + counterweight */}
        <line x1="778" y1="112" x2="848" y2="112" />
        <line x1="778" y1="120" x2="848" y2="120" />
        <line x1="800" y1="120" x2="812" y2="112" />
        <line x1="824" y1="120" x2="836" y2="112" />
        <polygon points="834,120 848,120 848,144 834,144" fill="rgba(158,195,234,0.26)" stroke="none" />
        {/* tie bars */}
        <line x1="778" y1="68" x2="404" y2="112" />
        <line x1="778" y1="68" x2="846" y2="114" />
      </g>
      {/* single controlled highlight — crane apex beacon */}
      <g className="hero-scene__highlight">
        <circle cx="778" cy="66" r="2.6" fill="#df6a20" />
        <circle cx="778" cy="66" r="7" fill="none" stroke="#df6a20" strokeOpacity="0.35" />
      </g>

      {/* ============ built form — all solid material ============ */}
      <g className="hero-built-form">
        <g className="hero-material-layer">
          {/* podium / terrace slab */}
          <g>
            <polygon points="90,522 575,553 695,527 210,496" fill="#2b3a55" />
            <polygon points="575,553 695,527 695,554 575,582" fill="#1f2939" />
            <polygon points="90,522 575,553 575,582 90,551" fill="url(#hsPodium)" />
            {/* terrace step at the front-left corner */}
            <polygon points="52,544 90,549 90,558 52,553" fill="#33405c" />
            <polygon points="52,553 90,558 90,566 52,561" fill="#222d42" />
            {/* front-face joints */}
            <g stroke="#8fb4dd" strokeOpacity="0.09" strokeWidth="1">
              <line x1="211" y1="530" x2="211" y2="559" />
              <line x1="332" y1="537" x2="332" y2="566" />
              <line x1="453" y1="545" x2="453" y2="574" />
            </g>
            <polyline points="90,522 575,553 695,527" fill="none" stroke="#a8c8ea" strokeOpacity="0.3" strokeWidth="1" />
            <line x1="90" y1="522" x2="90" y2="551" stroke="#a8c8ea" strokeOpacity="0.16" strokeWidth="1" />
            <line x1="695" y1="527" x2="695" y2="554" stroke="#a8c8ea" strokeOpacity="0.14" strokeWidth="1" />
          </g>

          {/* recessed shadowed wall + contact shadow under the cantilever */}
          <polygon points="620,371 724,357 724,402 620,416" fill="#060d18" opacity="0.95" />
          <ellipse cx="672" cy="520" rx="66" ry="13" fill="#040a14" opacity="0.7" />

          {/* recessed curtain wall in the shadow slot between the two volumes —
              reads as set-back glazing, not a void */}
          <g>
            <polygon points="240,338 620,370 620,432 240,400" fill="url(#hsGlass)" opacity="0.85" />
            <g stroke="#8fb4dd" strokeOpacity="0.14" strokeWidth="1">
              <line x1="316" y1="346.4" x2="316" y2="402.4" />
              <line x1="392" y1="352.8" x2="392" y2="408.8" />
              <line x1="468" y1="359.2" x2="468" y2="415.2" />
              <line x1="544" y1="365.6" x2="544" y2="421.6" />
            </g>
            <polygon points="296,343 344,347 322,384 284,381" fill="#7fb2e5" opacity="0.06" />
            <polygon points="240,338 620,370 620,400 240,368" fill="url(#hsSlotShadow)" />
          </g>

          {/* slim pilotis carrying the cantilever */}
          <g fill="#3d4b68" stroke="#a8c8ea" strokeOpacity="0.2" strokeWidth="0.8">
            <polygon points="662,365 668,365 668,527 662,527" />
            <polygon points="704,360 710,360 710,560 704,560" />
          </g>

          {/* ground volume — deep blue glazing, mostly unlit */}
          <g>
            {/* right side face */}
            <polygon points="545,422 645,408 645,526 545,534" fill="#122038" />
            <g stroke="#8fb4dd" strokeOpacity="0.08" strokeWidth="1">
              <line x1="570" y1="419" x2="570" y2="531" />
              <line x1="595" y1="416" x2="595" y2="528" />
              <line x1="620" y1="412" x2="620" y2="524" />
            </g>
            {/* front face */}
            <polygon points="238,392 545,422 545,534 238,502" fill="url(#hsGlass)" />
            {/* cool reflection sweeps */}
            <polygon points="238,392 322,401 262,510 238,502" fill="#7fb2e5" opacity="0.07" />
            <polygon points="408,409 448,412 416,526 390,524" fill="#7fb2e5" opacity="0.04" />
            {/* entrance door leaf */}
            <polygon points="424,476 452,479 452,530 424,527" fill="#0b1626" opacity="0.9" stroke="#a8c8ea" strokeOpacity="0.2" strokeWidth="0.8" />
            {/* mid rail + mullions */}
            <line x1="238" y1="452" x2="545" y2="482" stroke="#0a1524" strokeOpacity="0.55" strokeWidth="1.4" />
            <g stroke="#0a1524" strokeOpacity="0.55" strokeWidth="1.4">
              {mullionXs.map((x) => (
                <line
                  key={x}
                  x1={x}
                  y1={404 + (x - 238) * 0.0977}
                  x2={x}
                  y2={502 + (x - 238) * 0.104}
                />
              ))}
            </g>
            {/* front edges */}
            <polyline points="238,392 545,422 645,408" fill="none" stroke="#a8c8ea" strokeOpacity="0.3" strokeWidth="1" />
            <line x1="238" y1="392" x2="238" y2="502" stroke="#a8c8ea" strokeOpacity="0.18" strokeWidth="1" />
          </g>

          {/* solid core — concrete wing stepping down at the left */}
          <g>
            <polygon points="190,308 238,300 238,490 190,498" fill="#1c2536" />
            <polygon points="120,300 190,308 238,300 168,292" fill="#2b3a55" />
            <polygon points="120,300 190,308 190,498 120,490" fill="url(#hsConcrete)" />
            <polyline points="120,300 190,308 238,300" fill="none" stroke="#a8c8ea" strokeOpacity="0.28" strokeWidth="1" />
            <line x1="120" y1="300" x2="120" y2="490" stroke="#a8c8ea" strokeOpacity="0.16" strokeWidth="1" />
          </g>

          {/* upper volume — cantilevered, framed in concrete */}
          <g>
            {/* roof slab top + fascia */}
            <polygon points="230,238 620,270 734,256 344,224" fill="#2c3c5c" stroke="#a8c8ea" strokeOpacity="0.42" strokeWidth="1" />
            <polygon points="620,270 734,256 734,264 620,278" fill="#3d4b6e" />
            {/* front face — deep navy glass */}
            <polygon points="240,246 620,278 620,368 240,336" fill="url(#hsGlass)" />
            {/* broad cool reflection sweep across the resolved curtain wall */}
            <g clipPath="url(#hsUpperFace)">
              <polygon points="292,246 402,255 336,352 258,344" fill="#7fb2e5" opacity="0.08" />
            </g>
            {/* final bay beside the crane left open — exposed frame, no glass */}
            <polygon points="550,282 608,287 608,361 550,356" fill="#0a1424" opacity="0.95" />
            <polygon points="536,281 550,282 550,356 536,355" fill="#566488" stroke="#a8c8ea" strokeOpacity="0.45" strokeWidth="1" />
            <polygon points="608,287 620,288 620,362 608,361" fill="#566488" stroke="#a8c8ea" strokeOpacity="0.45" strokeWidth="1" />
            <polygon points="577,284 582,284.6 582,358.9 577,358.4" fill="#4a5878" />
            {/* warm interior behind two resolved bays */}
            <polygon points="354,255.6 468,265.2 468,355.2 354,345.6" fill="url(#hsLit)" opacity="0.16" />
            {/* vertical fins running full height */}
            <g fill="#48577a" stroke="#a8c8ea" strokeOpacity="0.28" strokeWidth="0.8">
              {finXs.map((x) => {
                const yt = 246 + (x - 240) * (32 / 380);
                const yb = 336 + (x - 240) * (32 / 380);
                return (
                  <polygon
                    key={x}
                    points={`${x},${yt.toFixed(1)} ${x + 7},${(yt + 0.6).toFixed(1)} ${x + 7},${(yb + 0.6).toFixed(1)} ${x},${yb.toFixed(1)}`}
                  />
                );
              })}
            </g>
            {/* concrete frame bands over the fin ends */}
            <polygon points="240,246 620,278 620,288 240,256" fill="#4a5878" />
            <polygon points="240,330 620,362 620,368 240,336" fill="#3c4a68" />
            {/* end wall — solid concrete */}
            <polygon points="620,278 724,264 724,354 620,368" fill="url(#hsConcrete)" />
            <g stroke="#8fb4dd" strokeOpacity="0.08" strokeWidth="1">
              <line x1="620" y1="301" x2="724" y2="287" />
              <line x1="620" y1="324" x2="724" y2="310" />
              <line x1="620" y1="347" x2="724" y2="333" />
            </g>
            <polyline points="240,246 620,278 724,264" fill="none" stroke="#a8c8ea" strokeOpacity="0.42" strokeWidth="1" />
            <line x1="240" y1="246" x2="240" y2="336" stroke="#a8c8ea" strokeOpacity="0.18" strokeWidth="1" />
          </g>

          {/* selected warm light — entrance plus two occupied bays only */}
          <g className="hero-selected-lights">
            <polygon points="410,446 462,451 462,533 410,527" fill="url(#hsLit)" opacity="0.8" />
            <polygon points="272,409 297,412 297,446 272,443" fill="url(#hsLit)" opacity="0.55" />
            <polygon points="489,430 514,433 514,478 489,475" fill="url(#hsLit)" opacity="0.35" />
            <ellipse cx="436" cy="530" rx="52" ry="12" fill="url(#hsLobbyGlow)" />
          </g>
        </g>
      </g>

      {/* ============ wireframe — roofline and the unbuilt bay's glazing ============ */}
      <g className="hero-wireframe" stroke="#96c2f0" strokeWidth="1" fill="none" strokeOpacity="0.55">
        <line x1="230" y1="238" x2="230" y2="190" pathLength={100} />
        <line x1="344" y1="224" x2="344" y2="176" pathLength={100} />
        <line x1="620" y1="270" x2="620" y2="222" pathLength={100} />
        <line x1="734" y1="256" x2="734" y2="208" pathLength={100} />
        <polyline points="230,190 344,176 734,208 620,222 230,190" pathLength={100} />
        <polyline points="230,214 620,246 734,232" pathLength={100} />
        {/* dashed outline of the glazing still to be placed in the open bay */}
        <g>
          <polygon points="556,290 604,294 604,354 556,350" strokeDasharray="4 4" strokeOpacity="0.6" />
        </g>
      </g>

      {/* ============ datum — one level rail, ticks mapped to roof / upper floor / ground ============ */}
      <g className="hero-datum-signal" stroke="#96c2f0" strokeWidth="1" fill="none">
        <line x1="734" y1="256" x2="754" y2="254" strokeOpacity="0.4" pathLength={100} />
        <line x1="645" y1="408" x2="754" y2="398" strokeOpacity="0.4" pathLength={100} />
        <line x1="695" y1="554" x2="754" y2="548" strokeOpacity="0.4" pathLength={100} />
        <line x1="754" y1="246" x2="754" y2="556" strokeOpacity="0.55" pathLength={100} />
        <line x1="748" y1="254" x2="760" y2="254" strokeOpacity="0.55" pathLength={100} />
        <line x1="748" y1="398" x2="760" y2="398" strokeOpacity="0.55" pathLength={100} />
        <line x1="748" y1="548" x2="760" y2="548" strokeOpacity="0.55" pathLength={100} />
      </g>

      {/* ============ crane lift — trolley, hoist cable, spreader beam, façade module ============ */}
      <g className="hero-crane__lift" stroke="#9ec3ea" strokeWidth="1.2" fill="none" strokeOpacity="0.7">
        <rect x="643" y="111" width="16" height="11" fill="rgba(158,195,234,0.3)" stroke="none" />
        <line x1="651" y1="122" x2="651" y2="268" />
        <rect x="647" y="268" width="8" height="7" fill="rgba(158,195,234,0.35)" stroke="none" />
        {/* link down to the spreader beam */}
        <line x1="651" y1="275" x2="651" y2="278" />
        <rect x="620" y="278" width="62" height="5" fill="#4a5878" stroke="#a8c8ea" strokeOpacity="0.5" strokeWidth="1" />
        {/* rigging — beam ends to the panel's top corners, staying cable-like */}
        <line x1="622" y1="282" x2="626" y2="306" strokeOpacity="0.4" />
        <line x1="680" y1="282" x2="682" y2="310" strokeOpacity="0.4" />
        {/* suspended façade module — flat top, trapezoid matching the façade plane */}
        <polygon points="626,306 682,310 682,382 626,378" fill="rgba(24,52,86,0.72)" strokeOpacity="0.85" strokeWidth="1.4" />
        <line x1="654" y1="308" x2="654" y2="380" strokeOpacity="0.5" />
        <line x1="626" y1="342" x2="682" y2="346" strokeOpacity="0.35" />
        <polygon points="634,308 650,309 636,378 628,377" fill="#7fb2e5" opacity="0.1" stroke="none" />
      </g>

      {/* ground-level mist + fog */}
      <ellipse cx="460" cy="580" rx="450" ry="34" fill="#8cb4e0" opacity="0.05" />
      <rect x="0" y="528" width="920" height="112" fill="url(#hsFog)" />

      {/* top edge fade — the plate dissolves into the canvas above */}
      <rect x="0" y="0" width="920" height="66" fill="url(#hsFadeTop)" />
    </svg>
  );
}
