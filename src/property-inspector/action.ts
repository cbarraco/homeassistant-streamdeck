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

// Stores the last population args per select so the filter can re-run them.
const entitySelectCache = new WeakMap<HTMLSelectElement, { type: string | undefined; cache: HomeAssistantCache }>();

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

        entitySelectCache.set(element, { type, cache });
        ActionPI.ensureEntityFilterInput(element);

        const filterId = `${element.id}-filter`;
        const filterInput = document.getElementById(filterId) as HTMLInputElement | null;
        const filterText = filterInput?.value.trim().toLowerCase() ?? "";

        element.innerHTML = "";

        const keys = type ? [type] : Object.getOwnPropertyNames(cache.entities);

        keys.forEach((typeKey) => {
            const optGroup = document.createElement("optgroup");
            optGroup.label = typeKey;
            const optionValues = cache.entities[typeKey] ?? [];
            optionValues.forEach((value) => {
                if (filterText && !value.entity_id.toLowerCase().includes(filterText)) {
                    return;
                }
                const option = document.createElement("option");
                option.value = value.entity_id;
                option.innerHTML = value.entity_id;
                optGroup.appendChild(option);
            });
            if (optGroup.children.length > 0) {
                element.appendChild(optGroup);
            }
        });
    }

    private static ensureEntityFilterInput(element: HTMLSelectElement): void {
        const filterId = `${element.id}-filter`;
        if (document.getElementById(filterId)) {
            return;
        }

        const filterInput = document.createElement("input");
        filterInput.type = "search";
        filterInput.id = filterId;
        filterInput.placeholder = "Filter entities...";
        filterInput.className = "sdpi-item-value";
        filterInput.style.width = "100%";
        filterInput.style.boxSizing = "border-box";
        filterInput.style.minHeight = "26px";
        filterInput.style.marginBottom = "4px";
        filterInput.style.marginLeft = "0px";

        filterInput.addEventListener("input", () => {
            const data = entitySelectCache.get(element);
            if (!data) {
                return;
            }
            const previousValue = element.value;
            ActionPI.populateEntityOptions(element, data.type, data.cache);
            element.value = previousValue;
        });

        const wrapper = document.createElement("div");
        wrapper.style.display = "flex";
        wrapper.style.flexDirection = "column";
        wrapper.style.flex = "1";
        wrapper.style.marginLeft = "4px";
        wrapper.style.marginRight = "13px";

        element.style.width = "100%";
        element.style.boxSizing = "border-box";
        element.style.minHeight = "26px";
        element.style.marginLeft = "0px";
        element.style.marginRight = "0px";

        element.parentElement?.insertBefore(wrapper, element);
        wrapper.appendChild(filterInput);
        wrapper.appendChild(element);
    }
}

