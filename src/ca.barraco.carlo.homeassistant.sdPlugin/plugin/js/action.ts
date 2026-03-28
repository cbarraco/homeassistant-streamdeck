import { logMessage } from "../../lib/logging.js";

export interface ActionSettings extends Record<string, unknown> {
    entityId?: string;
    serviceId?: string;
    payload?: string;
    brightness?: number;
    color?: string;
    colorType?: string;
    temperature?: number;
}

export interface KeyDownData {
    context: string;
    settings: ActionSettings;
    coordinates?: { column: number; row: number };
    userDesiredState?: number;
    state?: number;
}

export class Action {
    constructor(protected context: string, protected settings: ActionSettings = {}) {}

    getSettings(): ActionSettings {
        return this.settings;
    }

    onSettingsUpdate(updatedSettings: ActionSettings): void {
        logMessage("Received updated settings");
        logMessage(updatedSettings);
        this.settings = updatedSettings;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onKeyDown(_data: KeyDownData): void {
        // default no-op
    }
}
