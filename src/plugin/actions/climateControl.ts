import { action, DidReceiveSettingsEvent, KeyDownEvent, WillAppearEvent } from "@elgato/streamdeck";

import type { ActionSettings, HomeAssistantEntity } from "../../shared/types";
import { logMessage } from "../logging";
import { homeAssistantClient } from "../services/homeAssistant";
import { cacheManager } from "../state/cache";
import { BaseAction } from "./base";
import { ActionType } from "../../shared/actionTypes";

const DEFAULT_COMMAND = "set_hvac_mode";
const DEFAULT_HVAC_MODE = "off";

@action({ UUID: ActionType.CLIMATE_CONTROL })
export class ClimateControlAction extends BaseAction {
    constructor() {
        super();
        homeAssistantClient.on("stateChanged", (entityId, state) => this.handleStateChange(entityId, state));
    }

    protected override async handleWillAppear(ev: WillAppearEvent<ActionSettings>): Promise<void> {
        const entityId = ev.payload.settings?.entityId;
        if (entityId) {
            await this.updateTitle(entityId);
        }
    }

    protected override async handleSettingsChanged(ev: DidReceiveSettingsEvent<ActionSettings>): Promise<void> {
        const entityId = ev.payload.settings?.entityId;
        if (entityId) {
            await this.updateTitle(entityId);
        }
    }

    protected override async handleKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
        const settings = this.getContextSettings(ev.action.id);
        const entityId = settings?.entityId;
        if (!entityId) {
            logMessage("ClimateControlAction requires an entityId setting.");
            await ev.action.showAlert();
            return;
        }

        const command = settings?.climateCommand ?? DEFAULT_COMMAND;

        try {
            if (command === "set_hvac_mode") {
                const hvacMode = settings?.hvacMode ?? DEFAULT_HVAC_MODE;
                await homeAssistantClient.callService("climate", "set_hvac_mode", {
                    entity_id: entityId,
                    hvac_mode: hvacMode,
                });
            } else if (command === "set_temperature") {
                const temperature = settings?.temperature;
                if (temperature === undefined) {
                    logMessage("ClimateControlAction: set_temperature requires a temperature setting.");
                    await ev.action.showAlert();
                    return;
                }
                await homeAssistantClient.callService("climate", "set_temperature", {
                    entity_id: entityId,
                    temperature,
                });
            }
            await ev.action.showOk();
        } catch (error) {
            logMessage(error);
            await ev.action.showAlert();
        }
    }

    private async handleStateChange(entityId: string, newState: HomeAssistantEntity): Promise<void> {
        const matchingContexts = Array.from(this.getAllContexts()).filter(
            ([, context]) => context.settings.entityId === entityId,
        );
        if (matchingContexts.length === 0) {
            return;
        }

        const title = this.formatTitle(newState);
        await Promise.all(
            matchingContexts.map(([, context]) => context.action.setTitle(title)),
        );
    }

    private async updateTitle(entityId: string): Promise<void> {
        const entity = cacheManager.getEntity(entityId);
        if (!entity) {
            logMessage(`ClimateControlAction: no cached state for ${entityId}`);
            return;
        }

        const matchingContexts = Array.from(this.getAllContexts()).filter(
            ([, context]) => context.settings.entityId === entityId,
        );

        const title = this.formatTitle(entity);
        await Promise.all(
            matchingContexts.map(([, context]) => context.action.setTitle(title)),
        );
    }

    private formatTitle(entity: HomeAssistantEntity): string {
        const mode = entity.state;
        const currentTemp = entity.attributes["current_temperature"];
        if (currentTemp !== undefined && currentTemp !== null) {
            return `${currentTemp}°\n${mode}`;
        }
        return mode;
    }
}
