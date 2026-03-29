import { describe, it, expect } from "vitest";
import { solidColorSvg } from "../../plugin/utils/svg";

describe("solidColorSvg", () => {
    it("returns a string containing an SVG element", () => {
        expect(solidColorSvg("#ff0000")).toContain("<svg");
        expect(solidColorSvg("#ff0000")).toContain("</svg>");
    });

    it("embeds the provided hex color as the fill", () => {
        expect(solidColorSvg("#ff0000")).toContain('fill="#ff0000"');
    });

    it("uses 144x144 dimensions", () => {
        const svg = solidColorSvg("#ffffff");
        expect(svg).toContain('width="144"');
        expect(svg).toContain('height="144"');
    });

    it("produces different output for different colors", () => {
        expect(solidColorSvg("#ff0000")).not.toBe(solidColorSvg("#0000ff"));
    });
});
