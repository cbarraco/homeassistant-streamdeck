/**
 * Returns an array of static SVG frames that can be cycled to produce weather animations.
 * Stream Deck rasterizes SVG to a bitmap so SMIL animations don't work; use setInterval + frame cycling instead.
 */
export function getWeatherFrames(condition: string, temperature?: string): string[] {
    switch (condition) {
        case "sunny": return sunnyFrames(temperature);
        case "clear-night": return clearNightFrames(temperature);
        case "cloudy": return cloudyFrames(temperature);
        case "fog": return fogFrames(temperature);
        case "hail": return hailFrames(temperature);
        case "lightning": return lightningFrames(temperature);
        case "lightning-rainy": return lightningRainyFrames(temperature);
        case "partlycloudy": return partlyCloudyFrames(temperature);
        case "pouring": return pouringFrames(temperature);
        case "rainy": return rainyFrames(temperature);
        case "snowy": return snowyFrames(temperature);
        case "snowy-rainy": return snowyRainyFrames(temperature);
        case "windy": return windyFrames(temperature);
        case "windy-variant": return windyVariantFrames(temperature);
        case "exceptional": return exceptionalFrames(temperature);
        default: return [defaultWeather(condition, temperature)];
    }
}

/** Interval in ms between frames */
export const WEATHER_FRAME_INTERVAL_MS = 250;

// ─── Helpers ────────────────────────────────────────────────────────────────

function svg(body: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">${body}</svg>`;
}

function tempLabel(temperature?: string): string {
    if (!temperature) return "";
    return `<text x="72" y="136" text-anchor="middle" fill="white" font-size="20" font-family="Arial,sans-serif" font-weight="bold" stroke="#000000" stroke-width="3" paint-order="stroke">${temperature}</text>`;
}

function cloudShape(cx: number, cy: number, fill: string): string {
    return `<ellipse cx="${cx - 18}" cy="${cy + 8}" rx="16" ry="12" fill="${fill}"/>` +
        `<ellipse cx="${cx}" cy="${cy}" rx="20" ry="16" fill="${fill}"/>` +
        `<ellipse cx="${cx + 20}" cy="${cy + 8}" rx="16" ry="12" fill="${fill}"/>` +
        `<rect x="${cx - 33}" y="${cy + 8}" width="69" height="14" fill="${fill}"/>`;
}

// ─── Sunny: rotating sun (8 frames × 45°) ───────────────────────────────────

function sunBody(rotateDeg: number, temperature?: string): string {
    const rays = [0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
        const r = (deg + rotateDeg) * (Math.PI / 180);
        const x1 = Math.round(72 + Math.cos(r) * 28);
        const y1 = Math.round(56 + Math.sin(r) * 28);
        const x2 = Math.round(72 + Math.cos(r) * 42);
        const y2 = Math.round(56 + Math.sin(r) * 42);
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffcc00" stroke-width="4" stroke-linecap="round"/>`;
    }).join("");
    return svg(
        `<defs><radialGradient id="sk"><stop offset="0%" stop-color="#60b8f0"/><stop offset="100%" stop-color="#1a7ac4"/></radialGradient>` +
        `<radialGradient id="sn" cx="40%" cy="40%"><stop offset="0%" stop-color="#fff8a0"/><stop offset="100%" stop-color="#ffaa00"/></radialGradient></defs>` +
        `<rect width="144" height="144" fill="url(#sk)"/>` +
        rays +
        `<circle cx="72" cy="56" r="24" fill="url(#sn)"/>` +
        tempLabel(temperature)
    );
}

function sunnyFrames(temperature?: string): string[] {
    return [0, 45, 90, 135, 180, 225, 270, 315].map(deg => sunBody(deg, temperature));
}

// ─── Clear night: twinkling stars (4 frames) ────────────────────────────────

