import { logMessage } from "../logging";
import type { HomeAssistantCache } from "../globals";
import type { ActionSettings } from "../../shared/types";
import { saveSettings } from "../utils";
import { ActionPI, type PropertyInspectorActionInfo } from "../propertyInspector/action";

export class ToggleSwitchPIAction extends ActionPI {
    constructor(uuid: string, actionInfo: PropertyInspectorActionInfo) {
        super(uuid, actionInfo);
    }

    override setUp(): void {
        super.setUp();
        logMessage("Injecting toggle switch parameters");
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
                </div>`,
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

    override update(homeAssistantCache: HomeAssistantCache): void {
        const entityIdSelector = document.getElementById("entityId") as HTMLSelectElement | null;
        if (!entityIdSelector) {
            return;
        }

        ActionPI.populateEntityOptions(entityIdSelector, "switch", homeAssistantCache);
        if (this.settings.entityId) {
            entityIdSelector.value = this.settings.entityId;
        } else if (entityIdSelector.options.length > 0) {
            this.settings.entityId = entityIdSelector.value;
            saveSettings(this.action, this.uuid, this.settings as ActionSettings);
        }
    }
}
