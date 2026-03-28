/**
 * Utility helpers for converting between the color representations used by
 * Home Assistant (mireds, Kelvin, RGB) and Stream Deck (hex strings).
 * The conversion formulas are adapted from Tanner Helland's approximation:
 * https://tannerhelland.com/2012/09/18/convert-temperature-rgb-algorithm-code.html
 */

export interface RGBColor {
    red: number;
    green: number;
    blue: number;
}

const BYTE_MIN = 0;
const BYTE_MAX = 255;
const MIN_KELVIN = 1000; // Avoid unrealistic temps produced by bad sensor data.
const MAX_KELVIN = 40000;
const MIN_NORMALIZED_TEMP = MIN_KELVIN / 100;
const MAX_NORMALIZED_TEMP = MAX_KELVIN / 100;

export class ColorUtils {
    static miredToHex(mired: number): string {
        const kelvin = ColorUtils.miredToKelvin(mired);
        const rgb = ColorUtils.kelvinToRgb(kelvin);
        return ColorUtils.rgbToHex(rgb.red, rgb.green, rgb.blue);
    }

    static miredToKelvin(mired: number): number {
        const sanitizedMired = Math.max(1, mired); // guard against division by zero
        const kelvin = Math.round(1_000_000 / sanitizedMired);
        return clamp(kelvin, MIN_KELVIN, MAX_KELVIN);
    }

    static kelvinToRgb(kelvin: number): RGBColor {
        const temperature = clamp(Math.round(kelvin / 100), MIN_NORMALIZED_TEMP, MAX_NORMALIZED_TEMP);

        const red =
            temperature <= 66
                ? BYTE_MAX
                : clampByte(329.698727446 * Math.pow(temperature - 60, -0.1332047592));

        const green =
            temperature <= 66
                ? clampByte(99.4708025861 * Math.log(temperature) - 161.1195681661)
                : clampByte(288.1221695283 * Math.pow(temperature - 60, -0.0755148492));

        const blue =
            temperature >= 66
                ? BYTE_MAX
                : temperature <= 19
                  ? BYTE_MIN
                  : clampByte(138.5177312231 * Math.log(temperature - 10) - 305.0447927307);

        return { red, green, blue };
    }

    static rgbToHex(r: number, g: number, b: number): string {
        return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
    }

    static hexToRgb(hex: string): RGBColor | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) {
            return null;
        }

        return {
            red: parseInt(result[1], 16),
            green: parseInt(result[2], 16),
            blue: parseInt(result[3], 16),
        };
    }
}

function clampByte(value: number): number {
    return clamp(Math.round(value), BYTE_MIN, BYTE_MAX);
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function componentToHex(component: number): string {
    const clamped = clampByte(component);
    const hex = clamped.toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
}
