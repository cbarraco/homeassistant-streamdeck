import { action, KeyDownEvent } from "@elgato/streamdeck";
import type { ActionSettings } from "../../shared/types";
import { logMessage } from "../logging";
import { homeAssistantClient } from "../services/homeAssistant";
import { BaseAction } from "./base";
import { ActionType } from "../../shared/actionTypes";

const DEFAULT_COMMAND = "alarm_arm_home";

@action({ UUID: ActionType.ALARM_CONTROL_PANEL })
export class AlarmControlPanelAction extends BaseAction {
    protected override async handleKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
        const settings = this.getContextSettings(ev.action.id);
        const entityId = settings?.entityId;
        if (!entityId) {
            logMessage("AlarmControlPanelAction requires an entityId setting.");
            await ev.action.showAlert();
            return;
        }

        const command = settings?.alarmCommand ?? DEFAULT_COMMAND;

        try {
            await homeAssistantClient.callService("alarm_control_panel", command, { entity_id: entityId });
            await ev.action.showOk();
        } catch (error) {
            logMessage(error);
            await ev.action.showAlert();
        }
    }
}
