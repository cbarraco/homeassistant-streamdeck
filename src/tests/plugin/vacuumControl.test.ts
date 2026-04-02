import { describe, it, expect } from "vitest";
import { buildVacuumServiceCall } from "../../plugin/actions/vacuumControlUtils";

describe("buildVacuumServiceCall - start command", () => {
    it("returns vacuum.start service for the start command", () => {
        const result = buildVacuumServiceCall("start", "vacuum.roomba");
        expect(result.domain).toBe("vacuum");
        expect(result.service).toBe("start");
    });

    it("includes the entity_id in service data for start", () => {
        const result = buildVacuumServiceCall("start", "vacuum.roomba");
        expect(result.serviceData).toEqual({ entity_id: "vacuum.roomba" });
    });
});

describe("buildVacuumServiceCall - stop command", () => {
    it("returns vacuum.stop service for the stop command", () => {
        const result = buildVacuumServiceCall("stop", "vacuum.roomba");
        expect(result.domain).toBe("vacuum");
        expect(result.service).toBe("stop");
    });

    it("includes the entity_id in service data for stop", () => {
        const result = buildVacuumServiceCall("stop", "vacuum.roomba");
        expect(result.serviceData).toEqual({ entity_id: "vacuum.roomba" });
    });
});

describe("buildVacuumServiceCall - pause command", () => {
    it("returns vacuum.pause service for the pause command", () => {
        const result = buildVacuumServiceCall("pause", "vacuum.roomba");
        expect(result.domain).toBe("vacuum");
        expect(result.service).toBe("pause");
    });

    it("includes the entity_id in service data for pause", () => {
        const result = buildVacuumServiceCall("pause", "vacuum.living_room");
        expect(result.serviceData).toEqual({ entity_id: "vacuum.living_room" });
    });
});

describe("buildVacuumServiceCall - return_to_base command", () => {
    it("returns vacuum.return_to_base service for the return_to_base command", () => {
        const result = buildVacuumServiceCall("return_to_base", "vacuum.roomba");
        expect(result.domain).toBe("vacuum");
        expect(result.service).toBe("return_to_base");
    });

    it("includes the entity_id in service data for return_to_base", () => {
        const result = buildVacuumServiceCall("return_to_base", "vacuum.roomba");
        expect(result.serviceData).toEqual({ entity_id: "vacuum.roomba" });
    });
});

describe("buildVacuumServiceCall - unknown command falls back to start", () => {
    it("treats an unknown command as start", () => {
        const result = buildVacuumServiceCall("locate", "vacuum.roomba");
        expect(result.service).toBe("start");
    });

    it("treats an empty string command as start", () => {
        const result = buildVacuumServiceCall("", "vacuum.roomba");
        expect(result.service).toBe("start");
    });

    it("includes entity_id in service data for unknown command", () => {
        const result = buildVacuumServiceCall("locate", "vacuum.roomba");
        expect(result.serviceData).toHaveProperty("entity_id", "vacuum.roomba");
    });
});

describe("buildVacuumServiceCall - entity_id propagation", () => {
    it("uses the provided entity_id for start", () => {
        const result = buildVacuumServiceCall("start", "vacuum.kitchen");
        expect(result.serviceData).toHaveProperty("entity_id", "vacuum.kitchen");
    });

    it("uses the provided entity_id for stop", () => {
        const result = buildVacuumServiceCall("stop", "vacuum.bedroom");
        expect(result.serviceData).toHaveProperty("entity_id", "vacuum.bedroom");
    });

    it("uses the provided entity_id for pause", () => {
        const result = buildVacuumServiceCall("pause", "vacuum.upstairs");
        expect(result.serviceData).toHaveProperty("entity_id", "vacuum.upstairs");
    });

    it("uses the provided entity_id for return_to_base", () => {
        const result = buildVacuumServiceCall("return_to_base", "vacuum.downstairs");
        expect(result.serviceData).toHaveProperty("entity_id", "vacuum.downstairs");
    });
});

describe("buildVacuumServiceCall - domain is always vacuum", () => {
    it("always returns vacuum as the domain for start", () => {
        expect(buildVacuumServiceCall("start", "vacuum.x").domain).toBe("vacuum");
    });

    it("always returns vacuum as the domain for stop", () => {
        expect(buildVacuumServiceCall("stop", "vacuum.x").domain).toBe("vacuum");
    });

    it("always returns vacuum as the domain for pause", () => {
        expect(buildVacuumServiceCall("pause", "vacuum.x").domain).toBe("vacuum");
    });

    it("always returns vacuum as the domain for return_to_base", () => {
        expect(buildVacuumServiceCall("return_to_base", "vacuum.x").domain).toBe("vacuum");
    });

    it("always returns vacuum as the domain for unknown commands", () => {
        expect(buildVacuumServiceCall("unknown", "vacuum.x").domain).toBe("vacuum");
    });
});
