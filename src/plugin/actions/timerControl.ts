import { action, DidReceiveSettingsEvent, KeyDownEvent, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";

import type { ActionSettings, HomeAssistantEntity } from "../../shared/types";
import { logMessage } from "../logging";
import { homeAssistantClient } from "../services/homeAssistant";
import { cacheManager } from "../state/cache";
import { BaseAction } from "./base";
import { ActionType } from "../../shared/actionTypes";

const DEFAULT_COMMAND = "toggle";
const TICK_INTERVAL_MS = 1000;

@action({ UUID: ActionType.TIMER_CONTROL })
export class TimerControlAction extends BaseAction {
    // Map of entityId -> interval handle for active countdown ticks
    private readonly countdownIntervals = new Map<string, ReturnType<typeof setInterval>>();

    constructor() {
        super();
        homeAssistantClient.on("stateChanged", (entityId, state) => this.handleStateChange(entityId, state));
    }

    protected override async handleWillAppear(ev: WillAppearEvent<ActionSettings>): Promise<void> {
        const entityId = ev.payload.settings?.entityId;
        if (entityId) {
            await this.syncEntity(entityId);
        }
    }

    protected override async handleWillDisappear(_ev: WillDisappearEvent<ActionSettings>): Promise<void> {
        // Stop all countdown intervals when no buttons are visible
        for (const [entityId, interval] of this.countdownIntervals) {
            clearInterval(interval);
            this.countdownIntervals.delete(entityId);
        }
    }

    protected override async handleSettingsChanged(ev: DidReceiveSettingsEvent<ActionSettings>): Promise<void> {
        const entityId = ev.payload.settings?.entityId;
        if (entityId) {
            await this.syncEntity(entityId);
        }
    }

    protected override async handleKeyDown(ev: KeyDownEvent<ActionSettings>): Promise<void> {
        const settings = this.getContextSettings(ev.action.id);
        const entityId = settings?.entityId;
        if (!entityId) {
            logMessage("TimerControlAction requires an entityId setting.");
            await ev.action.showAlert();
            return;
        }

        const command = settings?.timerCommand ?? DEFAULT_COMMAND;

        try {
            if (command === "toggle") {
                const entity = cacheManager.getEntity(entityId);
                const service = entity?.state === "active" ? "pause" : "start";
                await homeAssistantClient.callService("timer", service, { entity_id: entityId });
            } else {
                await homeAssistantClient.callService("timer", command, { entity_id: entityId });
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

        this.stopCountdown(entityId);

        if (newState.state === "active") {
            this.startCountdown(entityId, newState);
        } else {
            const title = this.formatStaticTitle(newState);
            await Promise.all(
                matchingContexts.map(([, context]) => context.action.setTitle(title)),
            );
        }
    }

    private async syncEntity(entityId: string): Promise<void> {
        const entity = cacheManager.getEntity(entityId);
        if (!entity) {
            logMessage(`TimerControlAction: no cached state for ${entityId}`);
            return;
        }

        this.stopCountdown(entityId);

        if (entity.state === "active") {
            this.startCountdown(entityId, entity);
        } else {
            const title = this.formatStaticTitle(entity);
            const matchingContexts = Array.from(this.getAllContexts()).filter(
                ([, context]) => context.settings.entityId === entityId,
            );
            await Promise.all(
                matchingContexts.map(([, context]) => context.action.setTitle(title)),
            );
        }
    }

    private startCountdown(entityId: string, entity: HomeAssistantEntity): void {
        const finishesAt = entity.attributes["finishes_at"] as string | undefined;
        if (!finishesAt) {
            return;
        }

        const tick = async (): Promise<void> => {
            const remainingMs = new Date(finishesAt).getTime() - Date.now();
            const matchingContexts = Array.from(this.getAllContexts()).filter(
                ([, context]) => context.settings.entityId === entityId,
            );
            if (matchingContexts.length === 0) {
                this.stopCountdown(entityId);
                return;
            }

            if (remainingMs <= 0) {
                this.stopCountdown(entityId);
                await Promise.all(
                    matchingContexts.map(([, context]) => context.action.setTitle("idle")),
                );
                return;
            }

            const title = this.formatDuration(Math.ceil(remainingMs / 1000));
            await Promise.all(
                matchingContexts.map(([, context]) => context.action.setTitle(title)),
            );
        };

        void tick();
        const interval = setInterval(() => void tick(), TICK_INTERVAL_MS);
        this.countdownIntervals.set(entityId, interval);
    }

    private stopCountdown(entityId: string): void {
        const interval = this.countdownIntervals.get(entityId);
        if (interval !== undefined) {
            clearInterval(interval);
            this.countdownIntervals.delete(entityId);
        }
    }

    private formatStaticTitle(entity: HomeAssistantEntity): string {
        if (entity.state === "paused") {
            const remaining = entity.attributes["remaining"] as string | undefined;
            if (remaining) {
                const seconds = this.parseDurationString(remaining);
                return `⏸ ${this.formatDuration(seconds)}`;
            }
        }
        return entity.state;
    }

    private formatDuration(totalSeconds: number): string {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) {
            return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
        }
        return `${m}:${String(s).padStart(2, "0")}`;
    }

    private parseDurationString(duration: string): number {
        const parts = duration.split(":").map(Number);
        if (parts.length === 3) {
            return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
        }
        if (parts.length === 2) {
            return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
        }
        return parts[0] ?? 0;
    }
}
