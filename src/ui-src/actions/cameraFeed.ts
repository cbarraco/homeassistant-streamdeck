import { logMessage } from "../logging";
import type { HomeAssistantCache } from "../globals";
import { saveSettings } from "../utils";
import { ActionPI, type PropertyInspectorActionInfo } from "../propertyInspector/action";

const cameraFeedForm = createCameraFeedForm();

export class CameraFeedPIAction extends ActionPI {
    constructor(uuid: string, actionInfo: PropertyInspectorActionInfo) {
        super(uuid, actionInfo);
    }

    override setUp(): void {
        super.setUp();
        logMessage("Injecting camera feed parameters");
        const controls = cameraFeedForm.ensureMounted();
        if (!controls) {
            return;
        }

        const { entitySelect, refreshIntervalInput } = controls;

        if (this.settings.entityId) {
            entitySelect.value = this.settings.entityId;
        }

        entitySelect.addEventListener("input", (event) => {
            const value = (event.target as HTMLSelectElement).value;
            this.settings.entityId = value;
            saveSettings(this.action, this.uuid, this.settings);
        });

        if (typeof this.settings.refreshInterval === "number") {
            refreshIntervalInput.value = String(this.settings.refreshInterval);
        }

        refreshIntervalInput.addEventListener("change", (event) => {
            const value = Number((event.target as HTMLInputElement).value);
            this.settings.refreshInterval = value;
            saveSettings(this.action, this.uuid, this.settings);
        });
    }

    override update(homeAssistantCache: HomeAssistantCache): void {
        const controls = cameraFeedForm.getControls();
        if (!controls) {
            return;
        }

        const { entitySelect } = controls;
        ActionPI.populateEntityOptions(entitySelect, "camera", homeAssistantCache);

        if (this.settings.entityId) {
            entitySelect.value = this.settings.entityId;
        } else if (entitySelect.options.length > 0) {
            this.settings.entityId = entitySelect.value;
            saveSettings(this.action, this.uuid, this.settings);
        }
    }
}

function createCameraFeedForm(): {
    ensureMounted: () => { entitySelect: HTMLSelectElement; refreshIntervalInput: HTMLInputElement } | null;
    getControls: () => { entitySelect: HTMLSelectElement; refreshIntervalInput: HTMLInputElement } | null;
} {
    type Controls = {
        entitySelect: HTMLSelectElement;
        refreshIntervalInput: HTMLInputElement;
    };

    type InternalElements = {
        entityItem: HTMLDivElement;
        refreshIntervalItem: HTMLDivElement;
        controls: Controls;
    };

    let elements: InternalElements | null = null;

    function buildElements(): InternalElements {
        const entityItem = document.createElement("div");
        entityItem.className = "sdpi-item";

        const entityLabel = document.createElement("div");
        entityLabel.className = "sdpi-item-label";
        entityLabel.textContent = "Camera Entity";

        const entitySelect = document.createElement("select");
        entitySelect.className = "sdpi-item-value select";
        entitySelect.id = "cameraEntityId";

        entityItem.append(entityLabel, entitySelect);

        const refreshIntervalItem = document.createElement("div");
        refreshIntervalItem.className = "sdpi-item";

        const refreshIntervalLabel = document.createElement("div");
        refreshIntervalLabel.className = "sdpi-item-label";
        refreshIntervalLabel.textContent = "Refresh (s)";

        const refreshIntervalInput = document.createElement("input");
        refreshIntervalInput.className = "sdpi-item-value";
        refreshIntervalInput.id = "cameraRefreshInterval";
        refreshIntervalInput.type = "number";
        refreshIntervalInput.min = "1";
        refreshIntervalInput.max = "3600";
        refreshIntervalInput.value = "5";

        refreshIntervalItem.append(refreshIntervalLabel, refreshIntervalInput);

        return {
            entityItem,
            refreshIntervalItem,
            controls: { entitySelect, refreshIntervalInput },
        };
    }

    function ensureMounted(): Controls | null {
        const wrapper = document.getElementById("wrapper");
        if (!wrapper) {
            return null;
        }

        if (!elements) {
            elements = buildElements();
        }

        if (!elements.entityItem.isConnected) {
            wrapper.appendChild(elements.entityItem);
        }

        if (!elements.refreshIntervalItem.isConnected) {
            wrapper.appendChild(elements.refreshIntervalItem);
        }

        return elements.controls;
    }

    function getControls(): Controls | null {
        return elements?.controls ?? null;
    }

    return { ensureMounted, getControls };
}