function clearNightFrames(temperature?: string): string[] {
    const stars = [
        { x: 22, y: 18 }, { x: 48, y: 28 }, { x: 102, y: 14 }, { x: 122, y: 34 },
        { x: 32, y: 50 }, { x: 118, y: 52 }, { x: 62, y: 10 }, { x: 85, y: 24 },
    ];
    const bg =
        `<defs><radialGradient id="ns"><stop offset="0%" stop-color="#1a2f5c"/><stop offset="100%" stop-color="#050d1a"/></radialGradient></defs>` +
        `<rect width="144" height="144" fill="url(#ns)"/>`;
    const moon =
        `<circle cx="72" cy="58" r="26" fill="#fffacc"/><circle cx="84" cy="50" r="22" fill="#1a2f5c"/>`;

    return [0, 1, 2, 3].map(frame =>
        svg(bg + stars.map((s, i) => {
            const op = ((i + frame) % 4 === 0) ? "0.2" : "1";
            return `<circle cx="${s.x}" cy="${s.y}" r="2" fill="white" opacity="${op}"/>`;
        }).join("") + moon + tempLabel(temperature))
    );
}

// ─── Cloudy: drifting clouds (4 frames) ──────────────────────────────────────

function cloudyFrames(temperature?: string): string[] {
    const offsets = [0, 4, 8, 4];
    return offsets.map(ox =>
        svg(
            `<rect width="144" height="144" fill="#6a8aaa"/>` +
            `<g transform="translate(${ox - 4},0)" opacity="0.55">${cloudShape(50, 68, "#9ab4c8")}</g>` +
            `<g transform="translate(${-ox},0)">${cloudShape(76, 44, "#dde8f0")}</g>` +
            tempLabel(temperature)
        )
    );
}

// ─── Fog: scrolling bands (4 frames) ─────────────────────────────────────────

function fogFrames(temperature?: string): string[] {
    const bandShifts = [0, 8, 16, 8];
    return bandShifts.map(shift =>
        svg(
            `<rect width="144" height="144" fill="#b0bcc4"/>` +
            [22, 40, 57, 75, 92, 108].map((y, i) => {
                const dx = i % 2 === 0 ? shift : -shift;
                const w = i % 2 === 0 ? 11 : 9;
                const op = ["0.6", "0.5", "0.65", "0.45", "0.55", "0.4"][i];
                return `<rect x="${dx}" y="${y}" width="200" height="${w}" rx="5" fill="white" opacity="${op}"/>`;
            }).join("") +
            tempLabel(temperature)
        )
    );
}

// ─── Hail: falling stones (4 frames) ─────────────────────────────────────────

function hailFrames(temperature?: string): string[] {
    const stoneXs = [40, 60, 80, 100, 118, 50];
    const totalFall = 72; // from cloud bottom to bottom of key
    return [0, 1, 2, 3].map(frame =>
        svg(
            `<rect width="144" height="144" fill="#4a6480"/>` +
            cloudShape(72, 34, "#708090") +
            stoneXs.map((x, i) => {
                const phase = (frame + i * 2) % 4;
                const y = 62 + Math.round((phase / 4) * totalFall);
                return `<ellipse cx="${x}" cy="${y}" rx="5" ry="4" fill="#d4eeff"/>`;
            }).join("") +
            tempLabel(temperature)
        )
    );
}

// ─── Lightning: bolt flash (6 frames) ────────────────────────────────────────

