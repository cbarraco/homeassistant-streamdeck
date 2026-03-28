import { logMessage } from "../../../lib/logging.js";
import type { ActionSettings, KeyDownData } from "../action.js";
import { Action } from "../action.js";
import { homeAssistantService } from "../../../lib/services/homeAssistantService.js";

export class ToggleLightAction extends Action {
    constructor(context: string, settings: ActionSettings = {}) {
        super(context, settings);
    }

    onKeyDown(data: KeyDownData): void {
        super.onKeyDown(data);
        const entityId = data.settings.entityId;
        if (!entityId) {
            logMessage("ToggleLightAction requires an entityId setting.");
            return;
        }
        this.sendCommand(entityId);
    }

    private sendCommand(entityId: string): void {
        if (!homeAssistantService.isConnected()) {
            logMessage("Home Assistant websocket is not connected.");
            return;
        }

        logMessage(`Sending toggle command to HA for entity ${entityId}`);
        const message = {
            id: homeAssistantService.getNextMessageId(),
            type: "call_service",
            domain: "light",
            service: "toggle",
            service_data: {
                entity_id: entityId,
            },
        };
        homeAssistantService.sendMessage(message);
    }
}
