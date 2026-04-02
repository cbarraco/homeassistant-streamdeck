import { action, DidReceiveSettingsEvent, WillAppearEvent } from "@elgato/streamdeck";

import type { ActionSettings, HomeAssistantEntity } from "../../shared/types";
import { logMessage } from "../logging";
import { homeAssistantClient } from "../services/homeAssistant";
import { cacheManager } from "../state/cache";
import { BaseAction } from "./base";
import { ActionType } from "../../shared/actionTypes";
import { getAttributeDisplayValue } from "./displayAttributeUtils";

@action({ UUID: ActionType.DISPLAY_ATTRIBUTE })
export class DisplayAttributeAction extends BaseAction {
    constructor() {
        super();
        homeAssistantClient.on("stateChanged", (entityId, state) => this.handleStateChange(entityId, state));
    }

    protected override async handleWillAppear(ev: WillAppearEvent<ActionSettings>): Promise<void> {
        const { entityId, attributeKey } = ev.payload.settings ?? {};
        if (entityId && attributeKey) {
            await this.updateTitle(entityId, attributeKey);
        }
    }

    protected override async handleSettingsChanged(ev: DidReceiveSettingsEvent<ActionSettings>): Promise<void> {
        const { entityId, attributeKey } = ev.payload.settings ?? {};
        if (entityId && attributeKey) {
            await this.updateTitle(entityId, attributeKey);
        }
    }

    private async handleStateChange(entityId: string, newState: HomeAssistantEntity): Promise<void> {
        const matchingContexts = Array.from(this.getAllContexts()).filter(
            ([, context]) =>
                context.settings.entityId === entityId && context.settings.attributeKey,
        );
        if (matchingContexts.length === 0) {
            return;
        }

        await Promise.all(
            matchingContexts.map(([, context]) => {
                const displayValue = getAttributeDisplayValue(
                    newState.attributes,
                    context.settings.attributeKey!,
                );
                return context.action.setTitle(displayValue);
            }),
        );
    }

    private async updateTitle(entityId: string, attributeKey: string): Promise<void> {
        const entity = cacheManager.getEntity(entityId);
        if (!entity) {
            logMessage(`DisplayAttributeAction: no cached state for ${entityId}`);
            return;
        }

        const matchingContexts = Array.from(this.getAllContexts()).filter(
            ([, context]) =>
                context.settings.entityId === entityId &&
                context.settings.attributeKey === attributeKey,
        );

        const displayValue = getAttributeDisplayValue(entity.attributes, attributeKey);
        await Promise.all(
            matchingContexts.map(([, context]) => context.action.setTitle(displayValue)),
        );
    }
}

import { selfRegister } from "./registry";
selfRegister(new DisplayAttributeAction());
