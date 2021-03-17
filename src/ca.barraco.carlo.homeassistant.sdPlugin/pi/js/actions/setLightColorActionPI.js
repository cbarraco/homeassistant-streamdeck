// Prototype which represents a set light color action property inspector
function SetLightColorActionPI(inUUID, inActionInfo) {
    var instance = this;

    var settings = inActionInfo["payload"]["settings"];
    var action = inActionInfo["action"];
    var context = inActionInfo["context"];

    // Inherit from Action
    ActionPI.call(this, inUUID, inActionInfo);

    var actionSetUp = this.setUp;

    // Public function called on initial setup
    this.setUp = function () {
        actionSetUp.call(this);
        logMessage("Injecting toggle switch parameters");
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
        entityIdElement.addEventListener("change", function (inEvent) {
            var value = inEvent.target.value;
            settings = {};
            settings.entityId = value;
            saveSettings(action, inUUID, settings);

            const entity = homeAssistantCache.entities["light"].find((e) => e.entity_id == settings.entityId);
            const supportedFeatures = entity.attributes.supported_features;

            logMessage("Adding settings for " + settings.entityId + " with supported features " + supportedFeatures);

            if (supportedFeatures & LightSupportedFeaturesBitmask.SUPPORT_BRIGHTNESS) {
                logMessage(settings.entityId + " supports brightness mode");
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

                const brightness = document.getElementById("brightness");
                brightness.addEventListener("change", function (e) {
                    logMessage("Saving brightness for " + settings.entityId);
                    var value = e.target.value;
                    settings.brightness = value;
                    saveSettings(action, inUUID, settings);
                });
            }

            const colorType = document.getElementById("colorType");
            colorType.innerHTML = `<option value="none">None</option>`;

            if (supportedFeatures & LightSupportedFeaturesBitmask.SUPPORT_COLOR) {
                const colorOption = document.createElement("option");
                colorOption.value = "RGB";
                colorOption.innerHTML = "RGB";
                colorType.appendChild(colorOption);
                logMessage(settings.entityId + " supports RGB mode");
            }

            if (supportedFeatures & LightSupportedFeaturesBitmask.SUPPORT_COLOR_TEMP) {
                const colorTempOption = document.createElement("option");
                colorTempOption.value = "Temperature";
                colorTempOption.innerHTML = "Temperature";
                colorType.appendChild(colorTempOption);
                logMessage(settings.entityId + " supports temperature mode");
            }
        });

        var colorType = document.getElementById("colorType");
        colorType.addEventListener("change", function (inEvent) {
            var value = inEvent.target.value;
            settings.colorType = value;
            saveSettings(action, inUUID, settings);

            const lightWrapper = document.getElementById("lightWrapper");
            while (lightWrapper.firstChild) lightWrapper.removeChild(lightWrapper.firstChild);
            if (settings.colorType == "RGB") {
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
                    saveSettings(action, inUUID, settings);
                });
            } else if (settings.colorType == "Temperature") {
                const entity = homeAssistantCache.entities["light"].find((e) => e.entity_id == settings.entityId);
                const minMired = entity.attributes.min_mireds;
                const maxMired = entity.attributes.max_mireds;

                const minTemperature = Math.round(miredToTemperature(maxMired)); // these are flipped intentionally
                const maxTemperature = Math.round(miredToTemperature(minMired)); // these are flipped intentionally

                logMessage({ minTemp: minTemperature, maxTemp: maxTemperature });

                const colorTemperatureHtml =
                    `
                    <div type="range" class="sdpi-item">
                        <div class="sdpi-item-label">Temperature</div>
                        <div class="sdpi-item-value">
                            <span class="clickable" value="` +
                    minTemperature +
                    `" id="min">` +
                    minTemperature +
                    `K</span>
                            <input id="temperature" type="range" min="` +
                    minTemperature +
                    `" max="` +
                    maxTemperature +
                    `" value=` +
                    minTemperature +
                    `>
                            <span class="clickable" value="` +
                    maxTemperature +
                    `" id="max">` +
                    maxTemperature +
                    `K</span>
                        </div>
                    </div>`;
                lightWrapper.innerHTML += colorTemperatureHtml;

                const temperature = document.getElementById("temperature");
                temperature.value = settings.temperature || 2700;
                settings.temperature = temperature.value;
                temperature.addEventListener("change", function (e) {
                    var value = e.target.value;
                    settings.temperature = value;
                    saveSettings(action, inUUID, settings);
                });
            }
        });
    };

    function miredToTemperature(mired) {
        return 1000000 / mired;
    }
}
