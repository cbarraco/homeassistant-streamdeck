import { logMessage } from "../logging";
import type { HomeAssistantCache } from "../globals";
import { saveSettings } from "../utils";
import { ActionPI, type PropertyInspectorActionInfo } from "../action";

const fanControlForm = createFanControlForm();

export class FanControlPIAction extends ActionPI {
    constructor(uuid: string, actionInfo: PropertyInspectorActionInfo) {
        super(uuid, actionInfo);
    }

    override setUp(): void {
        super.setUp();
        logMessage("Injecting fan control parameters");
        const controls = fanControlForm.ensureMounted();
        if (!controls) {
            return;
        }

        const { entitySelect, commandSelect, stepInput } = controls;

        if (this.settings.entityId) {
            entitySelect.value = this.settings.entityId;
        }

        entitySelect.addEventListener("input", (event) => {
            const value = (event.target as HTMLSelectElement).value;
            this.settings.entityId = value;
            saveSettings(this.action, this.uuid, this.settings);
        });

        if (this.settings.fanCommand) {
            commandSelect.value = this.settings.fanCommand;
        }

        commandSelect.addEventListener("change", (event) => {
            const value = (event.target as HTMLSelectElement).value;
            this.settings.fanCommand = value;
            saveSettings(this.action, this.uuid, this.settings);
        });

        if (typeof this.settings.percentageStep === "number") {
            stepInput.value = String(this.settings.percentageStep);
        }

        stepInput.addEventListener("change", (event) => {
            const value = Number((event.target as HTMLInputElement).value);
            this.settings.percentageStep = value;
            saveSettings(this.action, this.uuid, this.settings);
        });
    }

    override update(homeAssistantCache: HomeAssistantCache): void {
        const controls = fanControlForm.getControls();
        if (!controls) {
            return;
        }

        const { entitySelect } = controls;
        ActionPI.populateEntityOptions(entitySelect, "fan", homeAssistantCache);

        if (this.settings.entityId) {
            entitySelect.value = this.settings.entityId;
        } else if (entitySelect.options.length > 0) {
            this.settings.entityId = entitySelect.value;
            saveSettings(this.action, this.uuid, this.settings);
        }
    }
}

function createFanControlForm(): {
    ensureMounted: () => { entitySelect: HTMLSelectElement; commandSelect: HTMLSelectElement; stepInput: HTMLInputElement } | null;
    getControls: () => { entitySelect: HTMLSelectElement; commandSelect: HTMLSelectElement; stepInput: HTMLInputElement } | null;
} {
    type Controls = {
        entitySelect: HTMLSelectElement;
        commandSelect: HTMLSelectElement;
        stepInput: HTMLInputElement;
    };

    type InternalElements = {
        entityItem: HTMLDivElement;
        commandItem: HTMLDivElement;
        stepItem: HTMLDivElement;
        controls: Controls;
    };

    let elements: InternalElements | null = null;

    const COMMANDS: { value: string; label: string }[] = [
        { value: "toggle", label: "Toggle On/Off" },
        { value: "increase_speed", label: "Increase Speed" },
        { value: "decrease_speed", label: "Decrease Speed" },
    ];

    function buildElements(): InternalElements {
        const entityItem = document.createElement("div");
        entityItem.className = "sdpi-item";

        const entityLabel = document.createElement("div");
        entityLabel.className = "sdpi-item-label";
        entityLabel.textContent = "Entity";

        const entitySelect = document.createElement("select");
        entitySelect.className = "sdpi-item-value select";
        entitySelect.id = "fanEntityId";

        entityItem.append(entityLabel, entitySelect);

        const commandItem = document.createElement("div");
        commandItem.className = "sdpi-item";

        const commandLabel = document.createElement("div");
        commandLabel.className = "sdpi-item-label";
        commandLabel.textContent = "Command";

        const commandSelect = document.createElement("select");
        commandSelect.className = "sdpi-item-value select";
        commandSelect.id = "fanCommand";

        for (const cmd of COMMANDS) {
            const option = document.createElement("option");
            option.value = cmd.value;
            option.textContent = cmd.label;
            commandSelect.appendChild(option);
        }

        commandItem.append(commandLabel, commandSelect);

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
        stepInput.id = "fanPercentageStep";
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
            commandItem,
            stepItem,
            controls: { entitySelect, commandSelect, stepInput },
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

        if (!elements.commandItem.isConnected) {
            wrapper.appendChild(elements.commandItem);
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
