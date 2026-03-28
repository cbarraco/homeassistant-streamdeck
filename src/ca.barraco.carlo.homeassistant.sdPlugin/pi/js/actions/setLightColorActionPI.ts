class SetLightColorActionPI extends ActionPI {
    constructor(uuid: string, actionInfo: PropertyInspectorActionInfo) {
        super(uuid, actionInfo);
    }

    setUp(): void {
        super.setUp();
        logMessage("Injecting set light color parameters");
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
            <div id="brightnessWrapper"></div>
            <div class="sdpi-item">
                <div class="sdpi-item-label">Color Type</div>
                <select class="sdpi-item-value select" id="colorType">
                    <option value="None">None</option>
                </select>
            </div>
            <div id="lightWrapper"></div>
            `
        );

        const entityIdSelector = document.getElementById("entityId") as HTMLSelectElement | null;
        const colorTypeSelector = document.getElementById("colorType") as HTMLSelectElement | null;

        if (entityIdSelector && this.settings.entityId) {
            entityIdSelector.value = this.settings.entityId;
        }

        entityIdSelector?.addEventListener("input", (event) => {
            const value = (event.target as HTMLSelectElement).value;
            this.settings.entityId = value;
            saveSettings(this.action, this.uuid, this.settings);
            const lights = homeAssistantCache.entities["light"];
            if (lights) {
                this.addParametersBasedOnFeatures(lights);
            }
        });

        colorTypeSelector?.addEventListener("change", (event) => {
            const value = (event.target as HTMLSelectElement).value;
            this.settings.colorType = value;
            saveSettings(this.action, this.uuid, this.settings);
            const lights = homeAssistantCache.entities["light"];
            if (lights) {
                this.showAppropriateColorChooser(lights);
            }
        });
    }

    update(homeAssistantCacheParam: HomeAssistantCache): void {
        const entityIdSelector = document.getElementById("entityId") as HTMLSelectElement | null;
        if (!entityIdSelector) {
            return;
        }

        ActionPI.populateEntityOptions(entityIdSelector, "light", homeAssistantCacheParam);
        if (this.settings.entityId) {
            entityIdSelector.value = this.settings.entityId;
        } else if (entityIdSelector.options.length > 0) {
            this.settings.entityId = entityIdSelector.value;
            saveSettings(this.action, this.uuid, this.settings);
        }

        const lightsFromCache = homeAssistantCacheParam.entities["light"];
        if (!lightsFromCache) {
            logMessage("There aren't any lights in the cache yet");
            return;
        }

        this.addParametersBasedOnFeatures(lightsFromCache);
    }

    private addParametersBasedOnFeatures(lightsFromCache: HomeAssistantEntity[]): void {
        const lightEntity = lightsFromCache.find((entity) => entity.entity_id === this.settings.entityId);
        if (!lightEntity) {
            return;
        }

        const supportedFeatures = Number(lightEntity.attributes.supported_features ?? 0);
        const lightSupportsBrightness =
            (supportedFeatures & LightSupportedFeaturesBitmask.SUPPORT_BRIGHTNESS) ===
            LightSupportedFeaturesBitmask.SUPPORT_BRIGHTNESS;
        const lightSupportsRgb =
            (supportedFeatures & LightSupportedFeaturesBitmask.SUPPORT_COLOR) ===
            LightSupportedFeaturesBitmask.SUPPORT_COLOR;
        const lightSupportsTemperature =
            (supportedFeatures & LightSupportedFeaturesBitmask.SUPPORT_COLOR_TEMP) ===
            LightSupportedFeaturesBitmask.SUPPORT_COLOR_TEMP;

        if (lightSupportsBrightness) {
            this.addBrightnessSlider();
        } else {
            const brightnessWrapper = document.getElementById("brightnessWrapper");
            if (brightnessWrapper) {
                brightnessWrapper.innerHTML = "";
            }
        }

        const colorTypeSelector = document.getElementById("colorType") as HTMLSelectElement | null;
        if (!colorTypeSelector) {
            return;
        }

        colorTypeSelector.innerHTML = `<option value="None">None</option>`;
        if (lightSupportsRgb) {
            this.addColorTypeOption(colorTypeSelector, "RGB");
        }
        if (lightSupportsTemperature) {
            this.addColorTypeOption(colorTypeSelector, "Temperature");
        }

        if (this.settings.colorType) {
            const supportsCurrentType =
                (this.settings.colorType === "RGB" && lightSupportsRgb) ||
                (this.settings.colorType === "Temperature" && lightSupportsTemperature) ||
                this.settings.colorType === "None";
            if (supportsCurrentType) {
                colorTypeSelector.value = this.settings.colorType;
            } else {
                colorTypeSelector.value = "None";
                this.settings.colorType = "None";
                saveSettings(this.action, this.uuid, this.settings);
            }
        }

        this.showAppropriateColorChooser(lightsFromCache);
    }

    private addBrightnessSlider(): void {
        const brightnessWrapper = document.getElementById("brightnessWrapper");
        if (!brightnessWrapper) {
            return;
        }

        brightnessWrapper.innerHTML = `
                <div type="range" class="sdpi-item">
                    <div class="sdpi-item-label">Brightness</div>
                    <div class="sdpi-item-value">
                        <span class="clickable" value="0">0%</span>
                        <input id="brightness" type="range" min="0" max="100" value="50">
                        <span class="clickable" value="100">100%</span>
                    </div>
                </div>`;

        const brightnessElement = document.getElementById("brightness") as HTMLInputElement | null;
        if (!brightnessElement) {
            return;
        }

        if (this.settings.brightness !== undefined) {
            brightnessElement.value = String(this.settings.brightness);
        }

        brightnessElement.addEventListener("change", (event) => {
            const value = Number((event.target as HTMLInputElement).value);
            logMessage(`Saving brightness for ${this.settings.entityId}`);
            this.settings.brightness = value;
            saveSettings(this.action, this.uuid, this.settings);
        });
    }

    private addColorTypeOption(selector: HTMLSelectElement, value: string): void {
        const option = document.createElement("option");
        option.value = value;
        option.innerHTML = value;
        selector.appendChild(option);
        logMessage(`${this.settings.entityId} supports ${value} mode`);
    }

    private showAppropriateColorChooser(lightsFromCache: HomeAssistantEntity[]): void {
        const lightWrapper = document.getElementById("lightWrapper");
        if (!lightWrapper) {
            return;
        }

        if (this.settings.colorType === "RGB") {
            this.showRgbChooser(lightWrapper);
        } else if (this.settings.colorType === "Temperature") {
            this.showTemperatureChooser(lightWrapper, lightsFromCache);
        } else {
            lightWrapper.innerHTML = "";
        }
    }

    private showRgbChooser(lightWrapper: HTMLElement): void {
        logMessage("Showing RGB chooser");
        lightWrapper.innerHTML = `
                <div type="color" class="sdpi-item">
                    <div class="sdpi-item-label">Color</div>
                    <input type="color" class="sdpi-item-value" id="color" value="#ff0000">
                </div>`;

        const colorInput = document.getElementById("color") as HTMLInputElement | null;
        if (!colorInput) {
            return;
        }

        colorInput.value = (this.settings.color as string) ?? "#ff0000";
        this.settings.color = colorInput.value;
        saveSettings(this.action, this.uuid, this.settings);

        colorInput.addEventListener("input", (event) => {
            const selectedColor = (event.target as HTMLInputElement).value;
            logMessage(`RGB color was changed to ${selectedColor}`);
            this.settings.temperature = undefined;
            this.settings.color = selectedColor;
            saveSettings(this.action, this.uuid, this.settings);
        });
    }

    private showTemperatureChooser(lightWrapper: HTMLElement, lightsFromCache: HomeAssistantEntity[]): void {
        logMessage("Showing temperature chooser");
        const entity = lightsFromCache.find((light) => light.entity_id === this.settings.entityId);
        if (!entity) {
            return;
        }

        const minMired = Number(entity.attributes.min_mireds ?? 0);
        const maxMired = Number(entity.attributes.max_mireds ?? 0);

        lightWrapper.innerHTML = `
                <div type="range" class="sdpi-item">
                    <div class="sdpi-item-label">Temperature</div>
                    <div class="sdpi-item-value">
                        <span class="clickable" value="${minMired}" id="min">${minMired}</span>
                        <input id="temperature" type="range" min="${minMired}" max="${maxMired}" value="${minMired}">
                        <span class="clickable" value="${maxMired}" id="max">${maxMired}</span>
                    </div>
                </div>`;

        const temperatureSlider = document.getElementById("temperature") as HTMLInputElement | null;
        if (!temperatureSlider) {
            return;
        }

        const defaultValue =
            typeof this.settings.temperature === "number"
                ? this.settings.temperature
                : (minMired + maxMired) / 2;
        temperatureSlider.value = String(defaultValue);
        this.settings.temperature = defaultValue;
        this.settings.color = undefined;
        saveSettings(this.action, this.uuid, this.settings);

        temperatureSlider.addEventListener("change", (event) => {
            const selectedTemperature = Number((event.target as HTMLInputElement).value);
            logMessage(`Color temperature was changed to ${selectedTemperature}`);
            this.settings.temperature = selectedTemperature;
            this.settings.color = undefined;
            saveSettings(this.action, this.uuid, this.settings);
        });
    }
}
