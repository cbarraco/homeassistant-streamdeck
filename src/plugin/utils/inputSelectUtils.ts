export function getNextOption(options: unknown[], currentOption: string): string | undefined {
    if (!Array.isArray(options) || options.length === 0) {
        return undefined;
    }
    const currentIndex = options.indexOf(currentOption);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % options.length;
    return options[nextIndex] as string;
}
