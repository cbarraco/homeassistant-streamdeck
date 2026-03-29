import { logMessage } from "../logging";
import type { HomeAssistantCache } from "../globals";
import { saveSettings } from "../utils";
import { ActionPI, type PropertyInspectorActionInfo } from "../propertyInspector/action";

const MEDIA_COMMANDS = [
    { value: "media_play_pause", label: "Play / Pause" },
    { value: "media_play", label: "Play" },
    { value: "media_pause", label: "Pause" },
    { value: "media_stop", label: "Stop" },
    { value: "media_next_track", label: "Next Track" },
    { value: "media_previous_track", label: "Previous Track" },
    { value: "volume_up", label: "Volume Up" },
    { value: "volume_down", label: "Volume Down" },
    { value: "volume_mute", label: "Toggle Mute" },
    { value: "turn_on", label: "Turn On" },
    { value: "turn_off", label: "Turn Off" },
] as const;

const mediaPlayerForm = createMediaPlayerForm();

export class MediaPlayerPIAction extends ActionPI {
    constructor(uuid: string, actionInfo: PropertyInspectorActionInfo) {
        super(uuid, actionInfo);
    }

    override setUp(): void {
        super.setUp();
        logMessage("Injecting media player parameters");
        const controls = mediaPlayerForm.ensureMounted();
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

        if (this.settings.mediaCommand) {
            commandSelect.value = this.settings.mediaCommand;
        }

        commandSelect.addEventListener("change", (event) => {
            const value = (event.target as HTMLSelectElement).value;
            this.settings.mediaCommand = value;
            saveSettings(this.action, this.uuid, this.settings);
        });
    }

    override update(homeAssistantCache: HomeAssistantCache): void {
        const controls = mediaPlayerForm.getControls();
        if (!controls) {
            return;
        }

        const { entitySelect } = controls;
        ActionPI.populateEntityOptions(entitySelect, "media_player", homeAssistantCache);

        if (this.settings.entityId) {
            entitySelect.value = this.settings.entityId;
        } else if (entitySelect.options.length > 0) {
            this.settings.entityId = entitySelect.value;
            saveSettings(this.action, this.uuid, this.settings);
        }
    }
}

function createMediaPlayerForm(): {
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

    function buildElements(): InternalElements {
        const entityItem = document.createElement("div");
        entityItem.className = "sdpi-item";

        const entityLabel = document.createElement("div");
        entityLabel.className = "sdpi-item-label";
        entityLabel.textContent = "Entity";

        const entitySelect = document.createElement("select");
        entitySelect.className = "sdpi-item-value select";
        entitySelect.id = "mediaPlayerEntityId";

        entityItem.append(entityLabel, entitySelect);

        const commandItem = document.createElement("div");
        commandItem.className = "sdpi-item";

        const commandLabel = document.createElement("div");
        commandLabel.className = "sdpi-item-label";
        commandLabel.textContent = "Command";

        const commandSelect = document.createElement("select");
        commandSelect.className = "sdpi-item-value select";
        commandSelect.id = "mediaPlayerCommand";

        for (const { value, label } of MEDIA_COMMANDS) {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
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
