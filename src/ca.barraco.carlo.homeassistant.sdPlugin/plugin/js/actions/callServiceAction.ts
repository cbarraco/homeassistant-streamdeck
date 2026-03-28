import { logMessage } from "../../../lib/logging.js";
import type { ActionSettings, KeyDownData } from "../action.js";
import { Action } from "../action.js";
import { homeAssistantService } from "../../../lib/services/homeAssistantService.js";

export class CallServiceAction extends Action {
    constructor(context: string, settings: ActionSettings = {}) {
        super(context, settings);
    }

    onKeyDown(data: KeyDownData): void {
        super.onKeyDown(data);
        const serviceId = data.settings.serviceId;
        if (!serviceId) {
            logMessage("CallServiceAction requires a serviceId setting.");
            return;
        }
        const payload = this.normalizePayload(data.settings.payload);
        this.sendServiceCommand(serviceId, payload);
    }

    private normalizePayload(rawPayload?: string): Record<string, unknown> {
        if (!rawPayload || rawPayload.trim() === "") {
            return {};
        }

        try {
            return JSON.parse(rawPayload) as Record<string, unknown>;
        } catch (error) {
            logMessage("Payload is not valid JSON. Falling back to empty object.");
            return {};
        }
    }

    private sendServiceCommand(serviceId: string, payload: Record<string, unknown>): void {
        if (!homeAssistantService.isConnected()) {
            logMessage("Home Assistant websocket is not connected.");
            return;
        }

        const [domain, service] = serviceId.split(".");
        if (!domain || !service) {
            logMessage(`Invalid service id: ${serviceId}`);
            return;
        }

        logMessage(`Calling ${domain}.${service}`);
        const callServiceMessage = {
            id: homeAssistantService.getNextMessageId(),
            type: "call_service",
            domain,
            service,
            service_data: payload,
        };
        homeAssistantService.sendMessage(callServiceMessage);
    }
}
