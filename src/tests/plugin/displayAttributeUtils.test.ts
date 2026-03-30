import { describe, it, expect } from "vitest";
import { getAttributeDisplayValue } from "../../plugin/actions/displayAttributeUtils";

describe("getAttributeDisplayValue - basic value extraction", () => {
    it("returns the string value of a string attribute", () => {
        const result = getAttributeDisplayValue({ unit_of_measurement: "°C" }, "unit_of_measurement");
        expect(result).toBe("°C");
    });

    it("returns the string representation of a numeric attribute", () => {
        const result = getAttributeDisplayValue({ temperature: 21.5 }, "temperature");
        expect(result).toBe("21.5");
    });

    it("returns the string representation of an integer attribute", () => {
        const result = getAttributeDisplayValue({ battery: 85 }, "battery");
        expect(result).toBe("85");
    });

    it("returns the string representation of a boolean attribute that is true", () => {
        const result = getAttributeDisplayValue({ is_on: true }, "is_on");
        expect(result).toBe("true");
    });

    it("returns the string representation of a boolean attribute that is false", () => {
        const result = getAttributeDisplayValue({ is_on: false }, "is_on");
        expect(result).toBe("false");
    });
});

describe("getAttributeDisplayValue - missing or empty attribute key", () => {
    it("returns empty string when attributeKey is empty string", () => {
        const result = getAttributeDisplayValue({ temperature: 21.5 }, "");
        expect(result).toBe("");
    });

    it("returns empty string when the attribute key does not exist on the entity", () => {
        const result = getAttributeDisplayValue({ temperature: 21.5 }, "humidity");
        expect(result).toBe("");
    });

    it("returns empty string when attributes object is empty", () => {
        const result = getAttributeDisplayValue({}, "temperature");
        expect(result).toBe("");
    });
});

describe("getAttributeDisplayValue - null and undefined attribute values", () => {
    it("returns empty string when the attribute value is null", () => {
        const result = getAttributeDisplayValue({ temperature: null }, "temperature");
        expect(result).toBe("");
    });

    it("returns empty string when the attribute value is undefined", () => {
        const result = getAttributeDisplayValue({ temperature: undefined }, "temperature");
        expect(result).toBe("");
    });
});

describe("getAttributeDisplayValue - array attribute values", () => {
    it("joins array values with a comma and space", () => {
        const result = getAttributeDisplayValue(
            { rgb_color: [255, 128, 0] },
            "rgb_color",
        );
        expect(result).toBe("255, 128, 0");
    });

    it("returns empty string for an empty array attribute", () => {
        const result = getAttributeDisplayValue({ supported_color_modes: [] }, "supported_color_modes");
        expect(result).toBe("");
    });

    it("returns the single element as a string for a single-element array", () => {
        const result = getAttributeDisplayValue({ supported_color_modes: ["color_temp"] }, "supported_color_modes");
        expect(result).toBe("color_temp");
    });
});

describe("getAttributeDisplayValue - real-world attribute examples", () => {
    it("returns the temperature value for a climate entity", () => {
        const result = getAttributeDisplayValue(
            { current_temperature: 22, target_temp_high: 25, target_temp_low: 18 },
            "current_temperature",
        );
        expect(result).toBe("22");
    });

    it("returns the battery percentage for a sensor entity", () => {
        const result = getAttributeDisplayValue(
            { battery_level: 73, unit_of_measurement: "%" },
            "battery_level",
        );
        expect(result).toBe("73");
    });

    it("returns the humidity value for a sensor entity", () => {
        const result = getAttributeDisplayValue(
            { humidity: 55.2, unit_of_measurement: "%" },
            "humidity",
        );
        expect(result).toBe("55.2");
    });

    it("returns the friendly name attribute", () => {
        const result = getAttributeDisplayValue(
            { friendly_name: "Living Room Thermostat" },
            "friendly_name",
        );
        expect(result).toBe("Living Room Thermostat");
    });

    it("returns the zero numeric value instead of empty string", () => {
        const result = getAttributeDisplayValue({ brightness: 0 }, "brightness");
        expect(result).toBe("0");
    });
});
