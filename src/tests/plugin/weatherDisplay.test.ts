import { describe, it, expect } from "vitest";
import { formatWeatherTitle } from "../../plugin/actions/weatherUtils";
import type { HomeAssistantEntity } from "../../shared/types";

function makeWeatherEntity(
    state: string,
    temperature?: number,
    temperatureUnit?: string,
): HomeAssistantEntity {
    return {
        entity_id: "weather.home",
        state,
        attributes: {
            ...(temperature !== undefined ? { temperature } : {}),
            ...(temperatureUnit !== undefined ? { temperature_unit: temperatureUnit } : {}),
        },
    };
}

describe("formatWeatherTitle", () => {
    it("returns condition and temperature with unit when all fields are present", () => {
        const entity = makeWeatherEntity("sunny", 22, "°C");
        expect(formatWeatherTitle(entity)).toBe("sunny\n22°C");
    });

    it("returns condition only when temperature attribute is absent", () => {
        const entity = makeWeatherEntity("cloudy");
        expect(formatWeatherTitle(entity)).toBe("cloudy");
    });

    it("uses fallback degree symbol when temperature is present but temperature_unit is absent", () => {
        const entity = makeWeatherEntity("rainy", 15);
        expect(formatWeatherTitle(entity)).toBe("rainy\n15°");
    });

    it("formats Fahrenheit unit correctly", () => {
        const entity = makeWeatherEntity("clear-night", 72, "°F");
        expect(formatWeatherTitle(entity)).toBe("clear-night\n72°F");
    });

    it("handles negative temperatures", () => {
        const entity = makeWeatherEntity("snowy", -5, "°C");
        expect(formatWeatherTitle(entity)).toBe("snowy\n-5°C");
    });

    it("handles decimal temperatures", () => {
        const entity = makeWeatherEntity("partlycloudy", 18.5, "°C");
        expect(formatWeatherTitle(entity)).toBe("partlycloudy\n18.5°C");
    });

    it("handles zero temperature", () => {
        const entity = makeWeatherEntity("snowy", 0, "°C");
        expect(formatWeatherTitle(entity)).toBe("snowy\n0°C");
    });

    it("handles various weather condition strings", () => {
        const conditions = ["sunny", "cloudy", "rainy", "snowy", "windy", "fog", "hail", "lightning", "pouring"];
        for (const condition of conditions) {
            const entity = makeWeatherEntity(condition, 20, "°C");
            expect(formatWeatherTitle(entity)).toBe(`${condition}\n20°C`);
        }
    });

    it("uses the state string as-is for the condition line", () => {
        const entity = makeWeatherEntity("lightning-rainy", 10, "°C");
        expect(formatWeatherTitle(entity)).toContain("lightning-rainy");
    });

    it("separates condition and temperature with a newline", () => {
        const entity = makeWeatherEntity("sunny", 25, "°C");
        const parts = formatWeatherTitle(entity).split("\n");
        expect(parts).toHaveLength(2);
        expect(parts[0]).toBe("sunny");
        expect(parts[1]).toBe("25°C");
    });
});
