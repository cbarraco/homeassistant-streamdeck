import { describe, it, expect, vi } from "vitest";
import { CacheManager } from "../../plugin/state/cache";
import type { HomeAssistantEntity } from "../../shared/types";

function makeEntity(entityId: string, state = "on"): HomeAssistantEntity {
    return { entity_id: entityId, state, attributes: {} };
}

describe("CacheManager.setEntities", () => {
    it("groups entities by domain", () => {
        const cache = new CacheManager();
        cache.setEntities([makeEntity("light.living_room"), makeEntity("switch.fan")]);

        const snapshot = cache.getSnapshot();
        expect(snapshot.entities["light"]).toHaveLength(1);
        expect(snapshot.entities["switch"]).toHaveLength(1);
    });

    it("groups multiple entities under the same domain", () => {
        const cache = new CacheManager();
        cache.setEntities([makeEntity("light.living_room"), makeEntity("light.bedroom")]);

        expect(cache.getSnapshot().entities["light"]).toHaveLength(2);
    });

    it("replaces the previous entity list on each call", () => {
        const cache = new CacheManager();
        cache.setEntities([makeEntity("light.living_room"), makeEntity("light.bedroom")]);
        cache.setEntities([makeEntity("light.kitchen")]);

        expect(cache.getSnapshot().entities["light"]).toHaveLength(1);
    });
});

describe("CacheManager.getEntity", () => {
    it("returns the matching entity by id", () => {
        const cache = new CacheManager();
        cache.setEntities([makeEntity("light.living_room")]);

        const entity = cache.getEntity("light.living_room");
        expect(entity?.entity_id).toBe("light.living_room");
    });

    it("returns undefined for an unknown entity id", () => {
        const cache = new CacheManager();
        expect(cache.getEntity("light.unknown")).toBeUndefined();
    });

    it("returns undefined when the domain exists but the entity does not", () => {
        const cache = new CacheManager();
        cache.setEntities([makeEntity("light.living_room")]);

        expect(cache.getEntity("light.bedroom")).toBeUndefined();
    });
});

describe("CacheManager.setServices", () => {
    it("formats services as domain.service strings", () => {
        const cache = new CacheManager();
        cache.setServices({ light: { turn_on: {}, turn_off: {} } });

        expect(cache.getSnapshot().services["light"]).toContain("light.turn_on");
        expect(cache.getSnapshot().services["light"]).toContain("light.turn_off");
    });

    it("handles multiple domains", () => {
        const cache = new CacheManager();
        cache.setServices({ light: { turn_on: {} }, switch: { toggle: {} } });

        expect(cache.getSnapshot().services["light"]).toBeDefined();
        expect(cache.getSnapshot().services["switch"]).toBeDefined();
    });
});

describe("CacheManager.subscribe", () => {
    it("calls the listener after setEntities", () => {
        const cache = new CacheManager();
        const listener = vi.fn();
        cache.subscribe(listener);

        cache.setEntities([makeEntity("light.living_room")]);
        expect(listener).toHaveBeenCalledOnce();
    });

    it("calls the listener after setServices", () => {
        const cache = new CacheManager();
        const listener = vi.fn();
        cache.subscribe(listener);

        cache.setServices({ light: { turn_on: {} } });
        expect(listener).toHaveBeenCalledOnce();
    });

    it("stops calling the listener after unsubscribing", () => {
        const cache = new CacheManager();
        const listener = vi.fn();
        const unsubscribe = cache.subscribe(listener);
        unsubscribe();

        cache.setEntities([makeEntity("light.living_room")]);
        expect(listener).not.toHaveBeenCalled();
    });
});
