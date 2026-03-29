import { action, KeyDownEvent, WillAppearEvent } from "@elgato/streamdeck";

import type { ActionSettings, HomeAssistantEntity } from "../../shared/types";
import { logMessage } from "../logging";
import { BaseAction } from "./base";
import { ActionType } from "../../shared/actionTypes";
import { homeAssistantClient } from "../services/homeAssistant";

// Commands that live under a different domain than media_player
const DOMAIN_OVERRIDES: Partial<Record<string, string>> = {
    turn_on: "homeassistant",
    turn_off: "homeassistant",
};

@action({ UUID: ActionType.MEDIA_PLAYER })
export class MediaPlayerAction extends BaseAction {
    constructor() {
        super();
        homeAssistantClient.on("stateChanged", (entityId, state) => this.handleStateChange(entityId, state));
    }

    protected override async handleWillAppear(ev: WillAppearEvent<ActionSettings>): Promise<void> {
        const settings = this.getContextSettings(ev.action.id);
        if (settings?.entityId) {
            await this.updateArtwork(ev.action.id);
        }
    }

    protected override async handleKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
        const settings = this.getContextSettings(ev.action.id);
        const entityId = settings?.entityId;
        if (!entityId) {
            logMessage("MediaPlayerAction requires an entityId setting.");
            await ev.action.showAlert();
            return;
        }

        const command = settings?.mediaCommand;
        if (!command) {
            logMessage("MediaPlayerAction requires a mediaCommand setting.");
            await ev.action.showAlert();
            return;
        }

        const domain = DOMAIN_OVERRIDES[command] ?? "media_player";

        try {
            await homeAssistantClient.callService(domain, command, { entity_id: entityId });
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

        const entityPicture = newState.attributes.entity_picture;

        await Promise.all(
            matchingContexts.map(async ([, context]) => {
                if (typeof entityPicture === "string" && newState.state !== "off" && newState.state !== "idle" && newState.state !== "unavailable") {
                    try {
                        const imageDataUrl = await homeAssistantClient.fetchImage(entityPicture);
                        await context.action.setImage(imageDataUrl);
                    } catch (error) {
                        logMessage(error);
                        await context.action.setImage(undefined);
                    }
                } else {
                    await context.action.setImage(undefined);
                }
            }),
        );
    }

    private async updateArtwork(contextId: string): Promise<void> {
        const context = Array.from(this.getAllContexts()).find(([id]) => id === contextId);
        if (!context) {
            return;
        }

        const [, { settings, action }] = context;
        if (!settings.entityId) {
            return;
        }

        // Fetch current state via get_states to get entity_picture immediately on appear
        try {
            const states = await homeAssistantClient.getEntityStates();
            const entity = states.find((e) => e.entity_id === settings.entityId);
            if (!entity) {
                return;
            }

            const entityPicture = entity.attributes.entity_picture;
            if (typeof entityPicture === "string" && entity.state !== "off" && entity.state !== "idle" && entity.state !== "unavailable") {
                const imageDataUrl = await homeAssistantClient.fetchImage(entityPicture);
                await action.setImage(imageDataUrl);
            }
        } catch (error) {
            logMessage(error);
        }
    }
}
