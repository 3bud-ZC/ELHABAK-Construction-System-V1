/**
 * ELHABAK public hero — original architectural scene.
 *
 * An inline SVG composition built for this brand: a contemporary glass-and-
 * concrete tower at blue hour, a lit podium base, and a tower crane drawn in
 * blueprint lines. The building's structural edges continue upward as drafting
 * wireframe — the "design → built form" transition that anchors the brand
 * concept. All geometry is hand-plotted in a 2-point-ish axonometric
 * perspective; no photography or external artwork is used.
 */
export function HeroScene() {
  return (
    <svg
      viewBox="0 0 960 720"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="hsAtmo" cx="42%" cy="52%" r="62%">
          <stop offset="0%" stopColor="#24517c" stopOpacity="0.5" />
          <stop offset="55%" stopColor="#16304f" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#16304f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hsLobbyGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f2a65a" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#f2a65a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hsGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a5f8a" />
          <stop offset="45%" stopColor="#1d3454" />
          <stop offset="100%" stopColor="#0d1c30" />
        </linearGradient>
        <linearGradient id="hsLit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd9a4" />
          <stop offset="100%" stopColor="#ef9d4e" />
        </linearGradient>
        <linearGradient id="hsConcrete" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#43506a" />
          <stop offset="100%" stopColor="#232c3e" />
        </linearGradient>
        <linearGradient id="hsPodium" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#374560" />
          <stop offset="100%" stopColor="#1c2636" />
        </linearGradient>
        <linearGradient id="hsBand" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f7b16a" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#e8913f" stopOpacity="0.78" />
        </linearGradient>
        <linearGradient id="hsFog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#060d19" stopOpacity="0" />
          <stop offset="100%" stopColor="#050b16" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="hsFadeContent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#07101f" stopOpacity="0" />
          <stop offset="58%" stopColor="#07101f" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#07101f" stopOpacity="0.96" />
        </linearGradient>
        <linearGradient id="hsFadeEdge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#07101f" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#07101f" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hsFadeTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c1c33" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#0c1c33" stopOpacity="0" />
        </linearGradient>
        <filter id="hsSoft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <clipPath id="hsFace">
          <polygon points="235,192 508,222 508,618 235,588" />
        </clipPath>
        <clipPath id="hsPodiumFace">
          <polygon points="90,492 300,505 300,643 90,630" />
        </clipPath>
      </defs>

      {/* atmosphere behind the building */}
      <ellipse cx="400" cy="390" rx="430" ry="310" fill="url(#hsAtmo)" />

      {/* drafting sheet grid — faint, covers the whole canvas */}
      <g stroke="#8fb4dd" strokeOpacity="0.05" strokeWidth="1">
        <line x1="0" y1="96" x2="960" y2="96" />
        <line x1="0" y1="288" x2="960" y2="288" />
        <line x1="0" y1="480" x2="960" y2="480" />
        <line x1="0" y1="672" x2="960" y2="672" />
        <line x1="96" y1="0" x2="96" y2="720" />
        <line x1="288" y1="0" x2="288" y2="720" />
        <line x1="480" y1="0" x2="480" y2="720" />
        <line x1="672" y1="0" x2="672" y2="720" />
        <line x1="864" y1="0" x2="864" y2="720" />
      </g>

      {/* distant skyline */}
      <g fill="#0b1626">
        <polygon points="720,340 780,330 780,600 720,600" opacity="0.85" />
        <polygon points="865,320 925,310 925,600 865,600" opacity="0.55" />
      </g>
      <g stroke="#7fa8d4" strokeOpacity="0.1" strokeWidth="1">
        <line x1="728" y1="380" x2="772" y2="373" />
        <line x1="728" y1="420" x2="772" y2="413" />
        <line x1="728" y1="460" x2="772" y2="453" />
        <line x1="728" y1="500" x2="772" y2="493" />
      </g>

      {/* ground plane */}
      <polygon points="0,585 960,585 960,720 0,720" fill="#060d19" />
      <g stroke="#79a5d4" strokeOpacity="0.1" strokeWidth="1">
        <line x1="0" y1="597" x2="960" y2="597" />
        <line x1="0" y1="612" x2="960" y2="612" />
        <line x1="0" y1="631" x2="960" y2="631" />
        <line x1="0" y1="655" x2="960" y2="655" />
        <line x1="0" y1="685" x2="960" y2="685" />
      </g>
      <g stroke="#79a5d4" strokeOpacity="0.07" strokeWidth="1">
        <line x1="430" y1="585" x2="-60" y2="720" />
        <line x1="430" y1="585" x2="140" y2="720" />
        <line x1="430" y1="585" x2="340" y2="720" />
        <line x1="430" y1="585" x2="540" y2="720" />
        <line x1="430" y1="585" x2="740" y2="720" />
        <line x1="430" y1="585" x2="1020" y2="720" />
      </g>

      {/* ============ tower crane — blueprint wireframe ============ */}
      <g className="hero-crane" stroke="#9ec3ea" strokeWidth="1.1" fill="none" strokeOpacity="0.55">
        {/* mast */}
        <line x1="652" y1="600" x2="652" y2="132" />
        <line x1="664" y1="600" x2="664" y2="132" />
        {/* mast cross bracing */}
        <line x1="652" y1="586" x2="664" y2="573" />
        <line x1="664" y1="560" x2="652" y2="547" />
        <line x1="652" y1="521" x2="664" y2="508" />
        <line x1="664" y1="482" x2="652" y2="469" />
        <line x1="652" y1="443" x2="664" y2="430" />
        <line x1="664" y1="404" x2="652" y2="391" />
        <line x1="652" y1="365" x2="664" y2="352" />
        <line x1="664" y1="326" x2="652" y2="313" />
        <line x1="652" y1="287" x2="664" y2="274" />
        <line x1="664" y1="248" x2="652" y2="235" />
        <line x1="652" y1="209" x2="664" y2="196" />
        <line x1="664" y1="170" x2="652" y2="157" />
        {/* tower head */}
        <line x1="652" y1="132" x2="664" y2="132" />
        <line x1="658" y1="132" x2="658" y2="108" />
        {/* jib truss */}
        <line x1="658" y1="150" x2="840" y2="150" />
        <line x1="658" y1="158" x2="840" y2="158" />
        <line x1="670" y1="158" x2="682" y2="150" />
        <line x1="694" y1="158" x2="706" y2="150" />
        <line x1="718" y1="158" x2="730" y2="150" />
        <line x1="742" y1="158" x2="754" y2="150" />
        <line x1="766" y1="158" x2="778" y2="150" />
        <line x1="790" y1="158" x2="802" y2="150" />
        <line x1="814" y1="158" x2="826" y2="150" />
        {/* counter-jib */}
        <line x1="658" y1="150" x2="576" y2="150" />
        <line x1="658" y1="158" x2="576" y2="158" />
        <polygon points="580,158 570,158 570,184 580,184" fill="rgba(158,195,234,0.28)" stroke="none" />
        {/* tie bars */}
        <line x1="658" y1="108" x2="840" y2="150" />
        <line x1="658" y1="108" x2="576" y2="150" />
        {/* hook cable + lifted panel */}
        <line x1="814" y1="158" x2="814" y2="352" />
        <rect x="808" y="352" width="12" height="10" fill="rgba(158,195,234,0.35)" stroke="none" />
        <polygon points="796,368 836,368 836,384 796,384" strokeOpacity="0.4" />
      </g>
      <circle cx="658" cy="106" r="2.6" fill="#df6a20" />
      <circle cx="658" cy="106" r="6.5" fill="none" stroke="#df6a20" strokeOpacity="0.35" />

      {/* ============ podium — lit base block ============ */}
      <g>
        <polygon points="90,492 300,505 395,487 185,474" fill="#333f58" />
        <polygon points="300,643 395,622 395,487 300,505" fill="#202939" />
        <polygon points="90,630 300,643 300,505 90,492" fill="url(#hsPodium)" />
        {/* lit bands */}
        <g clipPath="url(#hsPodiumFace)">
          <polygon points="90,522 300,535 300,557 90,544" fill="url(#hsBand)" />
          <polygon points="90,575 300,588 300,612 90,599" fill="url(#hsBand)" opacity="0.85" />
          {/* vertical mullions */}
          <g stroke="#0a1524" strokeOpacity="0.55" strokeWidth="1.4">
            <line x1="132" y1="494.6" x2="132" y2="632.6" />
            <line x1="174" y1="497.2" x2="174" y2="635.2" />
            <line x1="216" y1="499.8" x2="216" y2="637.8" />
            <line x1="258" y1="502.4" x2="258" y2="640.4" />
          </g>
        </g>
        {/* side face floor lines + lit slit */}
        <g stroke="#8fb4dd" strokeOpacity="0.08" strokeWidth="1">
          <line x1="300" y1="530" x2="395" y2="510" />
          <line x1="300" y1="560" x2="395" y2="540" />
          <line x1="300" y1="590" x2="395" y2="570" />
        </g>
        <polygon points="330,545 368,538 368,552 330,559" fill="#ef9d4e" opacity="0.4" />
        {/* podium edges */}
        <polyline points="90,492 300,505 395,487" fill="none" stroke="#a8c8ea" strokeOpacity="0.3" strokeWidth="1" />
        <line x1="90" y1="492" x2="90" y2="630" stroke="#a8c8ea" strokeOpacity="0.18" strokeWidth="1" />
        <line x1="395" y1="487" x2="395" y2="622" stroke="#a8c8ea" strokeOpacity="0.14" strokeWidth="1" />
      </g>

      {/* warm light spilling from the podium onto the ground */}
      <ellipse cx="252" cy="632" rx="210" ry="58" fill="url(#hsLobbyGlow)" className="hero-scene__glow" />

      {/* ============ main tower ============ */}
      <g>
        {/* roof cap */}
        <polygon points="235,192 508,222 628,210 355,180" fill="#25344d" stroke="#a8c8ea" strokeOpacity="0.28" strokeWidth="1" />
        {/* side face — concrete massing */}
        <polygon points="508,618 628,588 628,210 508,222" fill="url(#hsConcrete)" />
        <g stroke="#8fb4dd" strokeOpacity="0.08" strokeWidth="1">
          <line x1="508" y1="252.5" x2="628" y2="239" />
          <line x1="508" y1="283" x2="628" y2="268" />
          <line x1="508" y1="313.5" x2="628" y2="297" />
          <line x1="508" y1="344" x2="628" y2="326" />
          <line x1="508" y1="374.5" x2="628" y2="355" />
          <line x1="508" y1="405" x2="628" y2="384" />
          <line x1="508" y1="435.5" x2="628" y2="413" />
          <line x1="508" y1="466" x2="628" y2="442" />
          <line x1="508" y1="496.5" x2="628" y2="471" />
          <line x1="508" y1="527" x2="628" y2="500" />
          <line x1="508" y1="557.5" x2="628" y2="529" />
          <line x1="508" y1="588" x2="628" y2="558" />
        </g>
        {/* side lit slits */}
        <polygon points="590,300 614,296 614,330 590,334" fill="#ef9d4e" opacity="0.55" />
        <polygon points="560,430 584,426 584,452 560,456" fill="#ef9d4e" opacity="0.4" />
        {/* front glass face */}
        <polygon points="235,588 508,618 508,222 235,192" fill="url(#hsGlass)" stroke="#a8c8ea" strokeOpacity="0.3" strokeWidth="1" />
        <g clipPath="url(#hsFace)">
          {/* floor lines */}
          <g stroke="#bed6f0" strokeOpacity="0.1" strokeWidth="1">
            <line x1="235" y1="222" x2="508" y2="252" />
            <line x1="235" y1="252" x2="508" y2="282" />
            <line x1="235" y1="282" x2="508" y2="312" />
            <line x1="235" y1="312" x2="508" y2="342" />
            <line x1="235" y1="342" x2="508" y2="372" />
            <line x1="235" y1="372" x2="508" y2="402" />
            <line x1="235" y1="402" x2="508" y2="432" />
            <line x1="235" y1="432" x2="508" y2="462" />
            <line x1="235" y1="462" x2="508" y2="492" />
            <line x1="235" y1="492" x2="508" y2="522" />
            <line x1="235" y1="522" x2="508" y2="552" />
            <line x1="235" y1="552" x2="508" y2="582" />
          </g>
          {/* vertical mullions */}
          <g stroke="#bed6f0" strokeOpacity="0.08" strokeWidth="1">
            <line x1="269.1" y1="195.7" x2="269.1" y2="591.7" />
            <line x1="303.2" y1="199.5" x2="303.2" y2="595.5" />
            <line x1="337.4" y1="203.3" x2="337.4" y2="599.3" />
            <line x1="371.5" y1="207.0" x2="371.5" y2="603.0" />
            <line x1="405.6" y1="210.8" x2="405.6" y2="606.8" />
            <line x1="439.8" y1="214.5" x2="439.8" y2="610.5" />
            <line x1="473.9" y1="218.3" x2="473.9" y2="614.3" />
          </g>
          {/* warm lit windows */}
          <g fill="url(#hsLit)" opacity="0.92">
            <polygon points="239,345.4 265,348.3 265,372.3 239,369.4" />
            <polygon points="273.1,259.2 299.1,262.0 299.1,286.0 273.1,283.2" />
            <polygon points="307.3,412.9 333.3,415.8 333.3,439.8 307.3,436.9" />
            <polygon points="341.4,326.7 367.4,329.6 367.4,353.6 341.4,350.7" />
            <polygon points="375.5,480.4 401.5,483.3 401.5,507.3 375.5,504.4" />
            <polygon points="409.6,244.2 435.6,247.1 435.6,271.1 409.6,268.2" />
            <polygon points="409.6,394.2 435.6,397.1 435.6,421.1 409.6,418.2" />
            <polygon points="443.8,307.9 469.8,310.8 469.8,334.8 443.8,331.9" />
            <polygon points="478,461.7 504,464.6 504,488.6 478,485.7" />
            <polygon points="307.3,532.9 333.3,535.8 333.3,559.8 307.3,556.9" />
            <polygon points="443.8,517.9 469.8,520.8 469.8,544.8 443.8,541.9" />
          </g>
          {/* cool lit windows */}
          <g fill="#cfe4ff" opacity="0.45">
            <polygon points="273.1,469.2 299.1,472.0 299.1,496.0 273.1,493.2" />
            <polygon points="375.5,300.5 401.5,303.3 401.5,327.3 375.5,324.5" />
            <polygon points="478,551.7 504,554.6 504,578.6 478,575.7" />
          </g>
          {/* sky reflection sweep on glass */}
          <polygon points="235,192 350,205 260,588 235,588" fill="#7fb2e5" opacity="0.06" />
        </g>
        {/* orange rim light on the top front edge + corner */}
        <line x1="235" y1="192" x2="508" y2="222" stroke="#df6a20" strokeOpacity="0.55" strokeWidth="1.4" />
        <line x1="508" y1="222" x2="508" y2="618" stroke="#df6a20" strokeOpacity="0.18" strokeWidth="1" />
      </g>

      {/* ============ blueprint layer — design continuing above the built form ============ */}
      <g className="hero-ghost" stroke="#96c2f0" strokeWidth="1" fill="none" strokeOpacity="0.55">
        <line x1="235" y1="192" x2="235" y2="82" pathLength={100} />
        <line x1="508" y1="222" x2="508" y2="112" pathLength={100} />
        <line x1="628" y1="210" x2="628" y2="102" pathLength={100} />
        <polyline points="235,156 508,186 628,174" pathLength={100} />
        <polyline points="235,119 508,149 628,137" pathLength={100} />
        <polyline points="235,82 508,112 628,100" pathLength={100} />
        <polygon points="235,82 508,112 628,100 355,70" pathLength={100} />
        <line x1="235" y1="82" x2="235" y2="50" strokeOpacity="0.3" pathLength={100} />
        <line x1="508" y1="112" x2="508" y2="80" strokeOpacity="0.3" pathLength={100} />
        <line x1="628" y1="102" x2="628" y2="74" strokeOpacity="0.3" pathLength={100} />
      </g>

      {/* dimension rail + projection lines (dashed) */}
      <g stroke="#96c2f0" strokeOpacity="0.42" strokeWidth="1" fill="none" strokeDasharray="5 5">
        <line x1="235" y1="192" x2="108" y2="174" />
        <line x1="235" y1="588" x2="108" y2="570" />
        <line x1="40" y1="700" x2="190" y2="470" />
      </g>
      <g stroke="#96c2f0" strokeOpacity="0.55" strokeWidth="1" fill="none">
        <line x1="104" y1="166" x2="104" y2="575" />
        <line x1="96" y1="170" x2="112" y2="170" />
        <line x1="96" y1="372" x2="112" y2="372" />
        <line x1="96" y1="574" x2="112" y2="574" />
        <circle cx="104" cy="152" r="8" />
        <line x1="100" y1="152" x2="108" y2="152" />
        <line x1="104" y1="148" x2="104" y2="156" />
      </g>

      {/* ground-level mist + fog */}
      <ellipse cx="480" cy="600" rx="470" ry="38" fill="#8cb4e0" opacity="0.06" />
      <rect x="0" y="520" width="960" height="200" fill="url(#hsFog)" />

      {/* edge fades: screen edge + top (the content-side blend is handled by a
         mask on .hero__scene so the scene dissolves into the page gradient) */}
      <rect x="0" y="0" width="72" height="720" fill="url(#hsFadeEdge)" />
      <rect x="560" y="0" width="400" height="720" fill="url(#hsFadeContent)" opacity="0.5" />
      <rect x="0" y="0" width="960" height="90" fill="url(#hsFadeTop)" />
    </svg>
  );
}
