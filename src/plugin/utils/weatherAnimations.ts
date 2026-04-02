/**
 * Returns an animated SVG string for a given weather condition.
 * @param condition - The weather entity state (e.g. "sunny", "rainy", "clear-night")
 * @param temperature - Formatted temperature string (e.g. "22°C"), optional overlay
 */
export function getWeatherAnimationSvg(condition: string, temperature?: string): string {
    switch (condition) {
        case "sunny": return sunny(temperature);
        case "clear-night": return clearNight(temperature);
        case "cloudy": return cloudy(temperature);
        case "fog": return fog(temperature);
        case "hail": return hail(temperature);
        case "lightning": return lightning(temperature);
        case "lightning-rainy": return lightningRainy(temperature);
        case "partlycloudy": return partlyCloudy(temperature);
        case "pouring": return pouring(temperature);
        case "rainy": return rainy(temperature);
        case "snowy": return snowy(temperature);
        case "snowy-rainy": return snowyRainy(temperature);
        case "windy": return windy(temperature);
        case "windy-variant": return windyVariant(temperature);
        case "exceptional": return exceptional(temperature);
        default: return defaultWeather(condition, temperature);
    }
}

function tempLabel(temperature?: string): string {
    if (!temperature) return "";
    return `<text x="72" y="136" text-anchor="middle" fill="white" font-size="20" font-family="Arial,sans-serif" font-weight="bold" stroke="#000000" stroke-width="3" paint-order="stroke">${temperature}</text>`;
}

function cloud(cx: number, cy: number, fill: string): string {
    return `<ellipse cx="${cx - 18}" cy="${cy + 8}" rx="16" ry="12" fill="${fill}"/>
  <ellipse cx="${cx}" cy="${cy}" rx="20" ry="16" fill="${fill}"/>
  <ellipse cx="${cx + 20}" cy="${cy + 8}" rx="16" ry="12" fill="${fill}"/>
  <rect x="${cx - 33}" y="${cy + 8}" width="69" height="14" fill="${fill}"/>`;
}

