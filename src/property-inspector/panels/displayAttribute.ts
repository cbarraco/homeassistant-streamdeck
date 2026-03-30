import { logMessage } from "../logging";
import type { HomeAssistantCache } from "../globals";
import type { ActionSettings } from "../../shared/types";
import { saveSettings } from "../utils";
import { ActionPI, type PropertyInspectorActionInfo } from "../action";

export class DisplayAttributePIAction extends ActionPI {
    constructor(uuid: string, actionInfo: PropertyInspectorActionInfo) {
        super(uuid, actionInfo);
    }

    override setUp(): void {
        super.setUp();
        logMessage("Injecting display attribute parameters");
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
                </div>
                <div class="sdpi-item">
                    <div class="sdpi-item-label">Attribute</div>
                    <input class="sdpi-item-value" type="text" id="attributeKey" placeholder="e.g. temperature, battery, humidity" />
                </div>`,
        );

        const entityIdElement = document.getElementById("entityId") as HTMLSelectElement | null;
        if (entityIdElement) {
            if (this.settings.entityId) {
                entityIdElement.value = this.settings.entityId;
            }

            entityIdElement.addEventListener("input", (event) => {
                const value = (event.target as HTMLSelectElement).value;
                this.settings.entityId = value;
                saveSettings(this.action, this.uuid, this.settings);
            });
        }

        const attributeKeyElement = document.getElementById("attributeKey") as HTMLInputElement | null;
        if (attributeKeyElement) {
            if (this.settings.attributeKey) {
                attributeKeyElement.value = this.settings.attributeKey;
            }

            attributeKeyElement.addEventListener("input", (event) => {
                const value = (event.target as HTMLInputElement).value;
                this.settings.attributeKey = value;
                saveSettings(this.action, this.uuid, this.settings);
            });
        }
    }

    override update(homeAssistantCache: HomeAssistantCache): void {
        const entityIdSelector = document.getElementById("entityId") as HTMLSelectElement | null;
        if (!entityIdSelector) {
            return;
        }

        ActionPI.populateEntityOptions(entityIdSelector, undefined, homeAssistantCache);
        if (this.settings.entityId) {
            entityIdSelector.value = this.settings.entityId;
        } else if (entityIdSelector.options.length > 0) {
            this.settings.entityId = entityIdSelector.value;
            saveSettings(this.action, this.uuid, this.settings as ActionSettings);
        }
    }
}
