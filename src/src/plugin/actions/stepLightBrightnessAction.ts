import { action, KeyDownEvent } from "@elgato/streamdeck";

import type { ActionSettings } from "../../../shared/types";
import { logMessage } from "../../logging";
import { BaseAction } from "./baseAction";
import { ActionType } from "../../../shared/actionTypes";
import { homeAssistantClient } from "../../services/homeAssistantClient";

const DEFAULT_STEP = 10;

@action({ UUID: ActionType.STEP_LIGHT_BRIGHTNESS })
export class StepLightBrightnessAction extends BaseAction {
    protected override async handleKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
        const settings = this.getContextSettings(ev.action.id);
        const entityId = settings?.entityId;
        if (!entityId) {
            logMessage("StepLightBrightnessAction requires an entityId setting.");
            await ev.action.showAlert();
            return;
        }

        const step =
            typeof settings?.brightnessStep === "number" && !Number.isNaN(settings.brightnessStep)
                ? Math.abs(settings.brightnessStep)
                : DEFAULT_STEP;

        const direction = settings?.direction ?? "up";
        const brightnessStepPct = direction === "up" ? step : -step;

        try {
            await homeAssistantClient.callService("light", "turn_on", {
                entity_id: entityId,
                brightness_step_pct: brightnessStepPct,
            });
            await ev.action.showOk();
        } catch (error) {
            logMessage(error);
            await ev.action.showAlert();
        }
    }
}
