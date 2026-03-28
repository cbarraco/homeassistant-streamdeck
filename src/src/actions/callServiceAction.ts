import { action, KeyDownEvent } from "@elgato/streamdeck";

import type { ActionSettings } from "../../shared/types";
import { logMessage } from "../logging";
import { homeAssistantClient } from "../services/homeAssistantClient";
import { BaseAction } from "./baseAction";
import { ActionType } from "../../shared/actionTypes";

@action({ UUID: ActionType.CALL_SERVICE })
export class CallServiceAction extends BaseAction {
    protected override async handleKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
        const settings = this.getContextSettings(ev.action.id);
        const serviceId = settings?.serviceId;
        if (!serviceId) {
            logMessage("CallServiceAction requires a serviceId setting.");
            await ev.action.showAlert();
            return;
        }

        const [domain, service] = serviceId.split(".");
        if (!domain || !service) {
            logMessage(`Invalid service id: ${serviceId}`);
            await ev.action.showAlert();
            return;
        }

        const payload = this.normalizePayload(settings?.payload);
        try {
            homeAssistantClient.callService(domain, service, payload);
            await ev.action.showOk();
        } catch (error) {
            logMessage(error);
            await ev.action.showAlert();
        }
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
}
