import { describe, it, expect } from "vitest";
import { ConnectionState, isDisconnectedState } from "../../plugin/state/connectionState";

describe("isDisconnectedState", () => {
    it("returns false when the state is CONNECTED", () => {
        expect(isDisconnectedState(ConnectionState.CONNECTED)).toBe(false);
    });

    it("returns true when the state is NOT_CONNECTED", () => {
        expect(isDisconnectedState(ConnectionState.NOT_CONNECTED)).toBe(true);
    });

    it("returns true when the state is INVALID_ADDRESS", () => {
        expect(isDisconnectedState(ConnectionState.INVALID_ADDRESS)).toBe(true);
    });

    it("returns true when the state is INVALID_TOKEN", () => {
        expect(isDisconnectedState(ConnectionState.INVALID_TOKEN)).toBe(true);
    });

    it("returns true when the state is NEED_RECONNECT", () => {
        expect(isDisconnectedState(ConnectionState.NEED_RECONNECT)).toBe(true);
    });

    it("returns true when the state is DONT_KNOW", () => {
        expect(isDisconnectedState(ConnectionState.DONT_KNOW)).toBe(true);
    });
});
