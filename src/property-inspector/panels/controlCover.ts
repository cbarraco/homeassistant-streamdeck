import { logMessage } from "../logging";
import type { HomeAssistantCache } from "../globals";
import { saveSettings } from "../utils";
import { ActionPI, type PropertyInspectorActionInfo } from "../action";

const coverControlForm = createCoverControlForm();

export class ControlCoverPIAction extends ActionPI {
    constructor(uuid: string, actionInfo: PropertyInspectorActionInfo) {
        super(uuid, actionInfo);
    }

    override setUp(): void {
        super.setUp();
        logMessage("Injecting cover control parameters");
        const controls = coverControlForm.ensureMounted();
        if (!controls) {
            return;
        }

        const { entitySelect, commandSelect } = controls;

        if (this.settings.entityId) {
            entitySelect.value = this.settings.entityId;
        }

        entitySelect.addEventListener("input", (event) => {
            const value = (event.target as HTMLSelectElement).value;
            this.settings.entityId = value;
            saveSettings(this.action, this.uuid, this.settings);
        });

        if (this.settings.coverCommand) {
            commandSelect.value = this.settings.coverCommand;
        }

        commandSelect.addEventListener("change", (event) => {
            const value = (event.target as HTMLSelectElement).value;
            this.settings.coverCommand = value;
            saveSettings(this.action, this.uuid, this.settings);
        });
    }

    override update(homeAssistantCache: HomeAssistantCache): void {
        const controls = coverControlForm.getControls();
        if (!controls) {
            return;
        }

        const { entitySelect } = controls;
        ActionPI.populateEntityOptions(entitySelect, "cover", homeAssistantCache);

        if (this.settings.entityId) {
            entitySelect.value = this.settings.entityId;
        } else if (entitySelect.options.length > 0) {
            this.settings.entityId = entitySelect.value;
            saveSettings(this.action, this.uuid, this.settings);
        }
    }
}

function createCoverControlForm(): {
    ensureMounted: () => { entitySelect: HTMLSelectElement; commandSelect: HTMLSelectElement } | null;
    getControls: () => { entitySelect: HTMLSelectElement; commandSelect: HTMLSelectElement } | null;
} {
    type Controls = {
        entitySelect: HTMLSelectElement;
        commandSelect: HTMLSelectElement;
    };

    type InternalElements = {
        entityItem: HTMLDivElement;
        commandItem: HTMLDivElement;
        controls: Controls;
    };

    let elements: InternalElements | null = null;

    const COMMANDS: { value: string; label: string }[] = [
        { value: "toggle", label: "Toggle" },
        { value: "open_cover", label: "Open" },
        { value: "close_cover", label: "Close" },
        { value: "stop_cover", label: "Stop" },
    ];

    function buildElements(): InternalElements {
        const entityItem = document.createElement("div");
        entityItem.className = "sdpi-item";

        const entityLabel = document.createElement("div");
        entityLabel.className = "sdpi-item-label";
        entityLabel.textContent = "Entity";

        const entitySelect = document.createElement("select");
        entitySelect.className = "sdpi-item-value select";
        entitySelect.id = "coverEntityId";

        entityItem.append(entityLabel, entitySelect);

        const commandItem = document.createElement("div");
        commandItem.className = "sdpi-item";

        const commandLabel = document.createElement("div");
        commandLabel.className = "sdpi-item-label";
        commandLabel.textContent = "Command";

        const commandSelect = document.createElement("select");
        commandSelect.className = "sdpi-item-value select";
        commandSelect.id = "coverCommand";

        for (const cmd of COMMANDS) {
            const option = document.createElement("option");
            option.value = cmd.value;
            option.textContent = cmd.label;
            commandSelect.appendChild(option);
        }

        commandItem.append(commandLabel, commandSelect);

        return {
            entityItem,
            commandItem,
            controls: { entitySelect, commandSelect },
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

        return elements.controls;
    }

    function getControls(): Controls | null {
        return elements?.controls ?? null;
    }

    return { ensureMounted, getControls };
}
