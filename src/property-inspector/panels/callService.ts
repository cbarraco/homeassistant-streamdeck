import { logMessage } from "../logging";
import type { HomeAssistantCache } from "../globals";
import { saveSettings } from "../utils";
import { ActionPI, type PropertyInspectorActionInfo } from "../action";

type CallServiceControls = {
    serviceSelect: HTMLSelectElement;
    payloadInput: HTMLTextAreaElement;
};

const callServiceForm = createCallServiceForm();

export class CallServicePIAction extends ActionPI {
    constructor(uuid: string, actionInfo: PropertyInspectorActionInfo) {
        super(uuid, actionInfo);
    }

    override setUp(): void {
        super.setUp();
        logMessage("Injecting call service parameters");
        const controls = callServiceForm.ensureMounted();
        if (!controls) {
            return;
        }

        const { serviceSelect, payloadInput } = controls;

        if (this.settings.serviceId) {
            serviceSelect.value = this.settings.serviceId;
        }

        serviceSelect.oninput = (event) => {
            const value = (event.currentTarget as HTMLSelectElement).value;
            this.settings.serviceId = value;
            saveSettings(this.action, this.uuid, this.settings);
        };

        if (typeof this.settings.payload === "string") {
            payloadInput.value = this.settings.payload;
        }

        payloadInput.oninput = (event) => {
            const value = (event.currentTarget as HTMLTextAreaElement).value;
            this.settings.payload = value;
            saveSettings(this.action, this.uuid, this.settings);
        };
    }

    override update(homeAssistantCache: HomeAssistantCache): void {
        const controls = callServiceForm.getControls();
        if (!controls) {
            return;
        }
        const { serviceSelect, payloadInput } = controls;

        this.populateOptionsFromCacheProperty(serviceSelect, homeAssistantCache.services);
        if (this.settings.serviceId) {
            serviceSelect.value = this.settings.serviceId;
        } else if (serviceSelect.options.length > 0) {
            this.settings.serviceId = serviceSelect.value;
            saveSettings(this.action, this.uuid, this.settings);
        }

        if (typeof this.settings.payload === "string") {
            payloadInput.value = this.settings.payload;
        }
    }

    private populateOptionsFromCacheProperty(
        element: HTMLSelectElement,
        cacheProperty: Record<string, string[]>,
        type?: string,
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

function createCallServiceForm(): {
    ensureMounted: () => CallServiceControls | null;
    getControls: () => CallServiceControls | null;
} {
    type InternalElements = {
        serviceItem: HTMLDivElement;
        payloadItem: HTMLDivElement;
        controls: CallServiceControls;
    };

    let elements: InternalElements | null = null;

    function buildElements(): InternalElements {
        const serviceItem = document.createElement("div");
        serviceItem.className = "sdpi-item";

        const serviceLabel = document.createElement("div");
        serviceLabel.className = "sdpi-item-label";
        serviceLabel.textContent = "Service";

        const serviceSelect = document.createElement("select");
        serviceSelect.className = "sdpi-item-value select";
        serviceSelect.id = "serviceId";

        serviceItem.append(serviceLabel, serviceSelect);

        const payloadItem = document.createElement("div");
        payloadItem.className = "sdpi-item";
        payloadItem.setAttribute("type", "textarea");

        const payloadLabel = document.createElement("div");
        payloadLabel.className = "sdpi-item-label";
        payloadLabel.textContent = "Payload";

        const payloadWrapper = document.createElement("span");
        payloadWrapper.className = "sdpi-item-value textarea";

        const payloadInput = document.createElement("textarea");
        payloadInput.id = "payload";
        payloadInput.setAttribute("type", "textarea");

        payloadWrapper.appendChild(payloadInput);
        payloadItem.append(payloadLabel, payloadWrapper);

        return {
            serviceItem,
            payloadItem,
            controls: {
                serviceSelect,
                payloadInput,
            },
        };
    }

    function ensureMounted(): CallServiceControls | null {
        const wrapper = document.getElementById("wrapper");
        if (!wrapper) {
            return null;
        }

        if (!elements) {
            elements = buildElements();
        }

        if (!elements.serviceItem.isConnected) {
            wrapper.appendChild(elements.serviceItem);
        }

        if (!elements.payloadItem.isConnected) {
            wrapper.appendChild(elements.payloadItem);
        }

        return elements.controls;
    }

    function getControls(): CallServiceControls | null {
        return elements?.controls ?? null;
    }

    return {
        ensureMounted,
        getControls,
    };
}
