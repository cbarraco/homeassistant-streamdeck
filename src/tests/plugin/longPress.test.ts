import { describe, it, expect } from "vitest";
import {
    LONG_PRESS_THRESHOLD_MS,
    isLongPress,
    isLongPressParseError,
    parseLongPressServiceCall,
} from "../../plugin/actions/longPressUtils";

// ---------------------------------------------------------------------------
// isLongPress
// ---------------------------------------------------------------------------

describe("isLongPress - threshold boundary", () => {
    it("returns false when hold duration is zero", () => {
        expect(isLongPress(0)).toBe(false);
    });

    it("returns false when hold duration is one millisecond below the threshold", () => {
        expect(isLongPress(LONG_PRESS_THRESHOLD_MS - 1)).toBe(false);
    });

    it("returns true when hold duration equals the threshold exactly", () => {
        expect(isLongPress(LONG_PRESS_THRESHOLD_MS)).toBe(true);
    });

    it("returns true when hold duration exceeds the threshold", () => {
        expect(isLongPress(LONG_PRESS_THRESHOLD_MS + 1)).toBe(true);
    });

    it("returns true for a very long hold (e.g. 2 seconds)", () => {
        expect(isLongPress(2000)).toBe(true);
    });
});

describe("isLongPress - threshold value", () => {
    it("long-press threshold is 500 ms", () => {
        expect(LONG_PRESS_THRESHOLD_MS).toBe(500);
    });
});

// ---------------------------------------------------------------------------
// parseLongPressServiceCall - valid inputs
// ---------------------------------------------------------------------------

describe("parseLongPressServiceCall - valid service id and payload", () => {
    it("returns the correct domain for a valid service id", () => {
        const result = parseLongPressServiceCall("light.turn_on", "{}");
        expect(isLongPressParseError(result)).toBe(false);
        if (!isLongPressParseError(result)) {
            expect(result.domain).toBe("light");
        }
    });

    it("returns the correct service for a valid service id", () => {
        const result = parseLongPressServiceCall("light.turn_on", "{}");
        if (!isLongPressParseError(result)) {
            expect(result.service).toBe("turn_on");
        }
    });

    it("parses an empty payload string as an empty object", () => {
        const result = parseLongPressServiceCall("switch.toggle", "");
        if (!isLongPressParseError(result)) {
            expect(result.serviceData).toEqual({});
        }
    });

    it("parses a payload string containing an empty JSON object", () => {
        const result = parseLongPressServiceCall("switch.toggle", "{}");
        if (!isLongPressParseError(result)) {
            expect(result.serviceData).toEqual({});
        }
    });

    it("parses a payload with entity_id into serviceData", () => {
        const result = parseLongPressServiceCall(
            "light.turn_on",
            '{"entity_id":"light.living_room"}',
        );
        if (!isLongPressParseError(result)) {
            expect(result.serviceData).toEqual({ entity_id: "light.living_room" });
        }
    });

    it("parses a payload with multiple fields into serviceData", () => {
        const result = parseLongPressServiceCall(
            "light.turn_on",
            '{"entity_id":"light.desk","brightness":128,"color_temp":300}',
        );
        if (!isLongPressParseError(result)) {
            expect(result.serviceData).toEqual({
                entity_id: "light.desk",
                brightness: 128,
                color_temp: 300,
            });
        }
    });

    it("handles domains with underscores", () => {
        const result = parseLongPressServiceCall("alarm_control_panel.arm_away", "{}");
        if (!isLongPressParseError(result)) {
            expect(result.domain).toBe("alarm_control_panel");
            expect(result.service).toBe("arm_away");
        }
    });

    it("handles service names with dots only in the payload, not the id", () => {
        const result = parseLongPressServiceCall("media_player.play_media", "{}");
        if (!isLongPressParseError(result)) {
            expect(result.domain).toBe("media_player");
            expect(result.service).toBe("play_media");
        }
    });
});

// ---------------------------------------------------------------------------
// parseLongPressServiceCall - invalid service id
// ---------------------------------------------------------------------------

describe("parseLongPressServiceCall - invalid service id", () => {
    it("returns an error for an empty service id", () => {
        const result = parseLongPressServiceCall("", "{}");
        expect(isLongPressParseError(result)).toBe(true);
    });

    it("returns an error when there is no dot in the service id", () => {
        const result = parseLongPressServiceCall("lightturn_on", "{}");
        expect(isLongPressParseError(result)).toBe(true);
    });

    it("returns an error when the service id starts with a dot (empty domain)", () => {
        const result = parseLongPressServiceCall(".turn_on", "{}");
        expect(isLongPressParseError(result)).toBe(true);
    });

    it("returns an error when the service id ends with a dot (empty service name)", () => {
        const result = parseLongPressServiceCall("light.", "{}");
        expect(isLongPressParseError(result)).toBe(true);
    });

    it("error message includes the invalid service id", () => {
        const result = parseLongPressServiceCall("invalid", "{}");
        if (isLongPressParseError(result)) {
            expect(result.error).toContain("invalid");
        }
    });
});

// ---------------------------------------------------------------------------
// parseLongPressServiceCall - invalid payload
// ---------------------------------------------------------------------------

describe("parseLongPressServiceCall - invalid payload", () => {
    it("returns an error for malformed JSON in the payload", () => {
        const result = parseLongPressServiceCall("light.turn_on", "{bad json}");
        expect(isLongPressParseError(result)).toBe(true);
    });

    it("returns an error when payload is a JSON array instead of an object", () => {
        const result = parseLongPressServiceCall("light.turn_on", "[1,2,3]");
        expect(isLongPressParseError(result)).toBe(true);
    });

    it("returns an error when payload is a JSON string", () => {
        const result = parseLongPressServiceCall("light.turn_on", '"hello"');
        expect(isLongPressParseError(result)).toBe(true);
    });

    it("returns an error when payload is a JSON number", () => {
        const result = parseLongPressServiceCall("light.turn_on", "42");
        expect(isLongPressParseError(result)).toBe(true);
    });

    it("returns an error when payload is a JSON null", () => {
        const result = parseLongPressServiceCall("light.turn_on", "null");
        expect(isLongPressParseError(result)).toBe(true);
    });

    it("error message includes information about the invalid payload", () => {
        const result = parseLongPressServiceCall("light.turn_on", "{bad}");
        if (isLongPressParseError(result)) {
            expect(result.error.length).toBeGreaterThan(0);
        }
    });
});

// ---------------------------------------------------------------------------
// isLongPressParseError - type guard
// ---------------------------------------------------------------------------

describe("isLongPressParseError - type guard", () => {
    it("returns true for a parse error object", () => {
        const result = parseLongPressServiceCall("", "{}");
        expect(isLongPressParseError(result)).toBe(true);
    });

    it("returns false for a successful parse result", () => {
        const result = parseLongPressServiceCall("light.turn_on", "{}");
        expect(isLongPressParseError(result)).toBe(false);
    });
});
