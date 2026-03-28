import { action, KeyDownEvent } from "@elgato/streamdeck";

import type { ActionSettings, HomeAssistantEntity } from "../../../shared/types";
import { ColorUtils } from "../../../shared/colorUtils";
import { logMessage } from "../../logging";
import { solidColorSvg } from "../../utils/svg";
import { BaseAction } from "./baseAction";
import { ActionType } from "../../../shared/actionTypes";
import { homeAssistantClient } from "../../services/homeAssistantClient";

const LIGHT_OFF_COLOR = "#000000";

@action({ UUID: ActionType.TOGGLE_LIGHT })
export class ToggleLightAction extends BaseAction {
    constructor() {
        super();
        homeAssistantClient.on("stateChanged", (entityId, state) => this.handleStateChange(entityId, state));
    }

    protected override async handleKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
        const settings = this.getContextSettings(ev.action.id);
        const entityId = settings?.entityId;
        if (!entityId) {
            logMessage("ToggleLightAction requires an entityId setting.");
            await ev.action.showAlert();
            return;
        }

        try {
            await homeAssistantClient.callService("light", "toggle", { entity_id: entityId });
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

        const color = this.resolveColor(newState);
        await Promise.all(matchingContexts.map(([, context]) => context.action.setImage(solidColorSvg(color))));
    }

    private resolveColor(state: HomeAssistantEntity): string {
        if (state.state !== "on") {
            return LIGHT_OFF_COLOR;
        }

        if (state.attributes.color_mode === "hs" && Array.isArray(state.attributes.rgb_color)) {
            const [red, green, blue] = state.attributes.rgb_color as [number, number, number];
            return ColorUtils.rgbToHex(red, green, blue);
        }

        if (state.attributes.color_mode === "color_temp" && typeof state.attributes.color_temp === "number") {
            return ColorUtils.miredToHex(state.attributes.color_temp);
        }

        return "#FFFFFF";
    }
}
