import { describe, it, expect } from "vitest";
import { buildFanServiceCall } from "../../plugin/actions/fanControlUtils";

describe("buildFanServiceCall - toggle command", () => {
    it("returns fan.toggle service for the toggle command", () => {
        const result = buildFanServiceCall("toggle", "fan.bedroom", 10);
        expect(result.domain).toBe("fan");
        expect(result.service).toBe("toggle");
    });

    it("includes the entity_id in service data for toggle", () => {
        const result = buildFanServiceCall("toggle", "fan.bedroom", 10);
        expect(result.serviceData).toEqual({ entity_id: "fan.bedroom" });
    });

    it("does not include percentage_step in service data for toggle", () => {
        const result = buildFanServiceCall("toggle", "fan.bedroom", 25);
        expect(result.serviceData).not.toHaveProperty("percentage_step");
    });
});

describe("buildFanServiceCall - increase_speed command", () => {
    it("returns fan.increase_speed service for the increase_speed command", () => {
        const result = buildFanServiceCall("increase_speed", "fan.living_room", 10);
        expect(result.domain).toBe("fan");
        expect(result.service).toBe("increase_speed");
    });

    it("includes entity_id and percentage_step in service data for increase_speed", () => {
        const result = buildFanServiceCall("increase_speed", "fan.living_room", 10);
        expect(result.serviceData).toEqual({ entity_id: "fan.living_room", percentage_step: 10 });
    });

    it("uses the provided percentage step value for increase_speed", () => {
        const result = buildFanServiceCall("increase_speed", "fan.living_room", 25);
        expect(result.serviceData).toHaveProperty("percentage_step", 25);
    });

    it("uses step of 1 as minimum for increase_speed", () => {
        const result = buildFanServiceCall("increase_speed", "fan.living_room", 1);
        expect(result.serviceData).toHaveProperty("percentage_step", 1);
    });

    it("uses step of 100 as maximum for increase_speed", () => {
        const result = buildFanServiceCall("increase_speed", "fan.living_room", 100);
        expect(result.serviceData).toHaveProperty("percentage_step", 100);
    });
});

describe("buildFanServiceCall - decrease_speed command", () => {
    it("returns fan.decrease_speed service for the decrease_speed command", () => {
        const result = buildFanServiceCall("decrease_speed", "fan.kitchen", 10);
        expect(result.domain).toBe("fan");
        expect(result.service).toBe("decrease_speed");
    });

    it("includes entity_id and percentage_step in service data for decrease_speed", () => {
        const result = buildFanServiceCall("decrease_speed", "fan.kitchen", 15);
        expect(result.serviceData).toEqual({ entity_id: "fan.kitchen", percentage_step: 15 });
    });

    it("uses the provided percentage step value for decrease_speed", () => {
        const result = buildFanServiceCall("decrease_speed", "fan.kitchen", 33);
        expect(result.serviceData).toHaveProperty("percentage_step", 33);
    });
});

describe("buildFanServiceCall - unknown command falls back to toggle", () => {
    it("treats an unknown command as toggle", () => {
        const result = buildFanServiceCall("set_percentage", "fan.office", 10);
        expect(result.service).toBe("toggle");
    });

    it("does not include percentage_step in service data for unknown command", () => {
        const result = buildFanServiceCall("set_percentage", "fan.office", 10);
        expect(result.serviceData).not.toHaveProperty("percentage_step");
    });

    it("includes entity_id in service data for unknown command", () => {
        const result = buildFanServiceCall("set_percentage", "fan.office", 10);
        expect(result.serviceData).toHaveProperty("entity_id", "fan.office");
    });

    it("treats an empty string command as toggle", () => {
        const result = buildFanServiceCall("", "fan.office", 10);
        expect(result.service).toBe("toggle");
    });
});

describe("buildFanServiceCall - entity_id propagation", () => {
    it("uses the provided entity_id for toggle", () => {
        const result = buildFanServiceCall("toggle", "fan.master_bedroom", 10);
        expect(result.serviceData).toHaveProperty("entity_id", "fan.master_bedroom");
    });

    it("uses the provided entity_id for increase_speed", () => {
        const result = buildFanServiceCall("increase_speed", "fan.master_bedroom", 20);
        expect(result.serviceData).toHaveProperty("entity_id", "fan.master_bedroom");
    });

    it("uses the provided entity_id for decrease_speed", () => {
        const result = buildFanServiceCall("decrease_speed", "fan.garage", 10);
        expect(result.serviceData).toHaveProperty("entity_id", "fan.garage");
    });
});

describe("buildFanServiceCall - domain is always fan", () => {
    it("always returns fan as the domain for toggle", () => {
        expect(buildFanServiceCall("toggle", "fan.x", 10).domain).toBe("fan");
    });

    it("always returns fan as the domain for increase_speed", () => {
        expect(buildFanServiceCall("increase_speed", "fan.x", 10).domain).toBe("fan");
    });

    it("always returns fan as the domain for decrease_speed", () => {
        expect(buildFanServiceCall("decrease_speed", "fan.x", 10).domain).toBe("fan");
    });
});
