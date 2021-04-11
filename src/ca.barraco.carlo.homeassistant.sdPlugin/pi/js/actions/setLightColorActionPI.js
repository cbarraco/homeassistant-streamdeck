// Prototype which represents a set light color action property inspector
function SetLightColorActionPI(uuid, actionInfo) {
    var instance = this;

    var settings = actionInfo["payload"]["settings"];
    var action = actionInfo["action"];
    var context = actionInfo["context"];

    // Inherit from Action
    ActionPI.call(this, uuid, actionInfo);

    var actionSetUp = this.setUp;

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

        var entityIdElement = document.getElementById("entityId");
        entityIdElement.value = settings.entityId;
        entityIdElement.addEventListener("input", function (inEvent) {
            var value = inEvent.target.value;
            settings.entityId = value;
            saveSettings(action, uuid, settings);
        });

        var colorType = document.getElementById("colorType");
        colorType.addEventListener("change", function (inEvent) {
            var value = inEvent.target.value;
            settings.colorType = value;
            saveSettings(action, uuid, settings);

            function addRgbChooser() {
                const rgbHtml = `
                    <div type="color" class="sdpi-item">
                        <div class="sdpi-item-label">Color</div>
                        <input type="color" class="sdpi-item-value" id="color" value="#ff0000">
                    </div>`;
                lightWrapper.innerHTML += rgbHtml;

                var colorElement = document.getElementById("color");
                colorElement.value = settings.color || "#ff0000";
                settings.color = colorElement.value;
                colorElement.addEventListener("input", function (e) {
                    var value = e.target.value;
                    settings.color = value;
                    saveSettings(action, uuid, settings);
                });
            }

            function addTemperatureChooser() {
                const entity = homeAssistantCache.entities["light"].find((e) => e.entity_id == settings.entityId);
                const minMired = entity.attributes.min_mireds;
                const maxMired = entity.attributes.max_mireds;

                // seems these are off by a little bit and making the ranges out of bounds on the extremes
                // maybe round to the nearest 100?
                const minTemperature = Math.round(miredToTemperature(maxMired)); // these are flipped intentionally
                const maxTemperature = Math.round(miredToTemperature(minMired)); // these are flipped intentionally

                logMessage({ minTemp: minTemperature, maxTemp: maxTemperature });

                const colorTemperatureHtml = `
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
                lightWrapper.innerHTML += colorTemperatureHtml;

                const temperature = document.getElementById("temperature");
                temperature.value = settings.temperature || 3000; // TODO: Use midpoint as default
                settings.temperature = temperature.value;
                temperature.addEventListener("change", function (e) {
                    var value = e.target.value;
                    settings.temperature = value;
                    saveSettings(action, uuid, settings);
                });
            }

            const lightWrapper = document.getElementById("lightWrapper");
            while (lightWrapper.firstChild) lightWrapper.removeChild(lightWrapper.firstChild);
            if (settings.colorType == "RGB") {
                addRgbChooser();
            } else if (settings.colorType == "Temperature") {
                addTemperatureChooser();
            }
        });
        
    };

    this.update = function (homeAssistantCache) {
        var entityIdElement = document.getElementById("entityId");
        ActionPI.populateEntityOptions(entityIdElement, "light", homeAssistantCache);
        if (settings.entityId != undefined) {
            entityIdElement.value = settings.entityId;
        }

        var colorElement = document.getElementById("color");
        if (colorElement != null && settings.color != undefined) {
            colorElement.value = settings.color;
        }

        var lights = homeAssistantCache.entities["light"];
        logMessage(homeAssistantCache);
        if (lights === undefined) {
            logMessage("There aren't any lights in the cache yet");
            return;
        }

        // figure out what features this light supports
        const entity = lights.find((e) => e.entity_id == settings.entityId);
        const supportedFeatures = entity.attributes.supported_features;
        var lightSupportsBrightness = supportedFeatures & LightSupportedFeaturesBitmask.SUPPORT_BRIGHTNESS;
        var lightSupportsRgb = supportedFeatures & LightSupportedFeaturesBitmask.SUPPORT_COLOR;
        var lightSupportsTemperature = supportedFeatures & LightSupportedFeaturesBitmask.SUPPORT_COLOR_TEMP;

        if (lightSupportsBrightness) {
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

        const colorType = document.getElementById("colorType");
        colorType.innerHTML = `<option value="none">None</option>`;

        if (lightSupportsRgb) {
            const colorOption = document.createElement("option");
            colorOption.value = "RGB";
            colorOption.innerHTML = "RGB";
            colorType.appendChild(colorOption);
            logMessage(settings.entityId + " supports RGB mode");
        }

        if (lightSupportsTemperature) {
            const colorTempOption = document.createElement("option");
            colorTempOption.value = "Temperature";
            colorTempOption.innerHTML = "Temperature";
            colorType.appendChild(colorTempOption);
            logMessage(settings.entityId + " supports temperature mode");
        }
        
        if (settings.colorType != undefined) {
            colorType.value = settings.colorType;
        }
    };

    function miredToTemperature(mired) {
        return 1000000.0 / mired;
    }
}
