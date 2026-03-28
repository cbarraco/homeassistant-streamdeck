import { logMessage } from "../../../lib/logging.js";
import type { HomeAssistantCache } from "../../../lib/globals.js";
import { saveSettings } from "../../../lib/utils.js";
import { ActionPI, type PropertyInspectorActionInfo } from "../actionPI.js";

export class CallServiceActionPI extends ActionPI {
    constructor(uuid: string, actionInfo: PropertyInspectorActionInfo) {
        super(uuid, actionInfo);
    }

    setUp(): void {
        super.setUp();
        logMessage("Injecting call service parameters");
        const wrapper = document.getElementById("wrapper");
        if (!wrapper) {
            return;
        }

        wrapper.insertAdjacentHTML(
            "beforeend",
            `
            <div class="sdpi-item">
                <div class="sdpi-item-label">Service</div>
                <select class="sdpi-item-value select" id="serviceId">
                </select>
            </div>
            <div type="textarea" class="sdpi-item">
                <div class="sdpi-item-label">Payload</div>
                <span class="sdpi-item-value textarea">
                    <textarea type="textarea" id="payload"></textarea>
                </span>
            </div>`
        );

        const serviceIdElement = document.getElementById("serviceId") as HTMLSelectElement | null;
        const payloadElement = document.getElementById("payload") as HTMLTextAreaElement | null;

        if (serviceIdElement && this.settings.serviceId) {
            serviceIdElement.value = this.settings.serviceId;
        }

        serviceIdElement?.addEventListener("input", (event) => {
            const value = (event.target as HTMLSelectElement).value;
            this.settings.serviceId = value;
            saveSettings(this.action, this.uuid, this.settings);
        });

        if (payloadElement && typeof this.settings.payload === "string") {
            payloadElement.value = this.settings.payload;
        }

        payloadElement?.addEventListener("input", (event) => {
            const value = (event.target as HTMLTextAreaElement).value;
            this.settings.payload = value;
            saveSettings(this.action, this.uuid, this.settings);
        });
    }

    update(homeAssistantCache: HomeAssistantCache): void {
        const serviceIdElement = document.getElementById("serviceId") as HTMLSelectElement | null;
        if (!serviceIdElement) {
            return;
        }

        this.populateOptionsFromCacheProperty(serviceIdElement, homeAssistantCache.services);
        if (this.settings.serviceId) {
            serviceIdElement.value = this.settings.serviceId;
        } else if (serviceIdElement.options.length > 0) {
            this.settings.serviceId = serviceIdElement.value;
            saveSettings(this.action, this.uuid, this.settings);
        }

        const payloadElement = document.getElementById("payload") as HTMLTextAreaElement | null;
        if (payloadElement && typeof this.settings.payload === "string") {
            payloadElement.value = this.settings.payload;
        }
    }

    private populateOptionsFromCacheProperty(
        element: HTMLSelectElement,
        cacheProperty: Record<string, string[]>,
        type?: string
    ): void {
        element.innerHTML = "";

        const keys = type ? [type] : Object.getOwnPropertyNames(cacheProperty);
        keys.forEach((typeKey) => {
            const optGroup = document.createElement("optgroup");
            optGroup.label = typeKey;
            const optionValues = cacheProperty[typeKey] ?? [];
            optionValues.forEach((optionValue) => {
                const option = document.createElement("option");
                option.value = optionValue;
                option.innerHTML = optionValue;
                optGroup.appendChild(option);
            });
            element.appendChild(optGroup);
        });
    }
}
