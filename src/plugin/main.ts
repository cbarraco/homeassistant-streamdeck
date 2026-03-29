import streamDeck from "@elgato/streamdeck";

import type { GlobalSettings, HomeAssistantEntity } from "../shared/types";
import { registerActions } from "./actions/index";
import { logMessage } from "./logging";
import { cacheManager } from "./state/cache";
import { homeAssistantClient } from "./services/homeAssistant";

async function bootstrap(): Promise<void> {
  streamDeck.logger.setLevel("trace");
  registerActions();

  streamDeck.settings.onDidReceiveGlobalSettings<GlobalSettings>((ev) => {
    homeAssistantClient.applySettings(ev.settings ?? {});
  });

  homeAssistantClient.on("entities", (entities: HomeAssistantEntity[]) =>
    cacheManager.setEntities(entities),
  );
  homeAssistantClient.on(
    "services",
    (services: Record<string, Record<string, unknown>>) =>
      cacheManager.setServices(services),
  );

  await streamDeck.connect();

  const initialSettings =
    await streamDeck.settings.getGlobalSettings<GlobalSettings>();
  homeAssistantClient.applySettings(initialSettings);
}

bootstrap().catch((error) => {
  logMessage(error);
  throw error;
});
