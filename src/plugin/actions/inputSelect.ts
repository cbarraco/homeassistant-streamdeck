import { action, DidReceiveSettingsEvent, KeyDownEvent, WillAppearEvent } from "@elgato/streamdeck";

import type { ActionSettings, HomeAssistantEntity } from "../../shared/types";
import { getNextOption } from "../utils/inputSelectUtils";
import { logMessage } from "../logging";
import { homeAssistantClient } from "../services/homeAssistant";
import { cacheManager } from "../state/cache";
import { BaseAction } from "./base";
import { ActionType } from "../../shared/actionTypes";

@action({ UUID: ActionType.INPUT_SELECT })
export class InputSelectAction extends BaseAction {
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
            logMessage("InputSelectAction requires an entityId setting.");
            await ev.action.showAlert();
            return;
        }

        const entity = cacheManager.getEntity(entityId);
        if (!entity) {
            logMessage(`InputSelectAction: no cached state for ${entityId}`);
            await ev.action.showAlert();
            return;
        }

        const options = entity.attributes["options"];
        if (!Array.isArray(options) || options.length === 0) {
            logMessage(`InputSelectAction: no options available for ${entityId}`);
            await ev.action.showAlert();
            return;
        }

        const nextOption = getNextOption(options, entity.state);
        if (nextOption === undefined) {
            logMessage(`InputSelectAction: could not determine next option for ${entityId}`);
            await ev.action.showAlert();
            return;
        }

        try {
            await homeAssistantClient.callService("input_select", "select_option", {
                entity_id: entityId,
                option: nextOption,
            });
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
            logMessage(`InputSelectAction: no cached state for ${entityId}`);
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
