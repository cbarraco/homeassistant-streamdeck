import { action, DidReceiveSettingsEvent, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import type { KeyAction } from "@elgato/streamdeck";

import type { ActionSettings, HomeAssistantEntity } from "../../shared/types";
import { logMessage } from "../logging";
import { homeAssistantClient } from "../services/homeAssistant";
import { cacheManager } from "../state/cache";
import { BaseAction } from "./base";
import { ActionType } from "../../shared/actionTypes";
import { getWeatherFrames, WEATHER_FRAME_INTERVAL_MS } from "../utils/weatherAnimations";
import { formatTemperatureLabel } from "./weatherUtils";

interface AnimationState {
    frames: string[];
    frameIndex: number;
    timer: NodeJS.Timeout;
}

@action({ UUID: ActionType.WEATHER_DISPLAY })
export class WeatherDisplayAction extends BaseAction {
    private readonly animations = new Map<string, AnimationState>();

    constructor() {
        super();
        homeAssistantClient.on("stateChanged", (entityId, state) => this.handleStateChange(entityId, state));
    }

    protected override async handleWillAppear(ev: WillAppearEvent<ActionSettings>): Promise<void> {
        if (!ev.action.isKey()) return;
        const entityId = ev.payload.settings?.entityId;
        if (entityId) {
            await this.startAnimation(ev.action.id, ev.action, entityId);
        }
    }

    protected override handleWillDisappear(ev: WillDisappearEvent<ActionSettings>): void {
        this.stopAnimation(ev.action.id);
    }

    protected override async handleSettingsChanged(ev: DidReceiveSettingsEvent<ActionSettings>): Promise<void> {
        if (!ev.action.isKey()) return;
        const entityId = ev.payload.settings?.entityId;
        this.stopAnimation(ev.action.id);
        if (entityId) {
            await this.startAnimation(ev.action.id, ev.action, entityId);
        }
    }

    private async handleStateChange(entityId: string, newState: HomeAssistantEntity): Promise<void> {
        const matchingContexts = Array.from(this.getAllContexts()).filter(
            ([, context]) => context.settings.entityId === entityId,
        );
        for (const [contextId, context] of matchingContexts) {
            this.stopAnimation(contextId);
            await this.startAnimationForEntity(contextId, context.action, newState);
        }
    }

    private async startAnimation(contextId: string, action: KeyAction<ActionSettings>, entityId: string): Promise<void> {
        const entity = cacheManager.getEntity(entityId);
        if (!entity) {
            logMessage(`WeatherDisplayAction: no cached state for ${entityId}`);
            return;
        }
        await this.startAnimationForEntity(contextId, action, entity);
    }

    private async startAnimationForEntity(
        contextId: string,
        action: KeyAction<ActionSettings>,
        entity: HomeAssistantEntity,
    ): Promise<void> {
        const frames = getWeatherFrames(entity.state, formatTemperatureLabel(entity));

        // Show the first frame immediately
        await Promise.all([action.setImage(frames[0]), action.setTitle("")]);

        if (frames.length <= 1) {
            return;
        }

        let frameIndex = 1;
        const timer = setInterval(() => {
            const state = this.animations.get(contextId);
            if (!state) return;
            state.frameIndex = frameIndex;
            void action.setImage(frames[frameIndex]);
            frameIndex = (frameIndex + 1) % frames.length;
        }, WEATHER_FRAME_INTERVAL_MS);

        this.animations.set(contextId, { frames, frameIndex: 0, timer });
    }

    private stopAnimation(contextId: string): void {
        const state = this.animations.get(contextId);
        if (state) {
            clearInterval(state.timer);
            this.animations.delete(contextId);
        }
    }
}

import { selfRegister } from "./registry";
selfRegister(new WeatherDisplayAction());
