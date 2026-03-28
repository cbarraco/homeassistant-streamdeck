import type { HomeAssistantCache, HomeAssistantEntity } from "../../shared/types";

type CacheListener = (cache: HomeAssistantCache) => void;

export class CacheManager {
    private cache: HomeAssistantCache = {
        entities: {},
        services: {},
    };

    private listeners = new Set<CacheListener>();

    getSnapshot(): HomeAssistantCache {
        return this.cache;
    }

    getEntity(entityId: string): HomeAssistantEntity | undefined {
        const domain = entityId.split(".")[0];
        return this.cache.entities[domain]?.find((entity) => entity.entity_id === entityId);
    }

    setEntities(entities: HomeAssistantEntity[]): void {
        const grouped: HomeAssistantCache["entities"] = {};
        entities.forEach((entity) => {
            const domain = entity.entity_id.split(".")[0];
            if (!grouped[domain]) {
                grouped[domain] = [];
            }
            grouped[domain].push(entity);
        });

        this.cache = {
            ...this.cache,
            entities: grouped,
        };
        this.notify();
    }

    setServices(servicesPayload: Record<string, Record<string, unknown>>): void {
        const services: HomeAssistantCache["services"] = {};
        Object.keys(servicesPayload).forEach((domain) => {
            const domainServices = Object.keys(servicesPayload[domain]);
            services[domain] = domainServices.map((service) => `${domain}.${service}`);
        });

        this.cache = {
            ...this.cache,
            services,
        };
        this.notify();
    }

    subscribe(listener: CacheListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        this.listeners.forEach((listener) => listener(this.cache));
    }
}

export const cacheManager = new CacheManager();