function lightningFrames(temperature?: string): string[] {
    const bolt = `<polygon points="76,54 62,82 72,82 62,110 86,76 74,76 84,54" fill="#ffee00"/>`;
    const boltHidden = `<polygon points="76,54 62,82 72,82 62,110 86,76 74,76 84,54" fill="#ffee00" opacity="0"/>`;
    const bgNormal =
        `<defs><radialGradient id="st"><stop offset="0%" stop-color="#2a2a4e"/><stop offset="100%" stop-color="#0a0a1a"/></radialGradient></defs>` +
        `<rect width="144" height="144" fill="url(#st)"/>` + cloudShape(72, 32, "#4a4a6a");
    const bgFlash =
        `<defs><radialGradient id="st"><stop offset="0%" stop-color="#3a3a6e"/><stop offset="100%" stop-color="#1a1a3a"/></radialGradient></defs>` +
        `<rect width="144" height="144" fill="url(#st)"/>` + cloudShape(72, 32, "#5a5a8a");

    // frames: 0=off, 1=off, 2=flash, 3=bright, 4=off, 5=off
    return [
        svg(bgNormal + boltHidden + tempLabel(temperature)),
        svg(bgNormal + boltHidden + tempLabel(temperature)),
        svg(bgFlash + bolt + tempLabel(temperature)),
        svg(bgFlash + bolt + tempLabel(temperature)),
        svg(bgNormal + boltHidden + tempLabel(temperature)),
        svg(bgNormal + boltHidden + tempLabel(temperature)),
    ];
}

// ─── Lightning+Rain: bolt + falling rain (6 frames) ──────────────────────────

function rainLines(frame: number, color: string, count: number): string {
    const totalFall = 72;
    const xs = [36, 56, 76, 96, 116, 46, 66, 86, 106].slice(0, count);
    return xs.map((x, i) => {
        const phase = (frame + i) % 4;
        const y = 54 + Math.round((phase / 4) * totalFall);
        return `<line x1="${x}" y1="${y}" x2="${x - 3}" y2="${y + 14}" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
    }).join("");
}

function lightningRainyFrames(temperature?: string): string[] {
    const bolt = `<polygon points="76,50 63,76 72,76 62,100 84,70 73,70 82,50" fill="#ffee00"/>`;
    const boltHidden = `<polygon points="76,50 63,76 72,76 62,100 84,70 73,70 82,50" fill="#ffee00" opacity="0"/>`;
    const bgNormal = `<rect width="144" height="144" fill="#3a4a5e"/>` + cloudShape(72, 28, "#505a6a");
    const bgFlash = `<rect width="144" height="144" fill="#4a5a6e"/>` + cloudShape(72, 28, "#606a7a");

    return [0, 1, 2, 3, 4, 5].map(frame => {
        const isFlash = frame === 2 || frame === 3;
        return svg(
            (isFlash ? bgFlash : bgNormal) +
            rainLines(frame, "#80aadd", 4) +
            (isFlash ? bolt : boltHidden) +
            tempLabel(temperature)
        );
    });
}

// ─── Partly cloudy: cloud slides across rotating sun (8 frames) ──────────────

function partlyCloudyFrames(temperature?: string): string[] {
    const cloudOffsets = [0, 2, 4, 6, 8, 6, 4, 2];
    return cloudOffsets.map((ox, i) => {
        const deg = i * 45;
        const r = deg * (Math.PI / 180);
        const rays = [0, 60, 120, 180, 240, 300].map(d => {
            const ra = (d + deg) * (Math.PI / 180);
            const x1 = Math.round(48 + Math.cos(ra) * 28);
            const y1 = Math.round(48 + Math.sin(ra) * 28);
            const x2 = Math.round(48 + Math.cos(ra) * 36);
            const y2 = Math.round(48 + Math.sin(ra) * 36);
            return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffcc00" stroke-width="3" stroke-linecap="round"/>`;
        }).join("");
        return svg(
            `<defs><radialGradient id="psk"><stop offset="0%" stop-color="#60b8f0"/><stop offset="100%" stop-color="#2a8ad4"/></radialGradient>` +
            `<radialGradient id="psn" cx="40%" cy="40%"><stop offset="0%" stop-color="#fff8a0"/><stop offset="100%" stop-color="#ffaa00"/></radialGradient></defs>` +
            `<rect width="144" height="144" fill="url(#psk)"/>` +
            rays +
            `<circle cx="48" cy="48" r="22" fill="url(#psn)"/>` +
            `<g transform="translate(${ox},0)">${cloudShape(82, 52, "#e8f2fa")}</g>` +
            tempLabel(temperature)
        );
    });
}

