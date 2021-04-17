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
            colorInput.addEventListener("input", function (e) {
                var selectedColor = e.target.value;
                logMessage(`RGB color was changed to ${selectedColor}`);
                settings.color = selectedColor;
                saveSettings(action, uuid, settings);
            });
        }

        function showTemperatureChooser(lightWrapper) {
            logMessage("Showing temperature chooser");
            const entity = homeAssistantCache.entities["light"].find((e) => e.entity_id == settings.entityId);
            const minMired = entity.attributes.min_mireds;
            const maxMired = entity.attributes.max_mireds;

            // seems these are off by a little bit and making the ranges out of bounds on the extremes,
            // maybe round to the nearest 100?
            // TODO Just use the mired directly, thats what HA does anyway
            const minTemperature = Math.round(miredToTemperature(maxMired)); // these are flipped intentionally
            const maxTemperature = Math.round(miredToTemperature(minMired)); // these are flipped intentionally

            logMessage({ minTemp: minTemperature, maxTemp: maxTemperature });

            lightWrapper.innerHTML = `
                <div type="range" class="sdpi-item">
                    <div class="sdpi-item-label">Temperature</div>
                    <div class="sdpi-item-value">
                        <span class="clickable" value="${minTemperature}" id="min">
                            ${minTemperature}K
                        </span>
                        <input id="temperature" type="range" min="${minTemperature}" max="${maxTemperature}" value=${minTemperature}>
                        <span class="clickable" value="${maxTemperature}" id="max">
                            ${maxTemperature}K
                        </span>
                    </div>
                </div>`;

            const temperatureSlider = document.getElementById("temperature");
            temperatureSlider.value = settings.temperature || 3000; // TODO: Use midpoint as default
            settings.temperature = temperatureSlider.value;
            temperatureSlider.addEventListener("change", function (e) {
                var selectedTemperature = e.target.value;
                logMessage(`Color temperature was changed to ${selectedTemperature}`);
                settings.temperature = selectedTemperature;
                saveSettings(action, uuid, settings);
            });
        }

        const lightWrapper = document.getElementById("lightWrapper");
        if (settings.colorType == "RGB") {
            showRgbChooser(lightWrapper);
        } else if (settings.colorType == "Temperature") {
            showTemperatureChooser(lightWrapper);
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
            showAppropriateColorChooser();
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
        ActionPI.populateEntityOptions(entityIdSelector, "light", homeAssistantCache);
        if (settings.entityId != undefined) {
            entityIdSelector.value = settings.entityId;
        } else {
            // save whatever is first
            settings.entityId = entityIdSelector.value;
            saveSettings(action, uuid, settings);
        }

        var lightsFromCache = homeAssistantCache.entities["light"];
        if (lightsFromCache === undefined) {
            logMessage("There aren't any lights in the cache yet");
            return;
        }

        // figure out what features this light supports
        const lightEntity = lightsFromCache.find((e) => e.entity_id == settings.entityId);
        const supportedFeatures = lightEntity.attributes.supported_features;
        var lightSupportsBrightness = supportedFeatures & LightSupportedFeaturesBitmask.SUPPORT_BRIGHTNESS;
        var lightSupportsRgb = supportedFeatures & LightSupportedFeaturesBitmask.SUPPORT_COLOR;
        var lightSupportsTemperature = supportedFeatures & LightSupportedFeaturesBitmask.SUPPORT_COLOR_TEMP;

        if (lightSupportsBrightness) {
            addBrightnessSlider();
        }

        const colorTypeSelector = document.getElementById("colorType");
        colorTypeSelector.innerHTML = `<option value="none">None</option>`;
        if (lightSupportsRgb) {
            addRgbColorType(colorTypeSelector);
        }
        if (lightSupportsTemperature) {
            addTemperatureColorType(colorTypeSelector);
        }

        if (settings.colorType != undefined) {
            colorTypeSelector.value = settings.colorType;
            showAppropriateColorChooser();
        }
    };

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

    function miredToTemperature(mired) {
        return 1000000.0 / mired;
    }
}
