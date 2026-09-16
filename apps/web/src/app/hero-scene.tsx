/**
 * ELHABAK public hero — one architectural scene evolving through design,
 * construction, and completed form. The SVG keeps a single building datum so
 * the timed states feel like a project being resolved rather than a carousel.
 */
export function HeroScene() {
  const gridX = [160, 228, 296, 364, 432, 500, 568, 636, 704];
  const gridY = [132, 184, 236, 288, 340, 392, 444, 496];
  const facadeXs = [286, 326, 366, 406, 446, 486, 526, 566, 606];
  const facadeYs = [205, 251, 297, 343, 389, 435];
  const frameXs = [270, 370, 470, 570, 670];
  const frameYs = [208, 286, 364, 442, 520];

  return (
    <svg viewBox="0 0 920 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="heroSky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#17365d" />
          <stop offset="52%" stopColor="#0b1b32" />
          <stop offset="100%" stopColor="#050b16" />
        </linearGradient>
        <linearGradient id="heroGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6f98c2" stopOpacity="0.58" />
          <stop offset="45%" stopColor="#234465" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#08182c" stopOpacity="0.96" />
        </linearGradient>
        <linearGradient id="heroConcrete" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b8c2cf" />
          <stop offset="100%" stopColor="#657489" />
        </linearGradient>
        <linearGradient id="heroWarm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd9a8" />
          <stop offset="100%" stopColor="#df6a20" />
        </linearGradient>
        <radialGradient id="heroAtmosphere" cx="50%" cy="48%" r="68%">
          <stop offset="0%" stopColor="#4e7fb1" stopOpacity="0.24" />
          <stop offset="62%" stopColor="#153353" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#07111f" stopOpacity="0" />
        </radialGradient>
        <clipPath id="heroTowerClip">
          <polygon points="268,182 666,214 666,522 268,496" />
        </clipPath>
      </defs>

      <rect width="920" height="640" fill="url(#heroSky)" />
      <ellipse cx="474" cy="342" rx="440" ry="280" fill="url(#heroAtmosphere)" />

      <g className="hero-scene__sheet" fill="none" stroke="#8fb4dd" strokeWidth="1">
        {gridX.map((x) => (
          <line key={`gx-${x}`} x1={x} y1="54" x2={x} y2="590" />
        ))}
        {gridY.map((y) => (
          <line key={`gy-${y}`} x1="82" y1={y} x2="830" y2={y} />
        ))}
        <polyline points="104,544 270,508 674,535 820,504" />
      </g>

      <g className="hero-permanent-massing">
        <polygon points="234,518 468,540 714,516 500,492" fill="#081321" opacity="0.52" />
        <polygon points="268,182 666,214 666,522 268,496" fill="#102a47" opacity="0.22" stroke="#9ec3ea" strokeOpacity="0.24" />
        <polygon points="268,182 354,148 744,181 666,214" fill="#6f849d" opacity="0.16" stroke="#9ec3ea" strokeOpacity="0.2" />
        <polygon points="666,214 744,181 744,478 666,522" fill="#142842" opacity="0.2" stroke="#9ec3ea" strokeOpacity="0.18" />
      </g>

      <g className="hero-state hero-state--design" fill="none" stroke="#a7cef5" strokeWidth="1.4">
        <g className="hero-state__draw">
          <polygon points="268,182 666,214 666,522 268,496" />
          <polyline points="268,182 354,148 744,181 666,214" />
          <line x1="354" y1="148" x2="354" y2="462" />
          <line x1="744" y1="181" x2="744" y2="478" />
          {frameXs.map((x) => (
            <line key={`design-col-${x}`} x1={x} y1="182" x2={x} y2="508" />
          ))}
          {frameYs.map((y) => (
            <line key={`design-floor-${y}`} x1="268" y1={y} x2="666" y2={y + 26} />
          ))}
          <polyline points="170,516 248,500 704,532 792,512" stroke="#df6a20" />
          <circle cx="268" cy="496" r="5" />
          <circle cx="666" cy="522" r="5" />
        </g>
        <g className="hero-scene__axis">
          <line x1="134" y1="168" x2="134" y2="534" />
          <line x1="122" y1="182" x2="146" y2="182" />
          <line x1="122" y1="496" x2="146" y2="496" />
        </g>
      </g>

      <g className="hero-state hero-state--construction">
        <g className="hero-frame" fill="none" stroke="#afc9e5" strokeWidth="2">
          {frameXs.map((x) => (
            <line key={`frame-col-${x}`} x1={x} y1="190" x2={x} y2="520" />
          ))}
          {frameYs.map((y) => (
            <line key={`frame-floor-${y}`} x1="246" y1={y} x2="690" y2={y + 28} />
          ))}
          <polyline points="244,520 468,535 694,520" />
        </g>
        <g className="hero-crane" fill="none" stroke="#9ec3ea" strokeWidth="1.45">
          <line x1="732" y1="566" x2="732" y2="112" />
          <line x1="748" y1="566" x2="748" y2="112" />
          <line x1="740" y1="112" x2="740" y2="78" />
          <line x1="740" y1="122" x2="414" y2="122" />
          <line x1="740" y1="132" x2="414" y2="132" />
          <line x1="740" y1="122" x2="820" y2="122" />
          <line x1="740" y1="132" x2="820" y2="132" />
          <line x1="740" y1="78" x2="414" y2="122" />
          <line x1="740" y1="78" x2="820" y2="124" />
          <rect x="806" y="132" width="24" height="34" fill="rgba(158,195,234,0.22)" stroke="none" />
          {gridY.slice(1, 7).map((y, index) => (
            <line
              key={`crane-brace-${y}`}
              x1={index % 2 === 0 ? 732 : 748}
              y1={y}
              x2={index % 2 === 0 ? 748 : 732}
              y2={y + 36}
            />
          ))}
          <g className="hero-crane__load">
            <rect x="496" y="118" width="24" height="16" fill="rgba(158,195,234,0.28)" stroke="none" />
            <line x1="508" y1="134" x2="508" y2="268" />
            <line x1="470" y1="268" x2="548" y2="268" />
            <line x1="476" y1="268" x2="484" y2="318" />
            <line x1="540" y1="268" x2="532" y2="318" />
            <polygon points="484,318 532,322 532,414 484,410" fill="rgba(35,68,101,0.82)" />
            <line x1="508" y1="320" x2="508" y2="412" />
          </g>
        </g>
        <g className="hero-construction-panels" fill="url(#heroGlass)" stroke="#9ec3ea" strokeWidth="1">
          <polygon points="284,222 366,228 366,302 284,296" />
          <polygon points="384,230 466,236 466,310 384,304" />
          <polygon points="284,318 366,324 366,398 284,392" />
          <polygon points="384,326 466,332 466,406 384,400" />
        </g>
        <g className="hero-site-markers" fill="#df6a20">
          <rect x="214" y="518" width="58" height="5" />
          <rect x="676" y="515" width="42" height="5" />
          <circle cx="740" cy="78" r="3" />
        </g>
      </g>

      <g className="hero-state hero-state--complete">
        <polygon points="234,518 468,540 714,516 500,492" fill="#101c2f" opacity="0.78" />
        <polygon points="268,182 666,214 666,522 268,496" fill="url(#heroGlass)" stroke="#bdd8f4" strokeOpacity="0.52" />
        <polygon points="268,182 354,148 744,181 666,214" fill="url(#heroConcrete)" opacity="0.88" />
        <polygon points="666,214 744,181 744,478 666,522" fill="#263c58" stroke="#bdd8f4" strokeOpacity="0.38" />
        <g clipPath="url(#heroTowerClip)" stroke="#d6e8fa" strokeOpacity="0.38" strokeWidth="1">
          {facadeXs.map((x) => (
            <line key={`facade-x-${x}`} x1={x} y1="178" x2={x} y2="522" />
          ))}
          {facadeYs.map((y) => (
            <line key={`facade-y-${y}`} x1="260" y1={y} x2="674" y2={y + 28} />
          ))}
          <polygon points="314,190 420,198 342,498 286,494" fill="#9ec3ea" opacity="0.14" stroke="none" />
          <polygon points="524,205 606,212 548,514 502,510" fill="#9ec3ea" opacity="0.08" stroke="none" />
        </g>
        <g className="hero-complete-lights" fill="url(#heroWarm)">
          <polygon points="402,432 474,437 474,512 402,508" opacity="0.92" />
          <polygon points="320,253 354,256 354,286 320,283" opacity="0.45" />
          <polygon points="512,317 548,320 548,352 512,349" opacity="0.34" />
          <polygon points="578,424 616,427 616,470 578,467" opacity="0.36" />
        </g>
        <g fill="none" stroke="#d6e8fa" strokeOpacity="0.22" strokeWidth="1.2">
          <line x1="268" y1="182" x2="268" y2="496" />
          <line x1="666" y1="214" x2="666" y2="522" />
          <polyline points="268,496 468,510 666,522" />
        </g>
      </g>

      <g className="hero-scene__datum" fill="none" stroke="#96c2f0" strokeWidth="1">
        <line x1="768" y1="182" x2="768" y2="522" />
        <line x1="752" y1="182" x2="782" y2="182" />
        <line x1="752" y1="522" x2="782" y2="522" />
        <line x1="666" y1="214" x2="768" y2="182" />
        <line x1="666" y1="522" x2="768" y2="522" />
      </g>
      <rect x="0" y="552" width="920" height="88" fill="rgba(4,10,20,0.68)" />
    </svg>
  );
}