// Sunny: rotating rays + pulsing sun circle on blue sky
function sunny(temperature?: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">
  <defs>
    <radialGradient id="sky" cx="50%" cy="30%">
      <stop offset="0%" stop-color="#60b8f0"/>
      <stop offset="100%" stop-color="#1a7ac4"/>
    </radialGradient>
    <radialGradient id="sun" cx="40%" cy="40%">
      <stop offset="0%" stop-color="#fff8a0"/>
      <stop offset="100%" stop-color="#ffaa00"/>
    </radialGradient>
  </defs>
  <rect width="144" height="144" fill="url(#sky)"/>
  <g transform="translate(72,56)">
    <g>
      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="8s" repeatCount="indefinite"/>
      <line x1="0" y1="-30" x2="0" y2="-44" stroke="#ffcc00" stroke-width="4" stroke-linecap="round"/>
      <line x1="0" y1="-30" x2="0" y2="-44" stroke="#ffcc00" stroke-width="4" stroke-linecap="round" transform="rotate(45)"/>
      <line x1="0" y1="-30" x2="0" y2="-44" stroke="#ffcc00" stroke-width="4" stroke-linecap="round" transform="rotate(90)"/>
      <line x1="0" y1="-30" x2="0" y2="-44" stroke="#ffcc00" stroke-width="4" stroke-linecap="round" transform="rotate(135)"/>
      <line x1="0" y1="-30" x2="0" y2="-44" stroke="#ffcc00" stroke-width="4" stroke-linecap="round" transform="rotate(180)"/>
      <line x1="0" y1="-30" x2="0" y2="-44" stroke="#ffcc00" stroke-width="4" stroke-linecap="round" transform="rotate(225)"/>
      <line x1="0" y1="-30" x2="0" y2="-44" stroke="#ffcc00" stroke-width="4" stroke-linecap="round" transform="rotate(270)"/>
      <line x1="0" y1="-30" x2="0" y2="-44" stroke="#ffcc00" stroke-width="4" stroke-linecap="round" transform="rotate(315)"/>
    </g>
    <circle r="24" fill="url(#sun)">
      <animate attributeName="r" values="24;27;24" dur="2s" repeatCount="indefinite"/>
    </circle>
  </g>
  ${tempLabel(temperature)}
</svg>`;
}

// Clear night: dark sky, crescent moon, twinkling stars
function clearNight(temperature?: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">
  <defs>
    <radialGradient id="nightsky" cx="50%" cy="30%">
      <stop offset="0%" stop-color="#1a2f5c"/>
      <stop offset="100%" stop-color="#050d1a"/>
    </radialGradient>
  </defs>
  <rect width="144" height="144" fill="url(#nightsky)"/>
  <circle cx="22" cy="18" r="2" fill="white"><animate attributeName="opacity" values="1;0.2;1" dur="2.1s" repeatCount="indefinite"/></circle>
  <circle cx="48" cy="28" r="1.5" fill="white"><animate attributeName="opacity" values="0.5;1;0.5" dur="1.7s" repeatCount="indefinite"/></circle>
  <circle cx="102" cy="14" r="2" fill="white"><animate attributeName="opacity" values="1;0.3;1" dur="2.8s" repeatCount="indefinite"/></circle>
  <circle cx="122" cy="34" r="1.5" fill="white"><animate attributeName="opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite"/></circle>
  <circle cx="32" cy="50" r="1" fill="white"><animate attributeName="opacity" values="1;0.4;1" dur="3.2s" repeatCount="indefinite"/></circle>
  <circle cx="118" cy="52" r="2" fill="white"><animate attributeName="opacity" values="0.4;1;0.4" dur="2.4s" repeatCount="indefinite"/></circle>
  <circle cx="62" cy="10" r="1.5" fill="white"><animate attributeName="opacity" values="1;0.6;1" dur="1.9s" repeatCount="indefinite"/></circle>
  <circle cx="85" cy="24" r="1" fill="white"><animate attributeName="opacity" values="0.6;1;0.6" dur="2.6s" repeatCount="indefinite"/></circle>
  <!-- Crescent moon: large lit circle minus offset dark circle -->
  <circle cx="72" cy="58" r="26" fill="#fffacc"/>
  <circle cx="84" cy="50" r="22" fill="#1a2f5c"/>
  <!-- Soft glow ring -->
  <circle cx="66" cy="62" r="22" fill="none" stroke="#fffacc" stroke-width="2" opacity="0.25">
    <animate attributeName="r" values="22;27;22" dur="3s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.25;0.08;0.25" dur="3s" repeatCount="indefinite"/>
  </circle>
  ${tempLabel(temperature)}
</svg>`;
}

// Cloudy: overcast sky with two drifting cloud layers
function cloudy(temperature?: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">
  <rect width="144" height="144" fill="#6a8aaa"/>
  <!-- Background cloud, drifts right -->
  <g opacity="0.55">
    <animateTransform attributeName="transform" type="translate" values="0,0;10,0;0,0" dur="6s" repeatCount="indefinite"/>
    ${cloud(50, 68, "#9ab4c8")}
  </g>
  <!-- Foreground cloud, drifts left -->
  <g>
    <animateTransform attributeName="transform" type="translate" values="0,0;-8,0;0,0" dur="8s" repeatCount="indefinite"/>
    ${cloud(76, 44, "#dde8f0")}
  </g>
  ${tempLabel(temperature)}
</svg>`;
}

// Fog: light gray with animated horizontal fog bands scrolling
function fog(temperature?: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">
  <rect width="144" height="144" fill="#b0bcc4"/>
  <rect x="0" y="22" width="200" height="11" rx="5" fill="white" opacity="0.6">
    <animateTransform attributeName="transform" type="translate" values="0,0;30,0;0,0" dur="4s" repeatCount="indefinite"/>
  </rect>
  <rect x="-30" y="40" width="200" height="9" rx="4" fill="white" opacity="0.5">
    <animateTransform attributeName="transform" type="translate" values="0,0;-26,0;0,0" dur="5s" repeatCount="indefinite"/>
  </rect>
  <rect x="0" y="57" width="200" height="11" rx="5" fill="white" opacity="0.65">
    <animateTransform attributeName="transform" type="translate" values="0,0;22,0;0,0" dur="3.6s" repeatCount="indefinite"/>
  </rect>
  <rect x="-20" y="75" width="200" height="9" rx="4" fill="white" opacity="0.45">
    <animateTransform attributeName="transform" type="translate" values="0,0;-32,0;0,0" dur="6s" repeatCount="indefinite"/>
  </rect>
  <rect x="0" y="92" width="200" height="11" rx="5" fill="white" opacity="0.55">
    <animateTransform attributeName="transform" type="translate" values="0,0;18,0;0,0" dur="4.5s" repeatCount="indefinite"/>
  </rect>
  <rect x="-10" y="108" width="200" height="9" rx="4" fill="white" opacity="0.4">
    <animateTransform attributeName="transform" type="translate" values="0,0;-20,0;0,0" dur="5.5s" repeatCount="indefinite"/>
  </rect>
  ${tempLabel(temperature)}
</svg>`;
}

