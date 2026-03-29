import { action, DidReceiveSettingsEvent, KeyDownEvent, WillAppearEvent } from "@elgato/streamdeck";

import type { ActionSettings, HomeAssistantEntity } from "../../shared/types";
import { logMessage } from "../logging";
import { homeAssistantClient } from "../services/homeAssistant";
import { cacheManager } from "../state/cache";
import { BaseAction } from "./base";
import { ActionType } from "../../shared/actionTypes";

const DEFAULT_COMMAND = "toggle";

@action({ UUID: ActionType.LOCK_CONTROL })
export class LockControlAction extends BaseAction {
    constructor() {
        super();
        homeAssistantClient.on("stateChanged", (entityId, state) => this.handleStateChange(entityId, state));
    }

    protected override async handleWillAppear(ev: WillAppearEvent<ActionSettings>): Promise<void> {
        const entityId = ev.payload.settings?.entityId;
        if (entityId) {
            await this.updateTitle(entityId);
        }
    }

    protected override async handleSettingsChanged(ev: DidReceiveSettingsEvent<ActionSettings>): Promise<void> {
        const entityId = ev.payload.settings?.entityId;
        if (entityId) {
            await this.updateTitle(entityId);
        }
    }

    protected override async handleKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
        const settings = this.getContextSettings(ev.action.id);
        const entityId = settings?.entityId;
        if (!entityId) {
            logMessage("LockControlAction requires an entityId setting.");
            await ev.action.showAlert();
            return;
        }

        const command = settings?.lockCommand ?? DEFAULT_COMMAND;

        try {
            if (command === "toggle") {
                const entity = cacheManager.getEntity(entityId);
                const service = entity?.state === "locked" ? "unlock" : "lock";
                await homeAssistantClient.callService("lock", service, { entity_id: entityId });
            } else {
                await homeAssistantClient.callService("lock", command, { entity_id: entityId });
            }
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

        await Promise.all(
            matchingContexts.map(([, context]) => context.action.setTitle(newState.state)),
        );
    }

    private async updateTitle(entityId: string): Promise<void> {
        const entity = cacheManager.getEntity(entityId);
        if (!entity) {
            logMessage(`LockControlAction: no cached state for ${entityId}`);
            return;
        }

        const matchingContexts = Array.from(this.getAllContexts()).filter(
            ([, context]) => context.settings.entityId === entityId,
        );

        await Promise.all(
            matchingContexts.map(([, context]) => context.action.setTitle(entity.state)),
        );
    }
}
