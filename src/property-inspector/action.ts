import { logMessage } from "./logging";
import type { ActionTypeValue } from "../shared/actionTypes";
import type { HomeAssistantCache } from "./globals";
import type { ActionSettings } from "../shared/types";

export interface PropertyInspectorActionInfo {
    action: ActionTypeValue;
    context: string;
    payload: {
        settings?: ActionSettings;
    };
}

export class ActionPI {
    protected settings: ActionSettings;
    protected action: ActionTypeValue;
    protected context: string;

    constructor(protected uuid: string, protected actionInfo: PropertyInspectorActionInfo) {
        this.settings = (actionInfo.payload.settings ?? {}) as ActionSettings;
        this.action = actionInfo.action;
        this.context = actionInfo.context;
    }

    setSettings(updatedSettings: ActionSettings): void {
        this.settings = updatedSettings;
    }

    setUp(): void {
        // default no-op
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(_homeAssistantCache: HomeAssistantCache): void {
        // default no-op
    }

    static populateEntityOptions(element: HTMLSelectElement, type: string | undefined, cache: HomeAssistantCache): void {
        logMessage("Populating entities parameter options");

        if (!cache.entities) {
            logMessage("Cache is not populated yet");
            return;
        }

        element.innerHTML = "";

        const keys = type ? [type] : Object.getOwnPropertyNames(cache.entities);

        keys.forEach((typeKey) => {
            const optGroup = document.createElement("optgroup");
            optGroup.label = typeKey;
            const optionValues = cache.entities[typeKey] ?? [];
            optionValues.forEach((value) => {
                const option = document.createElement("option");
                option.value = value.entity_id;
                option.innerHTML = value.entity_id;
                optGroup.appendChild(option);
            });
            element.appendChild(optGroup);
        });
    }
}

