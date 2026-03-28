interface ActionSettings extends Record<string, unknown> {
    entityId?: string;
    serviceId?: string;
    payload?: string;
    brightness?: number;
    color?: string;
    colorType?: string;
    temperature?: number;
}

interface KeyDownData {
    context: string;
    settings: ActionSettings;
    coordinates?: { column: number; row: number };
    userDesiredState?: number;
    state?: number;
}

class Action {
    constructor(protected context: string, protected settings: ActionSettings = {}) {}

    getSettings(): ActionSettings {
        return this.settings;
    }

    onSettingsUpdate(updatedSettings: ActionSettings): void {
        logMessage("Received updated settings");
        logMessage(updatedSettings);
        this.settings = updatedSettings;
    }

    onKeyDown(_data: KeyDownData): void {
        // default no-op
    }
}