// Hail: dark storm cloud + animated falling hailstones
function hail(temperature?: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">
  <rect width="144" height="144" fill="#4a6480"/>
  ${cloud(72, 34, "#708090")}
  <!-- Hailstones: staggered falling ovals -->
  <g><animate attributeName="opacity" values="1;1;0;1" dur="1.4s" begin="0s" repeatCount="indefinite"/>
    <ellipse cx="40" cy="0" rx="5" ry="4" fill="#d4eeff">
      <animate attributeName="cy" from="62" to="134" dur="1.4s" begin="0s" repeatCount="indefinite"/>
    </ellipse>
  </g>
  <g><animate attributeName="opacity" values="1;1;0;1" dur="1.2s" begin="-0.4s" repeatCount="indefinite"/>
    <ellipse cx="60" cy="0" rx="4" ry="3" fill="#d4eeff">
      <animate attributeName="cy" from="60" to="134" dur="1.2s" begin="-0.4s" repeatCount="indefinite"/>
    </ellipse>
  </g>
  <g><animate attributeName="opacity" values="1;1;0;1" dur="1.6s" begin="-0.8s" repeatCount="indefinite"/>
    <ellipse cx="80" cy="0" rx="5" ry="4" fill="#d4eeff">
      <animate attributeName="cy" from="62" to="134" dur="1.6s" begin="-0.8s" repeatCount="indefinite"/>
    </ellipse>
  </g>
  <g><animate attributeName="opacity" values="1;1;0;1" dur="1.3s" begin="-0.2s" repeatCount="indefinite"/>
    <ellipse cx="100" cy="0" rx="4" ry="3" fill="#d4eeff">
      <animate attributeName="cy" from="60" to="134" dur="1.3s" begin="-0.2s" repeatCount="indefinite"/>
    </ellipse>
  </g>
  <g><animate attributeName="opacity" values="1;1;0;1" dur="1.5s" begin="-1.0s" repeatCount="indefinite"/>
    <ellipse cx="118" cy="0" rx="5" ry="4" fill="#d4eeff">
      <animate attributeName="cy" from="62" to="134" dur="1.5s" begin="-1.0s" repeatCount="indefinite"/>
    </ellipse>
  </g>
  <g><animate attributeName="opacity" values="1;1;0;1" dur="1.4s" begin="-0.6s" repeatCount="indefinite"/>
    <ellipse cx="50" cy="0" rx="4" ry="3" fill="#d4eeff">
      <animate attributeName="cy" from="58" to="134" dur="1.4s" begin="-0.6s" repeatCount="indefinite"/>
    </ellipse>
  </g>
  ${tempLabel(temperature)}
</svg>`;
}

// Lightning: dark stormy sky + cloud + flashing bolt
function lightning(temperature?: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">
  <defs>
    <radialGradient id="stormy" cx="50%" cy="30%">
      <stop offset="0%" stop-color="#2a2a4e"/>
      <stop offset="100%" stop-color="#0a0a1a"/>
    </radialGradient>
  </defs>
  <rect width="144" height="144" fill="url(#stormy)"/>
  ${cloud(72, 32, "#4a4a6a")}
  <!-- Lightning bolt -->
  <polygon points="76,54 62,82 72,82 62,110 86,76 74,76 84,54" fill="#ffee00">
    <animate attributeName="opacity" values="0;0;1;1;0.2;1;0;0;0;0" dur="3s" repeatCount="indefinite"/>
  </polygon>
  <!-- Flash effect on background -->
  <rect width="144" height="144" fill="#fffde0" opacity="0">
    <animate attributeName="opacity" values="0;0;0.15;0;0;0;0;0;0;0" dur="3s" repeatCount="indefinite"/>
  </rect>
  ${tempLabel(temperature)}
</svg>`;
}

