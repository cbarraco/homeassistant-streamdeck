import { describe, it, expect, vi } from "vitest";
import { Store } from "../../lib/state/store.js";
import { ConnectionState } from "../../lib/enums.js";

describe("Store", () => {
    it("provides an immutable initial state snapshot", () => {
        const store = new Store();
        const state = store.getState();
        expect(state.streamDeckWebSocket).toBeNull();
        expect(state.globalSettings).toEqual({});
        expect(state.homeAssistantCache.entities).toEqual({});
        expect(state.homeAssistantCache.services).toEqual({});
        expect(state.connectionState).toBe(ConnectionState.DONT_KNOW);
    });

    it("updates the Stream Deck socket reference", () => {
        const store = new Store();
        const socket = {} as WebSocket;
        store.dispatch({ type: "SET_STREAM_DECK_SOCKET", socket });
        expect(store.getState().streamDeckWebSocket).toBe(socket);
    });

    it("replaces global settings and does not retain references", () => {
        const store = new Store();
        const settings = { homeAssistantAddress: "ha.local:8123", accessToken: "abc" };
        store.dispatch({ type: "SET_GLOBAL_SETTINGS", settings });
        const newState = store.getState();
        expect(newState.globalSettings).toEqual(settings);
        expect(newState.globalSettings).not.toBe(settings); // defensive copy
    });

    it("updates connection state", () => {
        const store = new Store();
        store.dispatch({ type: "SET_CONNECTION_STATE", connectionState: ConnectionState.CONNECTED });
        expect(store.getState().connectionState).toBe(ConnectionState.CONNECTED);
    });

    it("replaces entities and services caches independently", () => {
        const store = new Store();
        const entities = { light: [{ entity_id: "light.kitchen", state: "on", attributes: {} }] };
        const services = { light: ["light.turn_on"] };
        store.dispatch({ type: "SET_ENTITIES_CACHE", entities });
        store.dispatch({ type: "SET_SERVICES_CACHE", services });
        const state = store.getState();
        expect(state.homeAssistantCache.entities).toEqual(entities);
        expect(state.homeAssistantCache.services).toEqual(services);
    });

    it("notifies subscribers on every dispatch", () => {
        const store = new Store();
        const listener = vi.fn();
        store.subscribe(listener);
        store.dispatch({ type: "SET_CONNECTION_STATE", connectionState: ConnectionState.CONNECTED });
        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith(store.getState(), {
            type: "SET_CONNECTION_STATE",
            connectionState: ConnectionState.CONNECTED,
        });
    });

    it("allows subscribers to unsubscribe", () => {
        const store = new Store();
        const listener = vi.fn();
        const unsubscribe = store.subscribe(listener);
        unsubscribe();
        store.dispatch({ type: "SET_CONNECTION_STATE", connectionState: ConnectionState.CONNECTED });
        expect(listener).not.toHaveBeenCalled();
    });
});
