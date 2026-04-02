import { action, KeyDownEvent } from "@elgato/streamdeck";

import type { ActionSettings } from "../../shared/types";
import { logMessage } from "../logging";
import { homeAssistantClient } from "../services/homeAssistant";
import { BaseAction } from "./base";
import { ActionType } from "../../shared/actionTypes";

const DEFAULT_COMMAND = "toggle";

@action({ UUID: ActionType.CONTROL_COVER })
export class ControlCoverAction extends BaseAction {
    protected override async handleKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
        const settings = this.getContextSettings(ev.action.id);
        const entityId = settings?.entityId;
        if (!entityId) {
            logMessage("ControlCoverAction requires an entityId setting.");
            await ev.action.showAlert();
            return;
        }

        const command = settings?.coverCommand ?? DEFAULT_COMMAND;

        try {
            await homeAssistantClient.callService("cover", command, { entity_id: entityId });
            await ev.action.showOk();
        } catch (error) {
            logMessage(error);
            await ev.action.showAlert();
        }
    }
}

import { selfRegister } from "./registry";
selfRegister(new ControlCoverAction());