// Lightning-rainy: dark cloud + flashing bolt + rain streaks
function lightningRainy(temperature?: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">
  <rect width="144" height="144" fill="#3a4a5e"/>
  ${cloud(72, 28, "#505a6a")}
  <!-- Rain streaks (fast) -->
  <g opacity="0.8">
    <line x1="36" y1="0" x2="32" y2="16" stroke="#80aadd" stroke-width="2" stroke-linecap="round">
      <animate attributeName="y1" from="52" to="120" dur="0.6s" begin="0s" repeatCount="indefinite"/>
      <animate attributeName="y2" from="68" to="136" dur="0.6s" begin="0s" repeatCount="indefinite"/>
    </line>
    <line x1="56" y1="0" x2="52" y2="16" stroke="#80aadd" stroke-width="2" stroke-linecap="round">
      <animate attributeName="y1" from="52" to="120" dur="0.6s" begin="-0.2s" repeatCount="indefinite"/>
      <animate attributeName="y2" from="68" to="136" dur="0.6s" begin="-0.2s" repeatCount="indefinite"/>
    </line>
    <line x1="96" y1="0" x2="92" y2="16" stroke="#80aadd" stroke-width="2" stroke-linecap="round">
      <animate attributeName="y1" from="52" to="120" dur="0.6s" begin="-0.4s" repeatCount="indefinite"/>
      <animate attributeName="y2" from="68" to="136" dur="0.6s" begin="-0.4s" repeatCount="indefinite"/>
    </line>
    <line x1="116" y1="0" x2="112" y2="16" stroke="#80aadd" stroke-width="2" stroke-linecap="round">
      <animate attributeName="y1" from="52" to="120" dur="0.6s" begin="-0.1s" repeatCount="indefinite"/>
      <animate attributeName="y2" from="68" to="136" dur="0.6s" begin="-0.1s" repeatCount="indefinite"/>
    </line>
  </g>
  <!-- Lightning bolt -->
  <polygon points="76,50 63,76 72,76 62,100 84,70 73,70 82,50" fill="#ffee00">
    <animate attributeName="opacity" values="0;0;1;1;0.3;1;0;0;0;0" dur="2.5s" repeatCount="indefinite"/>
  </polygon>
  <rect width="144" height="144" fill="#fffde0" opacity="0">
    <animate attributeName="opacity" values="0;0;0.12;0;0;0;0;0;0;0" dur="2.5s" repeatCount="indefinite"/>
  </rect>
  ${tempLabel(temperature)}
</svg>`;
}

// Partly cloudy: blue sky, sun at back, cloud drifting in front
function partlyCloudy(temperature?: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">
  <defs>
    <radialGradient id="partsky" cx="50%" cy="30%">
      <stop offset="0%" stop-color="#60b8f0"/>
      <stop offset="100%" stop-color="#2a8ad4"/>
    </radialGradient>
    <radialGradient id="partsun" cx="40%" cy="40%">
      <stop offset="0%" stop-color="#fff8a0"/>
      <stop offset="100%" stop-color="#ffaa00"/>
    </radialGradient>
  </defs>
  <rect width="144" height="144" fill="url(#partsky)"/>
  <!-- Sun (behind cloud) -->
  <circle cx="48" cy="48" r="22" fill="url(#partsun)">
    <animate attributeName="r" values="22;25;22" dur="3s" repeatCount="indefinite"/>
  </circle>
  <!-- Short sun rays -->
  <g transform="translate(48,48)">
    <animateTransform attributeName="transform" type="rotate" from="0 48 48" to="360 48 48" dur="10s" repeatCount="indefinite" additive="replace"/>
    <line x1="0" y1="-28" x2="0" y2="-36" stroke="#ffcc00" stroke-width="3" stroke-linecap="round"/>
    <line x1="0" y1="-28" x2="0" y2="-36" stroke="#ffcc00" stroke-width="3" stroke-linecap="round" transform="rotate(60 0 0)"/>
    <line x1="0" y1="-28" x2="0" y2="-36" stroke="#ffcc00" stroke-width="3" stroke-linecap="round" transform="rotate(120 0 0)"/>
    <line x1="0" y1="-28" x2="0" y2="-36" stroke="#ffcc00" stroke-width="3" stroke-linecap="round" transform="rotate(180 0 0)"/>
    <line x1="0" y1="-28" x2="0" y2="-36" stroke="#ffcc00" stroke-width="3" stroke-linecap="round" transform="rotate(240 0 0)"/>
    <line x1="0" y1="-28" x2="0" y2="-36" stroke="#ffcc00" stroke-width="3" stroke-linecap="round" transform="rotate(300 0 0)"/>
  </g>
  <!-- Cloud in front -->
  <g>
    <animateTransform attributeName="transform" type="translate" values="0,0;6,0;0,0" dur="7s" repeatCount="indefinite"/>
    ${cloud(82, 52, "#e8f2fa")}
  </g>
  ${tempLabel(temperature)}
</svg>`;
}

