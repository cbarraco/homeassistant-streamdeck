import { describe, it, expect } from "vitest";
import { ColorUtils } from "../../shared/colorUtils";

describe("ColorUtils.miredToKelvin", () => {
    it("converts a standard mired value to kelvin", () => {
        expect(ColorUtils.miredToKelvin(200)).toBe(5000);
    });

    it("converts warm mired (high value) to low kelvin", () => {
        expect(ColorUtils.miredToKelvin(500)).toBe(2000);
    });

    it("clamps result to MIN_KELVIN (1000) for very high mired values", () => {
        expect(ColorUtils.miredToKelvin(10000)).toBe(1000);
    });

    it("clamps result to MAX_KELVIN (40000) for very low mired values", () => {
        expect(ColorUtils.miredToKelvin(1)).toBe(40000);
    });

    it("guards against division by zero for mired = 0", () => {
        expect(() => ColorUtils.miredToKelvin(0)).not.toThrow();
        expect(ColorUtils.miredToKelvin(0)).toBe(40000);
    });
});

describe("ColorUtils.kelvinToRgb", () => {
    it("returns pure white for 6500K (standard daylight)", () => {
        const { red, green, blue } = ColorUtils.kelvinToRgb(6500);
        expect(red).toBe(255);
        expect(green).toBeGreaterThan(200);
        expect(blue).toBeGreaterThan(200);
    });

    it("returns warm (red-heavy) color for low kelvin (1500K)", () => {
        const { red, green, blue } = ColorUtils.kelvinToRgb(1500);
        expect(red).toBe(255);
        expect(green).toBeLessThan(red);
        expect(blue).toBe(0);
    });

    it("returns cool (blue-present) color for high kelvin (10000K)", () => {
        const { red, blue } = ColorUtils.kelvinToRgb(10000);
        expect(blue).toBe(255);
        expect(red).toBeLessThan(blue);
    });

    it("clamps all RGB channels to 0-255", () => {
        for (const kelvin of [500, 1000, 6500, 10000, 40000]) {
            const { red, green, blue } = ColorUtils.kelvinToRgb(kelvin);
            expect(red).toBeGreaterThanOrEqual(0);
            expect(red).toBeLessThanOrEqual(255);
            expect(green).toBeGreaterThanOrEqual(0);
            expect(green).toBeLessThanOrEqual(255);
            expect(blue).toBeGreaterThanOrEqual(0);
            expect(blue).toBeLessThanOrEqual(255);
        }
    });
});

describe("ColorUtils.rgbToHex", () => {
    it("converts white to #ffffff", () => {
        expect(ColorUtils.rgbToHex(255, 255, 255)).toBe("#ffffff");
    });

    it("converts black to #000000", () => {
        expect(ColorUtils.rgbToHex(0, 0, 0)).toBe("#000000");
    });

    it("converts red to #ff0000", () => {
        expect(ColorUtils.rgbToHex(255, 0, 0)).toBe("#ff0000");
    });

    it("zero-pads single hex digit components", () => {
        expect(ColorUtils.rgbToHex(0, 16, 255)).toBe("#0010ff");
    });
});

describe("ColorUtils.hexToRgb", () => {
    it("parses #ffffff as white", () => {
        expect(ColorUtils.hexToRgb("#ffffff")).toEqual({ red: 255, green: 255, blue: 255 });
    });

    it("parses #000000 as black", () => {
        expect(ColorUtils.hexToRgb("#000000")).toEqual({ red: 0, green: 0, blue: 0 });
    });

    it("parses #ff0000 as red", () => {
        expect(ColorUtils.hexToRgb("#ff0000")).toEqual({ red: 255, green: 0, blue: 0 });
    });

    it("returns null for an invalid hex string", () => {
        expect(ColorUtils.hexToRgb("not-a-color")).toBeNull();
        expect(ColorUtils.hexToRgb("#gg0000")).toBeNull();
    });

    it("is the inverse of rgbToHex", () => {
        const original = { red: 123, green: 45, blue: 200 };
        const hex = ColorUtils.rgbToHex(original.red, original.green, original.blue);
        expect(ColorUtils.hexToRgb(hex)).toEqual(original);
    });
});

describe("ColorUtils.miredToHex", () => {
    it("returns a valid hex string", () => {
        const hex = ColorUtils.miredToHex(200);
        expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    });

    it("produces a warm (reddish) hex for high mired values", () => {
        const { red, blue } = ColorUtils.hexToRgb(ColorUtils.miredToHex(500))!;
        expect(red).toBeGreaterThan(blue);
    });
});
