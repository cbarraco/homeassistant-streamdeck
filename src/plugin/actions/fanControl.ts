import { action, KeyDownEvent } from "@elgato/streamdeck";

import type { ActionSettings } from "../../shared/types";
import { logMessage } from "../logging";
import { homeAssistantClient } from "../services/homeAssistant";
import { BaseAction } from "./base";
import { ActionType } from "../../shared/actionTypes";
import { buildFanServiceCall } from "./fanControlUtils";

const DEFAULT_COMMAND = "toggle";
const DEFAULT_PERCENTAGE_STEP = 10;

@action({ UUID: ActionType.FAN_CONTROL })
export class FanControlAction extends BaseAction {
    protected override async handleKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
        const settings = this.getContextSettings(ev.action.id);
        const entityId = settings?.entityId;
        if (!entityId) {
            logMessage("FanControlAction requires an entityId setting.");
            await ev.action.showAlert();
            return;
        }

        const command = settings?.fanCommand ?? DEFAULT_COMMAND;
        const percentageStep =
            typeof settings?.percentageStep === "number" && !Number.isNaN(settings.percentageStep)
                ? Math.abs(settings.percentageStep)
                : DEFAULT_PERCENTAGE_STEP;

        const { domain, service, serviceData } = buildFanServiceCall(command, entityId, percentageStep);

        try {
            await homeAssistantClient.callService(domain, service, serviceData);
            await ev.action.showOk();
        } catch (error) {
            logMessage(error);
            await ev.action.showAlert();
        }
    }
}
