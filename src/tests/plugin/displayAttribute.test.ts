import { describe, it, expect } from "vitest";
import { getAttributeValue } from "../../plugin/actions/displayAttributeUtils";
import type { HomeAssistantEntity } from "../../shared/types";

function makeEntity(entityId: string, attributes: Record<string, unknown> = {}): HomeAssistantEntity {
    return {
        entity_id: entityId,
        state: "on",
        attributes: attributes as HomeAssistantEntity["attributes"],
    };
}

describe("getAttributeValue - basic attribute retrieval", () => {
    it("returns the string value of a string attribute", () => {
        const entity = makeEntity("sensor.living_room", { friendly_name: "Living Room" });
        expect(getAttributeValue(entity, "friendly_name")).toBe("Living Room");
    });

    it("returns the string representation of a numeric attribute", () => {
        const entity = makeEntity("sensor.temperature", { temperature: 21.5 });
        expect(getAttributeValue(entity, "temperature")).toBe("21.5");
    });

    it("returns the string representation of an integer attribute", () => {
        const entity = makeEntity("sensor.battery", { battery_level: 85 });
        expect(getAttributeValue(entity, "battery_level")).toBe("85");
    });

    it("returns the string representation of a boolean attribute that is true", () => {
        const entity = makeEntity("switch.lamp", { is_on: true });
        expect(getAttributeValue(entity, "is_on")).toBe("true");
    });

    it("returns the string representation of a boolean attribute that is false", () => {
        const entity = makeEntity("switch.lamp", { is_on: false });
        expect(getAttributeValue(entity, "is_on")).toBe("false");
    });

    it("returns zero as the string '0' for a numeric zero attribute", () => {
        const entity = makeEntity("sensor.co2", { co2_level: 0 });
        expect(getAttributeValue(entity, "co2_level")).toBe("0");
    });
});

describe("getAttributeValue - array attribute handling", () => {
    it("joins array values with a comma and space", () => {
        const entity = makeEntity("light.bedroom", { supported_color_modes: ["hs", "rgb"] });
        expect(getAttributeValue(entity, "supported_color_modes")).toBe("hs, rgb");
    });

    it("joins a single-element array without a trailing separator", () => {
        const entity = makeEntity("light.hall", { supported_color_modes: ["onoff"] });
        expect(getAttributeValue(entity, "supported_color_modes")).toBe("onoff");
    });

    it("joins a numeric array with a comma and space", () => {
        const entity = makeEntity("light.rgb", { rgb_color: [255, 128, 0] });
        expect(getAttributeValue(entity, "rgb_color")).toBe("255, 128, 0");
    });

    it("returns an empty string for an empty array", () => {
        const entity = makeEntity("light.test", { color_modes: [] });
        expect(getAttributeValue(entity, "color_modes")).toBe("");
    });
});

describe("getAttributeValue - missing or null attribute", () => {
    it("returns null when the attribute key does not exist on the entity", () => {
        const entity = makeEntity("sensor.humidity", { humidity: 60 });
        expect(getAttributeValue(entity, "nonexistent_key")).toBeNull();
    });

    it("returns null when the attribute value is undefined", () => {
        const entity = makeEntity("sensor.test", { color_mode: undefined });
        expect(getAttributeValue(entity, "color_mode")).toBeNull();
    });

    it("returns null when the attribute value is null", () => {
        const entity = makeEntity("sensor.test", { color_mode: null });
        expect(getAttributeValue(entity, "color_mode")).toBeNull();
    });

    it("returns null when attributes object is empty and key is requested", () => {
        const entity = makeEntity("sensor.empty", {});
        expect(getAttributeValue(entity, "temperature")).toBeNull();
    });
});

describe("getAttributeValue - empty or missing attribute key", () => {
    it("returns null when the attribute key is an empty string", () => {
        const entity = makeEntity("sensor.temperature", { temperature: 22 });
        expect(getAttributeValue(entity, "")).toBeNull();
    });
});

describe("getAttributeValue - real-world attribute examples", () => {
    it("returns the temperature attribute for a climate entity", () => {
        const entity = makeEntity("climate.living_room", { current_temperature: 19.5, target_temp: 22 });
        expect(getAttributeValue(entity, "current_temperature")).toBe("19.5");
    });

    it("returns the battery percentage attribute for a sensor entity", () => {
        const entity = makeEntity("sensor.door_sensor", { battery: 42 });
        expect(getAttributeValue(entity, "battery")).toBe("42");
    });

    it("returns the humidity attribute for a weather entity", () => {
        const entity = makeEntity("weather.home", { humidity: 55 });
        expect(getAttributeValue(entity, "humidity")).toBe("55");
    });

    it("returns the unit_of_measurement attribute", () => {
        const entity = makeEntity("sensor.power", { unit_of_measurement: "W" });
        expect(getAttributeValue(entity, "unit_of_measurement")).toBe("W");
    });

    it("returns the friendly_name attribute used for display labels", () => {
        const entity = makeEntity("light.kitchen", { friendly_name: "Kitchen Light" });
        expect(getAttributeValue(entity, "friendly_name")).toBe("Kitchen Light");
    });
});
