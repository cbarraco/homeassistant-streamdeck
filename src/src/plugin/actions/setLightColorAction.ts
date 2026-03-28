import { action, KeyAction, KeyDownEvent, DidReceiveSettingsEvent, WillAppearEvent } from "@elgato/streamdeck";

import { ColorUtils } from "../../../shared/colorUtils";
import type { ActionSettings } from "../../../shared/types";
import { logMessage } from "../../logging";
import { solidColorSvg } from "../../utils/svg";
import { BaseAction } from "./baseAction";
import { ActionType } from "../../../shared/actionTypes";
import { homeAssistantClient } from "../../services/homeAssistantClient";

@action({ UUID: ActionType.SET_LIGHT_COLOR })
export class SetLightColorAction extends BaseAction {
    protected override async handleWillAppear(ev: WillAppearEvent<ActionSettings>): Promise<void> {
        if (!ev.action.isKey()) {
            return;
        }
        await this.updatePreview(ev.action.id, ev.action);
    }

    protected override async handleSettingsChanged(
        ev: DidReceiveSettingsEvent<ActionSettings>,
    ): Promise<void> {
        if (!ev.action.isKey()) {
            return;
        }
        await this.updatePreview(ev.action.id, ev.action);
    }

    protected override async handleKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
        const settings = this.getContextSettings(ev.action.id);
        const entityId = settings?.entityId;
        if (!entityId) {
            logMessage("SetLightColorAction requires an entityId setting.");
            await ev.action.showAlert();
            return;
        }

        const serviceData: Record<string, unknown> = {
            entity_id: entityId,
        };

        if (typeof settings?.brightness === "number" && !Number.isNaN(settings.brightness)) {
            serviceData.brightness_pct = clampPercentage(settings.brightness);
        }

        if (settings?.colorType === "RGB" && typeof settings.color === "string") {
            const components = ColorUtils.hexToRgb(settings.color);
            if (components) {
                serviceData.rgb_color = [components.red, components.green, components.blue];
            }
        } else if (settings?.colorType === "Temperature" && typeof settings.temperature === "number") {
            serviceData.color_temp = Math.round(settings.temperature);
        }

        try {
            await homeAssistantClient.callService("light", "turn_on", serviceData);
            await ev.action.showOk();
        } catch (error) {
            logMessage(error);
            await ev.action.showAlert();
        }
    }

    private async updatePreview(contextId: string, keyAction: KeyAction<ActionSettings>): Promise<void> {
        const settings = this.getContextSettings(contextId);
        if (!settings) {
            return;
        }

        if (settings.colorType === "RGB" && typeof settings.color === "string") {
            await keyAction.setImage(solidColorSvg(settings.color));
            return;
        }

        if (settings.colorType === "Temperature" && typeof settings.temperature === "number") {
            const hex = ColorUtils.miredToHex(settings.temperature);
            await keyAction.setImage(solidColorSvg(hex));
            return;
        }

        await keyAction.setImage(undefined);
    }
}

function clampPercentage(value: number): number {
    return Math.min(100, Math.max(0, Math.round(value)));
}
