import { logMessage } from "../logging";
import type { HomeAssistantCache } from "../globals";
import { saveSettings } from "../utils";
import { ActionPI, type PropertyInspectorActionInfo } from "../action";

const climateControlForm = createClimateControlForm();

export class ClimateControlPIAction extends ActionPI {
    constructor(uuid: string, actionInfo: PropertyInspectorActionInfo) {
        super(uuid, actionInfo);
    }

    override setUp(): void {
        super.setUp();
        logMessage("Injecting climate control parameters");
        const controls = climateControlForm.ensureMounted();
        if (!controls) {
            return;
        }

        const { entitySelect, commandSelect, hvacModeItem, hvacModeSelect, temperatureItem, temperatureInput } = controls;

        if (this.settings.entityId) {
            entitySelect.value = this.settings.entityId;
        }

        entitySelect.addEventListener("input", (event) => {
            const value = (event.target as HTMLSelectElement).value;
            this.settings.entityId = value;
            saveSettings(this.action, this.uuid, this.settings);
        });

        if (this.settings.climateCommand) {
            commandSelect.value = this.settings.climateCommand;
        }

        this.toggleCommandFields(commandSelect.value, hvacModeItem, temperatureItem);

        commandSelect.addEventListener("change", (event) => {
            const value = (event.target as HTMLSelectElement).value;
            this.settings.climateCommand = value;
            saveSettings(this.action, this.uuid, this.settings);
            this.toggleCommandFields(value, hvacModeItem, temperatureItem);
        });

        if (this.settings.hvacMode) {
            hvacModeSelect.value = this.settings.hvacMode;
        }

        hvacModeSelect.addEventListener("change", (event) => {
            const value = (event.target as HTMLSelectElement).value;
            this.settings.hvacMode = value;
            saveSettings(this.action, this.uuid, this.settings);
        });

        if (this.settings.temperature !== undefined) {
            temperatureInput.value = String(this.settings.temperature);
        }

        temperatureInput.addEventListener("input", (event) => {
            const value = parseFloat((event.target as HTMLInputElement).value);
            if (!isNaN(value)) {
                this.settings.temperature = value;
                saveSettings(this.action, this.uuid, this.settings);
            }
        });
    }

    override update(homeAssistantCache: HomeAssistantCache): void {
        const controls = climateControlForm.getControls();
        if (!controls) {
            return;
        }

        const { entitySelect } = controls;
        ActionPI.populateEntityOptions(entitySelect, "climate", homeAssistantCache);

        if (this.settings.entityId) {
            entitySelect.value = this.settings.entityId;
        } else if (entitySelect.options.length > 0) {
            this.settings.entityId = entitySelect.value;
            saveSettings(this.action, this.uuid, this.settings);
        }
    }

    private toggleCommandFields(command: string, hvacModeItem: HTMLDivElement, temperatureItem: HTMLDivElement): void {
        hvacModeItem.style.display = command === "set_hvac_mode" ? "" : "none";
        temperatureItem.style.display = command === "set_temperature" ? "" : "none";
    }
}

