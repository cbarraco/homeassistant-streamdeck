import { action, KeyDownEvent } from "@elgato/streamdeck";
import type { ActionSettings } from "../../shared/types";
import { logMessage } from "../logging";
import { homeAssistantClient } from "../services/homeAssistant";
import { BaseAction } from "./base";
import { ActionType } from "../../shared/actionTypes";

@action({ UUID: ActionType.RUN_SCRIPT })
export class RunScriptAction extends BaseAction {
    protected override async handleKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
        const settings = this.getContextSettings(ev.action.id);
        const entityId = settings?.entityId;
        if (!entityId) {
            logMessage("RunScriptAction requires an entityId setting.");
            await ev.action.showAlert();
            return;
        }

        try {
            await homeAssistantClient.callService("script", "turn_on", { entity_id: entityId });
            await ev.action.showOk();
        } catch (error) {
            logMessage(error);
            await ev.action.showAlert();
        }
    }
}

import { selfRegister } from "./registry";
selfRegister(new RunScriptAction());