// ─── Pouring: fast heavy rain (4 frames) ─────────────────────────────────────

function pouringFrames(temperature?: string): string[] {
    const xs = [30, 46, 62, 78, 94, 110, 38, 54, 70, 86, 102, 118];
    const totalFall = 64;
    return [0, 1, 2, 3].map(frame =>
        svg(
            `<rect width="144" height="144" fill="#3a4e62"/>` +
            cloudShape(72, 30, "#586070") +
            xs.map((x, i) => {
                const phase = (frame + i) % 4;
                const y = 56 + Math.round((phase / 4) * totalFall);
                return `<line x1="${x}" y1="${y}" x2="${x - 4}" y2="${y + 18}" stroke="#80aadd" stroke-width="2.5" stroke-linecap="round"/>`;
            }).join("") +
            tempLabel(temperature)
        )
    );
}

// ─── Rainy: moderate rain (4 frames) ─────────────────────────────────────────

function rainyFrames(temperature?: string): string[] {
    const xs = [36, 56, 76, 96, 116, 46, 66, 86, 106];
    const totalFall = 62;
    return [0, 1, 2, 3].map(frame =>
        svg(
            `<rect width="144" height="144" fill="#5a7090"/>` +
            cloudShape(72, 34, "#7080a0") +
            xs.map((x, i) => {
                const phase = (frame + i) % 4;
                const y = 56 + Math.round((phase / 4) * totalFall);
                return `<line x1="${x}" y1="${y}" x2="${x - 3}" y2="${y + 14}" stroke="#7090c0" stroke-width="2" stroke-linecap="round"/>`;
            }).join("") +
            tempLabel(temperature)
        )
    );
}

// ─── Snowy: falling snowflakes (4 frames) ────────────────────────────────────

function snowflake(x: number, y: number, size: number): string {
    const s = size / 2;
    return `<line x1="${x - s}" y1="${y}" x2="${x + s}" y2="${y}" stroke="white" stroke-width="2" stroke-linecap="round"/>` +
        `<line x1="${x}" y1="${y - s}" x2="${x}" y2="${y + s}" stroke="white" stroke-width="2" stroke-linecap="round"/>` +
        `<line x1="${x - s * 0.7}" y1="${y - s * 0.7}" x2="${x + s * 0.7}" y2="${y + s * 0.7}" stroke="white" stroke-width="1.5" stroke-linecap="round"/>` +
        `<line x1="${x + s * 0.7}" y1="${y - s * 0.7}" x2="${x - s * 0.7}" y2="${y + s * 0.7}" stroke="white" stroke-width="1.5" stroke-linecap="round"/>`;
}

function snowyFrames(temperature?: string): string[] {
    const flakes = [
        { x: 32, size: 10 }, { x: 54, size: 8 }, { x: 74, size: 10 },
        { x: 94, size: 8 }, { x: 114, size: 10 }, { x: 44, size: 9 },
        { x: 64, size: 8 }, { x: 84, size: 9 }, { x: 104, size: 8 },
    ];
    const totalFall = 72;
    return [0, 1, 2, 3].map(frame =>
        svg(
            `<rect width="144" height="144" fill="#7090b4"/>` +
            cloudShape(72, 32, "#90a8be") +
            flakes.map((f, i) => {
                const phase = (frame + i * 2) % 4;
                const y = 58 + Math.round((phase / 4) * totalFall);
                return snowflake(f.x, y, f.size);
            }).join("") +
            tempLabel(temperature)
        )
    );
}

// ─── Snowy-rainy: mixed (4 frames) ───────────────────────────────────────────

