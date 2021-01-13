var streamDeckWebSocket = null;
var globalSettings = {};
var settings = {};

var homeAssistantCache = {
    entities: {},
    services: {},
};

var credentialsWindow = null;
var pluginUUID = null;

// Property inspector entry point
function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
    var info = JSON.parse(inInfo);
    var language = info["application"]["language"];

    pluginUUID = inUUID;

    var actionInfo = JSON.parse(inActionInfo);
    logStreamDeckEvent(actionInfo);
    settings = actionInfo["payload"]["settings"];
    var action = actionInfo["action"];

    // Open the web socket to Stream Deck
    streamDeckWebSocket = new WebSocket("ws://127.0.0.1:" + inPort);

    // WebSocket is connected, send message
    streamDeckWebSocket.onopen = function () {
        registerPluginOrPI(inRegisterEvent, inUUID);
        requestGlobalSettings(inUUID);
        sendToPlugin(action, inUUID, {
            command: PluginCommands.REQUEST_CACHE_UPDATE,
        });
    };

    if (action == ActionType.TOGGLE_SWITCH) {
        setUpToggleSwitchElements();
    } else if (action == ActionType.CALL_SERVICE) {
        setUpCallServiceElements();
    } else if (action == ActionType.TOGGLE_LIGHT) {
        setUpToggleLightElements();
    }

    const enterCredentials = document.getElementById("enterCredentials");
    enterCredentials.addEventListener("click", function () {
        credentialsWindow = window.open("credentials.html", "Enter Credentials");
        logMessage("Sending global settings to credentials window");
        credentialsWindow.addEventListener("DOMContentLoaded", function (e) {
            credentialsWindow.postMessage({
                command: CredentialsCommands.UPDATE_ELEMENTS,
                data: globalSettings,
            });
        });
    });

    streamDeckWebSocket.onmessage = function (streamDeckMessage) {
        logStreamDeckEvent(streamDeckMessage);
        var streamDeckMessageData = JSON.parse(streamDeckMessage.data);
        var event = streamDeckMessageData["event"];
        var payload = streamDeckMessageData["payload"];

        if (event == "didReceiveGlobalSettings") {
            globalSettings = payload["settings"];
            if (credentialsWindow != null) {
                logMessage("Sending global settings to credentials window");
                credentialsWindow.postMessage({
                    command: CredentialsCommands.UPDATE_ELEMENTS,
                    data: globalSettings,
                });
            }
        } else if (event == "didReceiveSettings") {
            settings = payload["settings"];
            if (action == ActionType.TOGGLE_SWITCH) {
                handleCacheUpdateForToggleSwitchAction();
            } else if (action == ActionType.CALL_SERVICE) {
                handleCacheUpdateForCallServiceAction();
            } else if (action == ActionType.TOGGLE_LIGHT) {
                handleCacheUpdateForToggleLightAction();
            }
        } else if (event == "sendToPropertyInspector") {
            logStreamDeckEvent(streamDeckMessage);
            const command = payload["command"];
            if (command == PropertyInspectorCommands.UPDATE_CACHE) {
                homeAssistantCache = payload["data"];
                if (action == ActionType.TOGGLE_SWITCH) {
                    handleCacheUpdateForToggleSwitchAction();
                } else if (action == ActionType.CALL_SERVICE) {
                    handleCacheUpdateForCallServiceAction();
                } else if (action == ActionType.TOGGLE_LIGHT) {
                    handleCacheUpdateForToggleLightAction();
                }
            }
        }
    };

    function setUpToggleSwitchElements() {
        logMessage("Injecting toggle switch parameters");
        const wrapper = document.getElementById("wrapper");
        wrapper.innerHTML += `
        <div class="sdpi-item">
            <div class="sdpi-item-label">Entity</div>
            <select class="sdpi-item-value select" id="entityId">
            </select>
        </div>`;

        var entityIdElement = document.getElementById("entityId");
        entityIdElement.value = settings.entityId;
        entityIdElement.addEventListener("input", function (inEvent) {
            var value = inEvent.target.value;
            settings.entityId = value;
            saveSettings(action, inUUID, settings);
        });
    }

    function handleCacheUpdateForToggleSwitchAction() {
        var entityIdElement = document.getElementById("entityId");
        populateEntityOptions(entityIdElement, "switch");
        if (settings.entityId != undefined) {
            entityIdElement.value = settings.entityId;
        }
    }

    function setUpCallServiceElements() {
        logMessage("Injecting call service parameters");
        const wrapper = document.getElementById("wrapper");
        wrapper.innerHTML += `
        <div class="sdpi-item">
            <div class="sdpi-item-label">Service</div>
            <select class="sdpi-item-value select" id="serviceId">
            </select>
        </div>
        <div type="textarea" class="sdpi-item"">
            <div class="sdpi-item-label">Payload</div>
            <span class="sdpi-item-value textarea">
                <textarea type="textarea" id="payload"></textarea>
            </span>
        </div>`;

        var serviceIdElement = document.getElementById("serviceId");
        serviceIdElement.value = settings.serviceId;
        serviceIdElement.addEventListener("input", function (inEvent) {
            var value = inEvent.target.value;
            settings.serviceId = value;
            saveSettings(action, inUUID, settings);
        });

        var payloadElement = document.getElementById("payload");
        if (settings.payload != undefined) {
            payloadElement.value = settings.payload;
        }
        payloadElement.addEventListener("input", function (inEvent) {
            var value = inEvent.target.value;
            settings.payload = value;
            saveSettings(action, inUUID, settings);
        });
    }

    function handleCacheUpdateForCallServiceAction() {
        var serviceIdElement = document.getElementById("serviceId");
        populateServiceOptions(serviceIdElement);
        if (settings.serviceId != undefined) {
            serviceIdElement.value = settings.serviceId;
        }

        var payloadElement = document.getElementById("payload");
        if (settings.payload != undefined) {
            payloadElement.value = settings.payload;
        }
    }

    function setUpToggleLightElements() {
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

                logMessage({"minTemp":minTemperature, "maxTemp": maxTemperature});

                const colorTemperatureHtml = `
                <div type="range" class="sdpi-item">
                    <div class="sdpi-item-label">Temperature</div>
                    <div class="sdpi-item-value">
                        <span class="clickable" value="`+minTemperature+`" id="min">`+minTemperature+`K</span>
                        <input id="temperature" type="range" min="`+minTemperature+`" max="`+maxTemperature+`" value=`+minTemperature+`>
                        <span class="clickable" value="`+maxTemperature+`" id="max">`+maxTemperature+`K</span>
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
    }

    function miredToTemperature(mired) {
        return 1000000 / mired;
    }

    function handleCacheUpdateForToggleLightAction() {
        var entityIdElement = document.getElementById("entityId");
        populateEntityOptions(entityIdElement, "light");
        if (settings.entityId != undefined) {
            entityIdElement.value = settings.entityId;
        }

        var colorElement = document.getElementById("color");
        if (colorElement != null && settings.color != undefined) {
            colorElement.value = settings.color;
        }
    }

    function populateEntityOptions(element, type) {
        logMessage("Populating entities parameter options");
        logMessage(homeAssistantCache.entities);

        element.innerHTML = "";

        var keys = [];
        if (type != undefined) {
            // populate with specific key
            keys = [type];
        } else {
            // populate with all keys
            keys = Object.getOwnPropertyNames(homeAssistantCache.entities);
        }

        for (var i = 0; i < keys.length; i++) {
            const typeKey = keys[i];
            const optGroup = document.createElement("optgroup");
            optGroup.label = typeKey;
            const optionValues = homeAssistantCache.entities[typeKey];
            for (var j = 0; j < optionValues.length; j++) {
                const optionValue = optionValues[j].entity_id;
                const option = document.createElement("option");
                option.value = optionValue;
                option.innerHTML = optionValue;
                optGroup.appendChild(option);
            }
            element.appendChild(optGroup);
        }
    }

    function populateServiceOptions(serviceIdElement, type) {
        logMessage("Populating services parameter options");
        logMessage(homeAssistantCache.services);
        populateOptionsFromCacheProperty(serviceIdElement, homeAssistantCache.services, type);
    }

    function populateOptionsFromCacheProperty(element, cacheProperty, type) {
        element.innerHTML = "";

        var keys = [];
        if (type != undefined) {
            // populate with specific key
            keys = [type];
        } else {
            // populate with all keys
            keys = Object.getOwnPropertyNames(cacheProperty);
        }

        for (var i = 0; i < keys.length; i++) {
            const typeKey = keys[i];
            const optGroup = document.createElement("optgroup");
            optGroup.label = typeKey;
            const optionValues = cacheProperty[typeKey];
            for (var j = 0; j < optionValues.length; j++) {
                const optionValue = optionValues[j];
                const option = document.createElement("option");
                option.value = optionValue;
                option.innerHTML = optionValue;
                optGroup.appendChild(option);
            }
            element.appendChild(optGroup);
        }
    }
}

function sendCredentialsToPropertyInspector(message) {
    logMessage("Received message from credentials window");
    logMessage(message);
    const command = message["command"];
    const data = message["data"];
    if (command == PropertyInspectorCommands.UPDATE_GLOBAL_SETTINGS) {
        logMessage("Updating global settings");
        globalSettings = data;
        saveGlobalSettings(pluginUUID);
    }
}
