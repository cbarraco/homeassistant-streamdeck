import { action, KeyDownEvent } from "@elgato/streamdeck";

import type { ActionSettings } from "../../shared/types";
import { logMessage } from "../logging";
import { homeAssistantClient } from "../services/homeAssistant";
import { BaseAction } from "./base";
import { ActionType } from "../../shared/actionTypes";
import { buildVacuumServiceCall } from "./vacuumControlUtils";

const DEFAULT_COMMAND = "start";

@action({ UUID: ActionType.VACUUM_CONTROL })
export class VacuumControlAction extends BaseAction {
    protected override async handleKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
        const settings = this.getContextSettings(ev.action.id);
        const entityId = settings?.entityId;
        if (!entityId) {
            logMessage("VacuumControlAction requires an entityId setting.");
            await ev.action.showAlert();
            return;
        }

        const command = settings?.vacuumCommand ?? DEFAULT_COMMAND;
        const { domain, service, serviceData } = buildVacuumServiceCall(command, entityId);

        try {
            await homeAssistantClient.callService(domain, service, serviceData);
            await ev.action.showOk();
        } catch (error) {
            logMessage(error);
            await ev.action.showAlert();
        }
    }
}

import { selfRegister } from "./registry";
selfRegister(new VacuumControlAction());