// Pouring: dark cloud + many fast heavy rain streaks
function pouring(temperature?: string): string {
    const rainLine = (x: number, delay: string) =>
        `<line x1="${x}" y1="0" x2="${x - 4}" y2="18" stroke="#80aadd" stroke-width="2.5" stroke-linecap="round">
      <animate attributeName="y1" from="54" to="120" dur="0.5s" begin="${delay}" repeatCount="indefinite"/>
      <animate attributeName="y2" from="72" to="138" dur="0.5s" begin="${delay}" repeatCount="indefinite"/>
    </line>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">
  <rect width="144" height="144" fill="#3a4e62"/>
  ${cloud(72, 30, "#586070")}
  ${rainLine(30, "0s")}
  ${rainLine(46, "-0.1s")}
  ${rainLine(62, "-0.2s")}
  ${rainLine(78, "-0.3s")}
  ${rainLine(94, "-0.4s")}
  ${rainLine(110, "-0.15s")}
  ${rainLine(38, "-0.35s")}
  ${rainLine(54, "-0.45s")}
  ${rainLine(70, "-0.05s")}
  ${rainLine(86, "-0.25s")}
  ${rainLine(102, "-0.4s")}
  ${rainLine(118, "-0.1s")}
  ${tempLabel(temperature)}
</svg>`;
}

// Rainy: overcast sky, cloud, moderate falling rain
function rainy(temperature?: string): string {
    const rainLine = (x: number, delay: string) =>
        `<line x1="${x}" y1="0" x2="${x - 3}" y2="14" stroke="#7090c0" stroke-width="2" stroke-linecap="round">
      <animate attributeName="y1" from="56" to="124" dur="0.9s" begin="${delay}" repeatCount="indefinite"/>
      <animate attributeName="y2" from="70" to="138" dur="0.9s" begin="${delay}" repeatCount="indefinite"/>
    </line>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">
  <rect width="144" height="144" fill="#5a7090"/>
  ${cloud(72, 34, "#7080a0")}
  ${rainLine(36, "0s")}
  ${rainLine(56, "-0.3s")}
  ${rainLine(76, "-0.6s")}
  ${rainLine(96, "-0.15s")}
  ${rainLine(116, "-0.45s")}
  ${rainLine(46, "-0.75s")}
  ${rainLine(66, "-0.5s")}
  ${rainLine(86, "-0.2s")}
  ${rainLine(106, "-0.8s")}
  ${tempLabel(temperature)}
</svg>`;
}

