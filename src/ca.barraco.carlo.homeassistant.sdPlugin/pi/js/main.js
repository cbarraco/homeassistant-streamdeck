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
        <div id="lightParameters"></div>
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

            const lightParameters = document.getElementById("lightParameters");
            while (lightParameters.firstChild) lightParameters.removeChild(lightParameters.firstChild);

            if (supportedFeatures & LightSupportedFeaturesBitmask.SUPPORT_BRIGHTNESS) {
                const brightnessParameter = `
                <div type="range" class="sdpi-item">
                    <div class="sdpi-item-label">Brightness</div>
                    <div class="sdpi-item-value">
                        <span class="clickable" value="0">0%</span>
                        <input id="brightness" type="range" min="0" max="100" value=50>
                        <span class="clickable" value="100">100%</span>
                    </div>
                </div>`;
                lightParameters.innerHTML += brightnessParameter;

                const brightness = document.getElementById("brightness");
                brightness.addEventListener("change", function (e) {
                    var value = inEvent.target.value;
                    settings.brightness = value;
                    saveSettings(action, inUUID, settings);
                });
            }
            if (
                supportedFeatures & LightSupportedFeaturesBitmask.SUPPORT_COLOR ||
                supportedFeatures & LightSupportedFeaturesBitmask.SUPPORT_COLOR_TEMP
            ) {
                const colorTypeParameter = `
                <div class="sdpi-item">
                    <div class="sdpi-item-label">Color Type</div>
                    <select class="sdpi-item-value select" id="colorType">
                        <option value="none">None</option>
                    </select>
                </div>`;
                lightParameters.innerHTML += colorTypeParameter;

                var colorType = document.getElementById("colorType");
                colorType.value = settings.color || "#00ff00";
                colorType.addEventListener("change", function (inEvent) {
                    var value = inEvent.target.value;
                    settings.colorType = value;
                    saveSettings(action, inUUID, settings);
                });
            }

            if (supportedFeatures & LightSupportedFeaturesBitmask.SUPPORT_COLOR) {
                const rgbColorParameter = `
                <div type="color" class="sdpi-item">
                    <div class="sdpi-item-label">Color</div>
                    <input type="color" class="sdpi-item-value" id="color" value="#ff0000">
                </div>`;
                wrapper.innerHTML += rgbColorParameter;

                var colorElement = document.getElementById("color");
                colorElement.value = settings.color || "#00ff00";
                colorElement.addEventListener("input", function (inEvent) {
                    var value = inEvent.target.value;
                    settings.color = value;
                    saveSettings(action, inUUID, settings);
                });

                const colorType = document.getElementById("colorType");
                const colorOption = document.createElement("option");
                colorOption.value = "RGB";
                colorOption.innerHTML = "RGB";
                colorType.appendChild(colorOption);
            }

            if (supportedFeatures & LightSupportedFeaturesBitmask.SUPPORT_COLOR_TEMP) {
                // TODO use min mired and max mired to generate real min and max range
                // TODO convert min mired and max mired to hex value for the slider gradient
                const colorTemperatureParameter = `
                <div type="range" class="sdpi-item">
                    <div class="sdpi-item-label">Range (with label)</div>
                    <div class="sdpi-item-value">
                        <span class="clickable" value="2700" id="min">2700K</span>
                        <input id="temperature" style="background-image: linear-gradient(to right, #ffa957, #ffffff);-webkit-transition: .2s;transition: opacity .2s;" type="range" min="2700" max="5600" value=2700>
                        <span class="clickable" value="5600" id="max">5600K</span>
                    </div>
                </div>`;
                lightParameters.innerHTML += colorTemperatureParameter;

                const temperature = document.getElementById("temperature");
                temperature.addEventListener("change", function (e) {
                    var value = inEvent.target.value;
                    settings.temperature = value;
                    saveSettings(action, inUUID, settings);
                });

                const colorType = document.getElementById("colorType");
                const colorTempOption = document.createElement("option");
                colorTempOption.value = "Temperature";
                colorTempOption.innerHTML = "Temperature";
                colorType.appendChild(colorTempOption);
            }
        });
    }

    function handleCacheUpdateForToggleLightAction() {
        var entityIdElement = document.getElementById("entityId");
        populateEntityOptions(entityIdElement, "light");
        if (settings.entityId != undefined) {
            entityIdElement.value = settings.entityId;
        }

        var colorElement = document.getElementById("color");
        if (settings.color != undefined) {
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