function createClimateControlForm(): {
    ensureMounted: () => {
        entitySelect: HTMLSelectElement;
        commandSelect: HTMLSelectElement;
        hvacModeItem: HTMLDivElement;
        hvacModeSelect: HTMLSelectElement;
        temperatureItem: HTMLDivElement;
        temperatureInput: HTMLInputElement;
    } | null;
    getControls: () => {
        entitySelect: HTMLSelectElement;
        commandSelect: HTMLSelectElement;
        hvacModeItem: HTMLDivElement;
        hvacModeSelect: HTMLSelectElement;
        temperatureItem: HTMLDivElement;
        temperatureInput: HTMLInputElement;
    } | null;
} {
    type Controls = {
        entitySelect: HTMLSelectElement;
        commandSelect: HTMLSelectElement;
        hvacModeItem: HTMLDivElement;
        hvacModeSelect: HTMLSelectElement;
        temperatureItem: HTMLDivElement;
        temperatureInput: HTMLInputElement;
    };

    type InternalElements = {
        entityItem: HTMLDivElement;
        commandItem: HTMLDivElement;
        hvacModeItem: HTMLDivElement;
        temperatureItem: HTMLDivElement;
        controls: Controls;
    };

    let elements: InternalElements | null = null;

    const COMMANDS: { value: string; label: string }[] = [
        { value: "set_hvac_mode", label: "Set HVAC Mode" },
        { value: "set_temperature", label: "Set Temperature" },
    ];

    const HVAC_MODES: { value: string; label: string }[] = [
        { value: "off", label: "Off" },
        { value: "heat", label: "Heat" },
        { value: "cool", label: "Cool" },
        { value: "heat_cool", label: "Heat/Cool" },
        { value: "auto", label: "Auto" },
        { value: "dry", label: "Dry" },
        { value: "fan_only", label: "Fan Only" },
    ];

    function buildElements(): InternalElements {
        const entityItem = document.createElement("div");
        entityItem.className = "sdpi-item";

        const entityLabel = document.createElement("div");
        entityLabel.className = "sdpi-item-label";
        entityLabel.textContent = "Entity";

        const entitySelect = document.createElement("select");
        entitySelect.className = "sdpi-item-value select";
        entitySelect.id = "climateEntityId";

        entityItem.append(entityLabel, entitySelect);

        const commandItem = document.createElement("div");
        commandItem.className = "sdpi-item";

        const commandLabel = document.createElement("div");
        commandLabel.className = "sdpi-item-label";
        commandLabel.textContent = "Command";

        const commandSelect = document.createElement("select");
        commandSelect.className = "sdpi-item-value select";
        commandSelect.id = "climateCommand";

        for (const cmd of COMMANDS) {
            const option = document.createElement("option");
            option.value = cmd.value;
            option.textContent = cmd.label;
            commandSelect.appendChild(option);
        }

        commandItem.append(commandLabel, commandSelect);

        const hvacModeItem = document.createElement("div");
        hvacModeItem.className = "sdpi-item";

        const hvacModeLabel = document.createElement("div");
        hvacModeLabel.className = "sdpi-item-label";
        hvacModeLabel.textContent = "HVAC Mode";

        const hvacModeSelect = document.createElement("select");
        hvacModeSelect.className = "sdpi-item-value select";
        hvacModeSelect.id = "climateHvacMode";

        for (const mode of HVAC_MODES) {
            const option = document.createElement("option");
            option.value = mode.value;
            option.textContent = mode.label;
            hvacModeSelect.appendChild(option);
        }

        hvacModeItem.append(hvacModeLabel, hvacModeSelect);

        const temperatureItem = document.createElement("div");
        temperatureItem.className = "sdpi-item";
        temperatureItem.style.display = "none";

        const temperatureLabel = document.createElement("div");
        temperatureLabel.className = "sdpi-item-label";
        temperatureLabel.textContent = "Temperature";

        const temperatureInput = document.createElement("input");
        temperatureInput.className = "sdpi-item-value";
        temperatureInput.type = "number";
        temperatureInput.id = "climateTemperature";
        temperatureInput.step = "0.5";

        temperatureItem.append(temperatureLabel, temperatureInput);

        return {
            entityItem,
            commandItem,
            hvacModeItem,
            temperatureItem,
            controls: { entitySelect, commandSelect, hvacModeItem, hvacModeSelect, temperatureItem, temperatureInput },
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

        if (!elements.hvacModeItem.isConnected) {
            wrapper.appendChild(elements.hvacModeItem);
        }

        if (!elements.temperatureItem.isConnected) {
            wrapper.appendChild(elements.temperatureItem);
        }

        return elements.controls;
    }

    function getControls(): Controls | null {
        return elements?.controls ?? null;
    }

    return { ensureMounted, getControls };
}
