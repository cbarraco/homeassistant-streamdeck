import { logMessage } from "../logging";
import type { HomeAssistantCache } from "../globals";
import { saveSettings } from "../utils";
import { ActionPI, type PropertyInspectorActionInfo } from "../propertyInspector/action";

const stepLightBrightnessForm = createStepLightBrightnessForm();

export class StepLightBrightnessPIAction extends ActionPI {
    constructor(uuid: string, actionInfo: PropertyInspectorActionInfo) {
        super(uuid, actionInfo);
    }

    override setUp(): void {
        super.setUp();
        logMessage("Injecting step light brightness parameters");
        const controls = stepLightBrightnessForm.ensureMounted();
        if (!controls) {
            return;
        }

        const { entitySelect, directionSelect, stepInput } = controls;

        if (this.settings.entityId) {
            entitySelect.value = this.settings.entityId;
        }

        entitySelect.addEventListener("input", (event) => {
            const value = (event.target as HTMLSelectElement).value;
            this.settings.entityId = value;
            saveSettings(this.action, this.uuid, this.settings);
        });

        if (this.settings.direction) {
            directionSelect.value = this.settings.direction;
        }

        directionSelect.addEventListener("change", (event) => {
            const value = (event.target as HTMLSelectElement).value as "up" | "down";
            this.settings.direction = value;
            saveSettings(this.action, this.uuid, this.settings);
        });

        if (typeof this.settings.brightnessStep === "number") {
            stepInput.value = String(this.settings.brightnessStep);
        }

        stepInput.addEventListener("change", (event) => {
            const value = Number((event.target as HTMLInputElement).value);
            this.settings.brightnessStep = value;
            saveSettings(this.action, this.uuid, this.settings);
        });
    }

    override update(homeAssistantCache: HomeAssistantCache): void {
        const controls = stepLightBrightnessForm.getControls();
        if (!controls) {
            return;
        }

        const { entitySelect } = controls;
        ActionPI.populateEntityOptions(entitySelect, "light", homeAssistantCache);

        if (this.settings.entityId) {
            entitySelect.value = this.settings.entityId;
        } else if (entitySelect.options.length > 0) {
            this.settings.entityId = entitySelect.value;
            saveSettings(this.action, this.uuid, this.settings);
        }
    }
}

function createStepLightBrightnessForm(): {
    ensureMounted: () => { entitySelect: HTMLSelectElement; directionSelect: HTMLSelectElement; stepInput: HTMLInputElement } | null;
    getControls: () => { entitySelect: HTMLSelectElement; directionSelect: HTMLSelectElement; stepInput: HTMLInputElement } | null;
} {
    type Controls = {
        entitySelect: HTMLSelectElement;
        directionSelect: HTMLSelectElement;
        stepInput: HTMLInputElement;
    };

    type InternalElements = {
        entityItem: HTMLDivElement;
        directionItem: HTMLDivElement;
        stepItem: HTMLDivElement;
        controls: Controls;
    };

    let elements: InternalElements | null = null;

    function buildElements(): InternalElements {
        const entityItem = document.createElement("div");
        entityItem.className = "sdpi-item";

        const entityLabel = document.createElement("div");
        entityLabel.className = "sdpi-item-label";
        entityLabel.textContent = "Entity";

        const entitySelect = document.createElement("select");
        entitySelect.className = "sdpi-item-value select";
        entitySelect.id = "stepBrightnessEntityId";

        entityItem.append(entityLabel, entitySelect);

        const directionItem = document.createElement("div");
        directionItem.className = "sdpi-item";

        const directionLabel = document.createElement("div");
        directionLabel.className = "sdpi-item-label";
        directionLabel.textContent = "Direction";

        const directionSelect = document.createElement("select");
        directionSelect.className = "sdpi-item-value select";
        directionSelect.id = "brightnessDirection";

        const upOption = document.createElement("option");
        upOption.value = "up";
        upOption.textContent = "Up";

        const downOption = document.createElement("option");
        downOption.value = "down";
        downOption.textContent = "Down";

        directionSelect.append(upOption, downOption);
        directionItem.append(directionLabel, directionSelect);

        const stepItem = document.createElement("div");
        stepItem.className = "sdpi-item";
        stepItem.setAttribute("type", "range");

        const stepLabel = document.createElement("div");
        stepLabel.className = "sdpi-item-label";
        stepLabel.textContent = "Step %";

        const stepValueWrapper = document.createElement("div");
        stepValueWrapper.className = "sdpi-item-value";

        const minSpan = document.createElement("span");
        minSpan.className = "clickable";
        minSpan.setAttribute("value", "1");
        minSpan.textContent = "1%";

        const stepInput = document.createElement("input");
        stepInput.id = "brightnessStep";
        stepInput.type = "range";
        stepInput.min = "1";
        stepInput.max = "100";
        stepInput.value = "10";

        const maxSpan = document.createElement("span");
        maxSpan.className = "clickable";
        maxSpan.setAttribute("value", "100");
        maxSpan.textContent = "100%";

        stepValueWrapper.append(minSpan, stepInput, maxSpan);
        stepItem.append(stepLabel, stepValueWrapper);

        return {
            entityItem,
            directionItem,
            stepItem,
            controls: { entitySelect, directionSelect, stepInput },
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

        if (!elements.directionItem.isConnected) {
            wrapper.appendChild(elements.directionItem);
        }

        if (!elements.stepItem.isConnected) {
            wrapper.appendChild(elements.stepItem);
        }

        return elements.controls;
    }

    function getControls(): Controls | null {
        return elements?.controls ?? null;
    }

    return { ensureMounted, getControls };
}
