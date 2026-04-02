import { action, KeyDownEvent } from "@elgato/streamdeck";
import type { ActionSettings } from "../../shared/types";
import { logMessage } from "../logging";
import { homeAssistantClient } from "../services/homeAssistant";
import { BaseAction } from "./base";
import { ActionType } from "../../shared/actionTypes";

@action({ UUID: ActionType.TRIGGER_AUTOMATION })
export class TriggerAutomationAction extends BaseAction {
    protected override async handleKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
        const settings = this.getContextSettings(ev.action.id);
        const entityId = settings?.entityId;
        if (!entityId) {
            logMessage("TriggerAutomationAction requires an entityId setting.");
            await ev.action.showAlert();
            return;
        }

        try {
            await homeAssistantClient.callService("automation", "trigger", { entity_id: entityId });
            await ev.action.showOk();
        } catch (error) {
            logMessage(error);
            await ev.action.showAlert();
        }
    }
}

import { selfRegister } from "./registry";
selfRegister(new TriggerAutomationAction());
