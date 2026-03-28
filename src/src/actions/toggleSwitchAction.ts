import { action, KeyDownEvent } from "@elgato/streamdeck";

import type { ActionSettings, HomeAssistantEntity } from "../../shared/types";
import { logMessage } from "../logging";
import { homeAssistantClient } from "../services/homeAssistantClient";
import { solidColorSvg } from "../utils/svg";
import { BaseAction } from "./baseAction";
import { ActionType } from "../../shared/actionTypes";

const SWITCH_ON_COLOR = "#1976D2";
const SWITCH_OFF_COLOR = "#FF5252";

@action({ UUID: ActionType.TOGGLE_SWITCH })
export class ToggleSwitchAction extends BaseAction {
    constructor() {
        super();
        homeAssistantClient.on("stateChanged", (entityId, state) => this.handleStateChange(entityId, state));
    }

    protected override async handleKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
        const settings = this.getContextSettings(ev.action.id);
        const entityId = settings?.entityId;
        if (!entityId) {
            logMessage("ToggleSwitchAction requires an entityId setting.");
            await ev.action.showAlert();
            return;
        }

        try {
            homeAssistantClient.callService("switch", "toggle", { entity_id: entityId });
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

        const color = newState.state === "on" ? SWITCH_ON_COLOR : SWITCH_OFF_COLOR;
        await Promise.all(matchingContexts.map(([, context]) => context.action.setImage(solidColorSvg(color))));
    }
}
