import { action, KeyDownEvent, WillAppearEvent, WillDisappearEvent, DidReceiveSettingsEvent } from "@elgato/streamdeck";

import type { ActionSettings } from "../../../shared/types";
import { logMessage } from "../../logging";
import { BaseAction } from "./baseAction";
import { ActionType } from "../../../shared/actionTypes";
import { homeAssistantClient } from "../../services/homeAssistantClient";

const DEFAULT_REFRESH_INTERVAL_S = 5;

@action({ UUID: ActionType.CAMERA_THUMBNAIL })
export class CameraFeedAction extends BaseAction {
    private readonly refreshTimers = new Map<string, NodeJS.Timeout>();

    protected override async handleWillAppear(ev: WillAppearEvent<ActionSettings>): Promise<void> {
        const contextId = ev.action.id;
        await this.updateImage(contextId);
        this.startRefreshTimer(contextId);
    }

    protected override handleWillDisappear(ev: WillDisappearEvent<ActionSettings>): void {
        this.stopRefreshTimer(ev.action.id);
    }

    protected override async handleKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
        await this.updateImage(ev.action.id);
    }

    protected override async handleSettingsChanged(ev: DidReceiveSettingsEvent<ActionSettings>): Promise<void> {
        const contextId = ev.action.id;
        this.stopRefreshTimer(contextId);
        await this.updateImage(contextId);
        this.startRefreshTimer(contextId);
    }

    private startRefreshTimer(contextId: string): void {
        this.stopRefreshTimer(contextId);
        const settings = this.getContextSettings(contextId);
        const intervalSec = settings?.refreshInterval ?? DEFAULT_REFRESH_INTERVAL_S;
        const timer = setInterval(() => {
            void this.updateImage(contextId);
        }, intervalSec * 1000);
        this.refreshTimers.set(contextId, timer);
    }

    private stopRefreshTimer(contextId: string): void {
        const timer = this.refreshTimers.get(contextId);
        if (timer) {
            clearInterval(timer);
            this.refreshTimers.delete(contextId);
        }
    }

    private async updateImage(contextId: string): Promise<void> {
        const settings = this.getContextSettings(contextId);
        const entityId = settings?.entityId;
        if (!entityId) {
            return;
        }

        const context = Array.from(this.getAllContexts()).find(([id]) => id === contextId);
        if (!context) {
            return;
        }

        const [, { action }] = context;
        try {
            const imageDataUrl = await homeAssistantClient.fetchCameraSnapshot(entityId);
            await action.setImage(imageDataUrl);
        } catch (error) {
            logMessage(error);
        }
    }
}
