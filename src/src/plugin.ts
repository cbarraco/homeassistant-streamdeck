import streamDeck from "@elgato/streamdeck";

import type { GlobalSettings } from "../shared/types";
import { registerActions } from "./plugin/actions/index";
import { logMessage } from "./logging";
import { homeAssistantClient } from "./services/homeAssistantClient";
import { cacheManager } from "./state/cache";

async function bootstrap(): Promise<void> {
    streamDeck.logger.setLevel("trace");
    registerActions();

    streamDeck.settings.onDidReceiveGlobalSettings<GlobalSettings>((ev) => {
        homeAssistantClient.applySettings(ev.settings ?? {});
    });

    homeAssistantClient.on("entities", (entities) => cacheManager.setEntities(entities));
    homeAssistantClient.on("services", (services) => cacheManager.setServices(services));

    await streamDeck.connect();

    const initialSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    homeAssistantClient.applySettings(initialSettings);
}

bootstrap().catch((error) => {
    logMessage(error);
    throw error;
});
