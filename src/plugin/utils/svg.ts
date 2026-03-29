export function solidColorSvg(hexColor: string): string {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="144" height="144">
            <rect width="144" height="144" fill="${hexColor}" />
        </svg>
    `;
}
