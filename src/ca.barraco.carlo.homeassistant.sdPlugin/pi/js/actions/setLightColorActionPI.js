// Prototype which represents a set light color action property inspector
function SetLightColorActionPI(uuid, actionInfo) {
    var instance = this;

    var settings = actionInfo["payload"]["settings"];
    var action = actionInfo["action"];
    var context = actionInfo["context"];

    // Inherit from Action
    ActionPI.call(this, uuid, actionInfo);

    var actionSetUp = this.setUp;

    function showAppropriateColorChooser() {
        function showRgbChooser(lightWrapper) {
            logMessage("Showing RGB chooser");
            lightWrapper.innerHTML = `
                <div type="color" class="sdpi-item">
                    <div class="sdpi-item-label">Color</div>
                    <input type="color" class="sdpi-item-value" id="color" value="#ff0000">
                </div>`;

            var colorInput = document.getElementById("color");
            colorInput.value = settings.color || "#ff0000";
            settings.color = colorInput.value;
            saveSettings(action, uuid, settings);
            colorInput.addEventListener("input", function (e) {
                var selectedColor = e.target.value;
                logMessage(`RGB color was changed to ${selectedColor}`);
                settings.temperature = undefined;
                settings.color = selectedColor;
                saveSettings(action, uuid, settings);
            });
        }

        function showTemperatureChooser(lightWrapper) {
            logMessage("Showing temperature chooser");
            const entity = homeAssistantCache.entities[settings.entityId];
            const minMired = entity.attributes.min_mireds;
            const maxMired = entity.attributes.max_mireds;

            logMessage({ minTemp: minMired, maxTemp: maxMired });

            lightWrapper.innerHTML = `
                <div type="range" class="sdpi-item">
                    <div class="sdpi-item-label">Temperature</div>
                    <div class="sdpi-item-value">
                        <span class="clickable" value="${minMired}" id="min">
                            ${minMired}
                        </span>
                        <input id="temperature" type="range" min="${minMired}" max="${maxMired}" value=${minMired}>
                        <span class="clickable" value="${maxMired}" id="max">
                            ${maxMired}
                        </span>
                    </div>
                </div>`;

            const temperatureSlider = document.getElementById("temperature");
            temperatureSlider.value = settings.temperature || (minMired + maxMired) / 2;
            settings.temperature = temperatureSlider.value;
            saveSettings(action, uuid, settings);
            temperatureSlider.addEventListener("change", function (e) {
                var selectedTemperature = e.target.value;
                logMessage(`Color temperature was changed to ${selectedTemperature}`);
                settings.temperature = selectedTemperature;
                settings.color = undefined;
                saveSettings(action, uuid, settings);
            });
        }

        const lightWrapper = document.getElementById("lightWrapper");
        if (settings.colorType == "RGB") {
            showRgbChooser(lightWrapper);
        } else if (settings.colorType == "Temperature") {
            showTemperatureChooser(lightWrapper);
        } else {
            lightWrapper.innerHTML = "";
        }
    }

    // Public function called on initial setup
    this.setUp = function () {
        actionSetUp.call(this);
        logMessage("Injecting set light color parameters");
        const wrapper = document.getElementById("wrapper");
        wrapper.innerHTML += `
            <div class="sdpi-item">
                <div class="sdpi-item-label">Entity</div>
                <select class="sdpi-item-value select" id="entityId">
                </select>
            </div>
            <div id="brightnessWrapper"></div>
            <div class="sdpi-item">
                <div class="sdpi-item-label">Color Type</div>
                <select class="sdpi-item-value select" id="colorType">
                    <option value="none">None</option>
                </select>
            </div>
            <div id="lightWrapper"></div>
            `;

        var entityIdSelector = document.getElementById("entityId");
        entityIdSelector.value = settings.entityId;
        entityIdSelector.addEventListener("input", function (inEvent) {
            var value = inEvent.target.value;
            settings.entityId = value;
            saveSettings(action, uuid, settings);
            var lightState = homeAssistantCache.entities[settings.entityId];
            addParametersBasedOnFeatures(lightState);
        });

        wrapper.innerHTML += `
            <div class="sdpi-item">
                <button class="sdpi-item-value" id="refreshCache">Refresh</button>
            </div>`;
        const refreshCache = document.getElementById("refreshCache");
        refreshCache.addEventListener("click", function () {
            sendToPlugin(action, inUUID, {
                command: PluginCommands.REQUEST_CACHE_REFRESH,
            });
        });

        var colorTypeSelector = document.getElementById("colorType");
        colorTypeSelector.addEventListener("change", function (inEvent) {
            var value = inEvent.target.value;
            settings.colorType = value;
            saveSettings(action, uuid, settings);
            showAppropriateColorChooser();
        });
    };

    this.update = function (homeAssistantCache) {
        var entityIdSelector = document.getElementById("entityId");
        ActionPI.populateEntityOptionsFromDomain(entityIdSelector, "light", homeAssistantCache);
        if (settings.entityId != undefined) {
            // overwrite with the saved value
            entityIdSelector.value = settings.entityId;
        } else {
            // save entity id
            settings.entityId = entityIdSelector.value;
            saveSettings(action, uuid, settings);
        }

        entityState = homeAssistantCache[settings.entityId];
        addParametersBasedOnFeatures(entityState);
    };

    function addParametersBasedOnFeatures(lightState) {
        // figure out what features this light supports
        const supportedFeatures = lightState.attributes.supported_features;
        var lightSupportsBrightness = supportedFeatures & LightSupportedFeaturesBitmask.SUPPORT_BRIGHTNESS;
        var lightSupportsRgb = supportedFeatures & LightSupportedFeaturesBitmask.SUPPORT_COLOR;
        var lightSupportsTemperature = supportedFeatures & LightSupportedFeaturesBitmask.SUPPORT_COLOR_TEMP;

        if (lightSupportsBrightness) {
            addBrightnessSlider();
        }

        const colorTypeSelector = document.getElementById("colorType");
        colorTypeSelector.innerHTML = `<option value="None">None</option>`;
        if (lightSupportsRgb) {
            addRgbColorType(colorTypeSelector);
        }
        if (lightSupportsTemperature) {
            addTemperatureColorType(colorTypeSelector);
        }

        if (settings.colorType != undefined) {
            if (settings.colorType == "RGB" && !lightSupportsRgb){
                colorTypeSelector.value = "None";
                settings.colorType = "None";
                saveSettings(action, uuid, settings);
            } else if (settings.colorType == "Temperature" && !lightSupportsTemperature){
                colorTypeSelector.value = "None";
                settings.colorType = "None";
                saveSettings(action, uuid, settings);
            } else {
                colorTypeSelector.value = settings.colorType;
            }
            showAppropriateColorChooser();
        }
    }

    function addBrightnessSlider() {
        logMessage(settings.entityId + " supports brightness");
        const brightnessWrapper = document.getElementById("brightnessWrapper");
        const brightnessHtml = `
                <div type="range" class="sdpi-item">
                    <div class="sdpi-item-label">Brightness</div>
                    <div class="sdpi-item-value">
                        <span class="clickable" value="0">0%</span>
                        <input id="brightness" type="range" min="0" max="100" value=50>
                        <span class="clickable" value="100">100%</span>
                    </div>
                </div>`;
        brightnessWrapper.innerHTML = brightnessHtml;

        const brightnessElement = document.getElementById("brightness");
        if (brightnessElement != null && settings.brightness != undefined) {
            brightnessElement.value = settings.brightness;
        }
        brightnessElement.addEventListener("change", function (e) {
            logMessage("Saving brightness for " + settings.entityId);
            var value = e.target.value;
            settings.brightness = value;
            saveSettings(action, uuid, settings);
        });
    }    

    function addRgbColorType(colorTypeSelector) {
        const rgbOption = document.createElement("option");
        rgbOption.value = "RGB";
        rgbOption.innerHTML = "RGB";
        colorTypeSelector.appendChild(rgbOption);
        logMessage(settings.entityId + " supports RGB mode");
    }

    function addTemperatureColorType(colorTypeSelector) {
        const temperatureOption = document.createElement("option");
        temperatureOption.value = "Temperature";
        temperatureOption.innerHTML = "Temperature";
        colorTypeSelector.appendChild(temperatureOption);
        logMessage(settings.entityId + " supports temperature mode");
    }
}
