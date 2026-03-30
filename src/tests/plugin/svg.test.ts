import { describe, it, expect } from "vitest";
import { solidColorSvg, disconnectedSvg } from "../../plugin/utils/svg";

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

describe("disconnectedSvg", () => {
    it("returns a string containing an SVG element", () => {
        expect(disconnectedSvg()).toContain("<svg");
        expect(disconnectedSvg()).toContain("</svg>");
    });

    it("uses 144x144 dimensions", () => {
        const svg = disconnectedSvg();
        expect(svg).toContain('width="144"');
        expect(svg).toContain('height="144"');
    });

    it("contains a gray background rect", () => {
        expect(disconnectedSvg()).toContain('fill="#555555"');
    });

    it("contains a warning triangle polygon", () => {
        expect(disconnectedSvg()).toContain("<polygon");
    });

    it("contains a yellow warning color for the triangle", () => {
        expect(disconnectedSvg()).toContain('fill="#FFCC00"');
    });

    it("returns the same output on every call", () => {
        expect(disconnectedSvg()).toBe(disconnectedSvg());
    });

    it("produces output different from a solid color SVG", () => {
        expect(disconnectedSvg()).not.toBe(solidColorSvg("#555555"));
    });
});