function snowyRainyFrames(temperature?: string): string[] {
    const rainXs = [36, 72, 108];
    const flakeXs = [54, 90, 36, 112];
    const totalFall = 72;
    return [0, 1, 2, 3].map(frame =>
        svg(
            `<rect width="144" height="144" fill="#607888"/>` +
            cloudShape(72, 30, "#7888a0") +
            rainXs.map((x, i) => {
                const phase = (frame + i * 2) % 4;
                const y = 54 + Math.round((phase / 4) * totalFall);
                return `<line x1="${x}" y1="${y}" x2="${x - 3}" y2="${y + 12}" stroke="#7090c0" stroke-width="2" stroke-linecap="round"/>`;
            }).join("") +
            flakeXs.map((x, i) => {
                const phase = (frame + i * 3) % 4;
                const y = 58 + Math.round((phase / 4) * totalFall);
                return snowflake(x, y, 9);
            }).join("") +
            tempLabel(temperature)
        )
    );
}

// ─── Windy: scrolling wind arcs (4 frames) ───────────────────────────────────

function windyFrames(temperature?: string): string[] {
    const arcYs = [28, 44, 60, 76, 92, 108];
    const shifts = [0, 12, 24, 12];
    return shifts.map(shift =>
        svg(
            `<defs><radialGradient id="wsk"><stop offset="0%" stop-color="#70c0f0"/><stop offset="100%" stop-color="#2a90d4"/></radialGradient></defs>` +
            `<rect width="144" height="144" fill="url(#wsk)"/>` +
            arcYs.map((y, i) => {
                const dx = i % 2 === 0 ? -shift : shift;
                const w = i % 2 === 0 ? 3.5 : 2.5;
                return `<path d="M${16 + dx},${y} Q${60 + dx},${y - 8} ${104 + dx},${y} Q${128 + dx},${y + 6} ${144 + dx},${y}" ` +
                    `fill="none" stroke="white" stroke-width="${w}" stroke-linecap="round" opacity="0.75"/>`;
            }).join("") +
            tempLabel(temperature)
        )
    );
}

// ─── Windy-variant: cloud + scrolling wind lines (4 frames) ──────────────────

function windyVariantFrames(temperature?: string): string[] {
    const lineYs = [68, 80, 92, 104, 116];
    const shifts = [0, 6, 12, 6];
    return shifts.map(shift =>
        svg(
            `<rect width="144" height="144" fill="#6090b0"/>` +
            cloudShape(72, 34, "#88a8c0") +
            lineYs.map((y, i) => {
                const dx = i % 2 === 0 ? -shift : shift;
                const x1 = 10 + dx;
                const x2 = 90 + dx;
                return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.75"/>`;
            }).join("") +
            tempLabel(temperature)
        )
    );
}

// ─── Exceptional: pulsing warning triangle (4 frames) ────────────────────────

function exceptionalFrames(temperature?: string): string[] {
    const sizes = [46, 52, 56, 52];
    return sizes.map(r =>
        svg(
            `<defs><radialGradient id="ebg"><stop offset="0%" stop-color="#cc4400"/><stop offset="100%" stop-color="#660000"/></radialGradient></defs>` +
            `<rect width="144" height="144" fill="url(#ebg)"/>` +
            `<circle cx="72" cy="60" r="${r}" fill="none" stroke="#ff8800" stroke-width="3" opacity="0.4"/>` +
            `<polygon points="72,18 118,96 26,96" fill="#ffcc00"/>` +
            `<polygon points="72,30 110,90 34,90" fill="#ff8800"/>` +
            `<rect x="68" y="44" width="8" height="28" rx="3" fill="#1a0000"/>` +
            `<circle cx="72" cy="82" r="5" fill="#1a0000"/>` +
            tempLabel(temperature)
        )
    );
}

// ─── Default fallback ─────────────────────────────────────────────────────────

function defaultWeather(condition: string, temperature?: string): string {
    return svg(
        `<rect width="144" height="144" fill="#446688"/>` +
        `<text x="72" y="60" text-anchor="middle" fill="white" font-size="13" font-family="Arial,sans-serif" font-weight="bold">${condition}</text>` +
        tempLabel(temperature)
    );
}
