import { logMessage } from "../../../lib/logging.js";
import type { HomeAssistantCache } from "../../../lib/globals.js";
import { saveSettings } from "../../../lib/utils.js";
import { ActionPI, type PropertyInspectorActionInfo } from "../actionPI.js";

export class ToggleLightActionPI extends ActionPI {
    constructor(uuid: string, actionInfo: PropertyInspectorActionInfo) {
        super(uuid, actionInfo);
    }

    setUp(): void {
        super.setUp();
        logMessage("Injecting toggle light parameters");
        const wrapper = document.getElementById("wrapper");
        if (!wrapper) {
            return;
        }

        wrapper.insertAdjacentHTML(
            "beforeend",
            `
            <div class="sdpi-item">
                <div class="sdpi-item-label">Entity</div>
                <select class="sdpi-item-value select" id="entityId">
                </select>
            </div>`
        );

        const entityIdElement = document.getElementById("entityId") as HTMLSelectElement | null;
        if (!entityIdElement) {
            return;
        }

        if (this.settings.entityId) {
            entityIdElement.value = this.settings.entityId;
        }

        entityIdElement.addEventListener("input", (event) => {
            const value = (event.target as HTMLSelectElement).value;
            this.settings.entityId = value;
            saveSettings(this.action, this.uuid, this.settings);
        });
    }

    update(homeAssistantCache: HomeAssistantCache): void {
        const entityIdSelector = document.getElementById("entityId") as HTMLSelectElement | null;
        if (!entityIdSelector) {
            return;
        }

        ActionPI.populateEntityOptions(entityIdSelector, "light", homeAssistantCache);
        if (this.settings.entityId) {
            entityIdSelector.value = this.settings.entityId;
        } else if (entityIdSelector.options.length > 0) {
            this.settings.entityId = entityIdSelector.value;
            saveSettings(this.action, this.uuid, this.settings);
        }
    }
}
