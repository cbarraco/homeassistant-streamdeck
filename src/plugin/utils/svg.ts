export function solidColorSvg(hexColor: string): string {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">
            <rect width="144" height="144" fill="${hexColor}" />
        </svg>
    `;
}

export function disconnectedSvg(): string {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">
            <rect width="144" height="144" fill="#555555"/>
            <polygon points="72,22 126,112 18,112" fill="#FFCC00"/>
            <rect x="68" y="42" width="8" height="38" fill="#555555"/>
            <circle cx="72" cy="95" r="6" fill="#555555"/>
        </svg>
    `;
}
