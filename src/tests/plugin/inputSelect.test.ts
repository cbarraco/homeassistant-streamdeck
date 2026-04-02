import { describe, it, expect } from "vitest";
import { getNextOption } from "../../plugin/utils/inputSelectUtils";

describe("getNextOption", () => {
    it("returns the next option when the current option is the first item", () => {
        const options = ["morning", "afternoon", "evening"];
        expect(getNextOption(options, "morning")).toBe("afternoon");
    });

    it("returns the next option when the current option is in the middle", () => {
        const options = ["morning", "afternoon", "evening"];
        expect(getNextOption(options, "afternoon")).toBe("evening");
    });

    it("wraps around to the first option when the current option is the last item", () => {
        const options = ["morning", "afternoon", "evening"];
        expect(getNextOption(options, "evening")).toBe("morning");
    });

    it("returns the first option when the current option is not found in the list", () => {
        const options = ["morning", "afternoon", "evening"];
        expect(getNextOption(options, "unknown")).toBe("morning");
    });

    it("returns the only option when the list has a single item", () => {
        const options = ["only"];
        expect(getNextOption(options, "only")).toBe("only");
    });

    it("returns the first option when the list has a single item and the current option does not match", () => {
        const options = ["only"];
        expect(getNextOption(options, "other")).toBe("only");
    });

    it("returns undefined when the options array is empty", () => {
        expect(getNextOption([], "morning")).toBeUndefined();
    });

    it("returns undefined when passed a non-array value", () => {
        expect(getNextOption(null as unknown as unknown[], "morning")).toBeUndefined();
    });

    it("returns undefined when passed undefined", () => {
        expect(getNextOption(undefined as unknown as unknown[], "morning")).toBeUndefined();
    });

    it("handles two options cycling back and forth", () => {
        const options = ["on", "off"];
        expect(getNextOption(options, "on")).toBe("off");
        expect(getNextOption(options, "off")).toBe("on");
    });

    it("cycles through all options in sequence", () => {
        const options = ["a", "b", "c", "d"];
        expect(getNextOption(options, "a")).toBe("b");
        expect(getNextOption(options, "b")).toBe("c");
        expect(getNextOption(options, "c")).toBe("d");
        expect(getNextOption(options, "d")).toBe("a");
    });
});
