import { action, DidReceiveSettingsEvent, WillAppearEvent } from "@elgato/streamdeck";

import type { ActionSettings, HomeAssistantEntity } from "../../shared/types";
import { logMessage } from "../logging";
import { homeAssistantClient } from "../services/homeAssistant";
import { cacheManager } from "../state/cache";
import { BaseAction } from "./base";
import { ActionType } from "../../shared/actionTypes";
import { getWeatherAnimationSvg } from "../utils/weatherAnimations";
import { formatTemperatureLabel } from "./weatherUtils";

@action({ UUID: ActionType.WEATHER_DISPLAY })
export class WeatherDisplayAction extends BaseAction {
    constructor() {
        super();
        homeAssistantClient.on("stateChanged", (entityId, state) => this.handleStateChange(entityId, state));
    }

    protected override async handleWillAppear(ev: WillAppearEvent<ActionSettings>): Promise<void> {
        const entityId = ev.payload.settings?.entityId;
        if (entityId) {
            await this.updateImage(entityId);
        }
    }

    protected override async handleSettingsChanged(ev: DidReceiveSettingsEvent<ActionSettings>): Promise<void> {
        const entityId = ev.payload.settings?.entityId;
        if (entityId) {
            await this.updateImage(entityId);
        }
    }

    private async handleStateChange(entityId: string, newState: HomeAssistantEntity): Promise<void> {
        const matchingContexts = Array.from(this.getAllContexts()).filter(
            ([, context]) => context.settings.entityId === entityId,
        );
        if (matchingContexts.length === 0) {
            return;
        }

        const svg = getWeatherAnimationSvg(newState.state, formatTemperatureLabel(newState));
        await Promise.all(
            matchingContexts.map(([, context]) => Promise.all([
                context.action.setImage(svg),
                context.action.setTitle(""),
            ])),
        );
    }

    private async updateImage(entityId: string): Promise<void> {
        const entity = cacheManager.getEntity(entityId);
        if (!entity) {
            logMessage(`WeatherDisplayAction: no cached state for ${entityId}`);
            return;
        }

        const matchingContexts = Array.from(this.getAllContexts()).filter(
            ([, context]) => context.settings.entityId === entityId,
        );

        const svg = getWeatherAnimationSvg(entity.state, formatTemperatureLabel(entity));
        await Promise.all(
            matchingContexts.map(([, context]) => Promise.all([
                context.action.setImage(svg),
                context.action.setTitle(""),
            ])),
        );
    }
}

import { selfRegister } from "./registry";
selfRegister(new WeatherDisplayAction());