// Snowy: light blue sky, cloud, snowflakes falling and spinning
function snowy(temperature?: string): string {
    const flake = (x: number, delay: string, size: number) =>
        `<text x="${x}" y="0" font-size="${size}" fill="white" text-anchor="middle" opacity="0.9">❄
      <animate attributeName="y" from="56" to="138" dur="2s" begin="${delay}" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.9;0.9;0;0.9" dur="2s" begin="${delay}" repeatCount="indefinite"/>
    </text>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">
  <rect width="144" height="144" fill="#7090b4"/>
  ${cloud(72, 32, "#90a8be")}
  ${flake(32, "0s", 14)}
  ${flake(54, "-0.5s", 12)}
  ${flake(74, "-1.0s", 14)}
  ${flake(94, "-1.5s", 12)}
  ${flake(114, "-0.7s", 14)}
  ${flake(44, "-1.2s", 11)}
  ${flake(64, "-0.3s", 13)}
  ${flake(84, "-1.7s", 11)}
  ${flake(104, "-0.9s", 12)}
  ${tempLabel(temperature)}
</svg>`;
}

// Snowy-rainy: mix of rain streaks and snowflakes
function snowyRainy(temperature?: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">
  <rect width="144" height="144" fill="#607888"/>
  ${cloud(72, 30, "#7888a0")}
  <!-- Rain streaks -->
  <line x1="36" y1="0" x2="33" y2="12" stroke="#7090c0" stroke-width="2" stroke-linecap="round">
    <animate attributeName="y1" from="54" to="120" dur="0.8s" begin="0s" repeatCount="indefinite"/>
    <animate attributeName="y2" from="66" to="132" dur="0.8s" begin="0s" repeatCount="indefinite"/>
  </line>
  <line x1="72" y1="0" x2="69" y2="12" stroke="#7090c0" stroke-width="2" stroke-linecap="round">
    <animate attributeName="y1" from="54" to="120" dur="0.8s" begin="-0.3s" repeatCount="indefinite"/>
    <animate attributeName="y2" from="66" to="132" dur="0.8s" begin="-0.3s" repeatCount="indefinite"/>
  </line>
  <line x1="108" y1="0" x2="105" y2="12" stroke="#7090c0" stroke-width="2" stroke-linecap="round">
    <animate attributeName="y1" from="54" to="120" dur="0.8s" begin="-0.6s" repeatCount="indefinite"/>
    <animate attributeName="y2" from="66" to="132" dur="0.8s" begin="-0.6s" repeatCount="indefinite"/>
  </line>
  <!-- Snowflakes -->
  <text x="54" y="0" font-size="13" fill="white" text-anchor="middle" opacity="0.9">❄
    <animate attributeName="y" from="58" to="134" dur="2.2s" begin="-0.4s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.9;0.9;0;0.9" dur="2.2s" begin="-0.4s" repeatCount="indefinite"/>
  </text>
  <text x="90" y="0" font-size="12" fill="white" text-anchor="middle" opacity="0.9">❄
    <animate attributeName="y" from="60" to="134" dur="2.2s" begin="-1.2s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.9;0.9;0;0.9" dur="2.2s" begin="-1.2s" repeatCount="indefinite"/>
  </text>
  <text x="36" y="0" font-size="11" fill="white" text-anchor="middle" opacity="0.9">❄
    <animate attributeName="y" from="58" to="134" dur="2.2s" begin="-1.8s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.9;0.9;0;0.9" dur="2.2s" begin="-1.8s" repeatCount="indefinite"/>
  </text>
  <text x="112" y="0" font-size="13" fill="white" text-anchor="middle" opacity="0.9">❄
    <animate attributeName="y" from="60" to="134" dur="2.2s" begin="-0.9s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.9;0.9;0;0.9" dur="2.2s" begin="-0.9s" repeatCount="indefinite"/>
  </text>
  ${tempLabel(temperature)}
</svg>`;
}

// Windy: blue sky with animated arcing wind streaks scrolling left
function windy(temperature?: string): string {
    const windArc = (y: number, width: number, dur: string, begin: string) =>
        `<path d="M160,${y} Q110,${y - 8} 60,${y} Q10,${y + 8} -40,${y}" fill="none" stroke="white" stroke-width="${width}" stroke-linecap="round" opacity="0.7">
      <animateTransform attributeName="transform" type="translate" values="0,0;-200,0" dur="${dur}" begin="${begin}" repeatCount="indefinite"/>
    </path>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">
  <defs>
    <radialGradient id="windsky" cx="50%" cy="30%">
      <stop offset="0%" stop-color="#70c0f0"/>
      <stop offset="100%" stop-color="#2a90d4"/>
    </radialGradient>
  </defs>
  <rect width="144" height="144" fill="url(#windsky)"/>
  ${windArc(28, 3.5, "1.8s", "0s")}
  ${windArc(44, 2.5, "2.2s", "-0.4s")}
  ${windArc(60, 3.5, "1.9s", "-0.8s")}
  ${windArc(76, 2.5, "2.4s", "-1.2s")}
  ${windArc(92, 3, "1.7s", "-0.6s")}
  ${windArc(108, 2.5, "2.1s", "-1.5s")}
  ${tempLabel(temperature)}
</svg>`;
}

// Windy-variant: cloud + wind streaks
function windyVariant(temperature?: string): string {
    const windLine = (y: number, x1: number, x2: number, delay: string) =>
        `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.7">
      <animateTransform attributeName="transform" type="translate" values="0,0;-20,0;0,0" dur="1.8s" begin="${delay}" repeatCount="indefinite"/>
    </line>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">
  <rect width="144" height="144" fill="#6090b0"/>
  ${cloud(72, 34, "#88a8c0")}
  ${windLine(68, 10, 70, "0s")}
  ${windLine(80, 20, 90, "-0.3s")}
  ${windLine(92, 8, 80, "-0.6s")}
  ${windLine(104, 24, 100, "-0.9s")}
  ${windLine(116, 12, 72, "-0.4s")}
  ${tempLabel(temperature)}
</svg>`;
}

// Exceptional: red/orange background, pulsing warning triangle
function exceptional(temperature?: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">
  <defs>
    <radialGradient id="exceptbg" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#cc4400"/>
      <stop offset="100%" stop-color="#660000"/>
    </radialGradient>
  </defs>
  <rect width="144" height="144" fill="url(#exceptbg)"/>
  <!-- Pulsing outer ring -->
  <circle cx="72" cy="60" r="46" fill="none" stroke="#ff8800" stroke-width="3" opacity="0.5">
    <animate attributeName="r" values="46;54;46" dur="1.5s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.5s" repeatCount="indefinite"/>
  </circle>
  <!-- Warning triangle -->
  <polygon points="72,18 118,96 26,96" fill="#ffcc00">
    <animate attributeName="opacity" values="1;0.6;1" dur="1.5s" repeatCount="indefinite"/>
  </polygon>
  <polygon points="72,30 110,90 34,90" fill="#ff8800"/>
  <!-- Exclamation mark -->
  <rect x="68" y="44" width="8" height="28" rx="3" fill="#1a0000"/>
  <circle cx="72" cy="82" r="5" fill="#1a0000"/>
  ${tempLabel(temperature)}
</svg>`;
}

// Default fallback: neutral background with condition text
function defaultWeather(condition: string, temperature?: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">
  <rect width="144" height="144" fill="#446688"/>
  <text x="72" y="60" text-anchor="middle" fill="white" font-size="13" font-family="Arial,sans-serif" font-weight="bold">${condition}</text>
  ${tempLabel(temperature)}
</svg>`;
}
