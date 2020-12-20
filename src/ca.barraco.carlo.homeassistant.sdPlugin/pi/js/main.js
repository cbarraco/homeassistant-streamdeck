var streamDeckWebSocket = null;
var globalSettings = {};
var settings = {};

var homeAssistantCache = {
    entities: {},
    services: {},
};

// Property inspector entry point
function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
    var info = JSON.parse(inInfo);
    var language = info["application"]["language"];

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

    const wrapper = document.getElementById("wrapper");
    if (action == ActionType.TOGGLE_SWITCH) {
        setUpToggleSwitchElements();
    } else if (action == ActionType.CALL_SERVICE) {
        setUpCallServiceElements();
    }

    setUpGlobalSettingsElements();
    updateElementsFromGlobalSettings();

    streamDeckWebSocket.onmessage = function (streamDeckMessage) {
        logStreamDeckEvent(streamDeckMessage);
        var streamDeckMessageData = JSON.parse(streamDeckMessage.data);
        var event = streamDeckMessageData["event"];
        var payload = streamDeckMessageData["payload"];

        if (event == "didReceiveGlobalSettings") {
            globalSettings = payload["settings"];
            updateElementsFromGlobalSettings();
        } else if (event == "didReceiveSettings") {
            settings = payload["settings"];
            if (action == ActionType.TOGGLE_SWITCH) {
                handleNewSettingsForToggleSwitchAction();
            } else if (action == ActionType.CALL_SERVICE) {
                handleNewSettingsForCallServiceAction();
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
                }
            }
        }
    };

    function setUpToggleSwitchElements() {
        logMessage("Injecting toggle switch parameters");
        wrapper.innerHTML += `<div class="sdpi-item">
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

    function handleNewSettingsForToggleSwitchAction() {
        var entityIdElement = document.getElementById("entityId");
        populateEntityOptions(entityIdElement, "switch");
        if (settings.entityId != undefined) {
            entityIdElement.value = settings.entityId;
        }
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
        payloadElement.value = settings.serviceId;
        payloadElement.addEventListener("input", function (inEvent) {
            var value = inEvent.target.value;
            settings.payload = value;
            saveSettings(action, inUUID, settings);
        });
    }

    function handleNewSettingsForCallServiceAction() {
        var serviceIdElement = document.getElementById("serviceId");
        populateServiceOptions(serviceIdElement);
        if (settings.serviceId != undefined) {
            serviceIdElement.value = settings.serviceId;
        }

        var payloadElement = document.getElementById("payload");
        populateServiceOptions(payloadElement);
        if (settings.payload != undefined) {
            payloadElement.value = settings.payload;
        }
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

    function populateEntityOptions(entityIdElement, type) {
        logMessage("Populating entities parameter options");
        logMessage(homeAssistantCache.entities);
        populateOptionsFromCacheProperty(entityIdElement, homeAssistantCache.entities, type);
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

    function updateElementsFromGlobalSettings() {
        logMessage("Updating UI using global settings");
        var homeAssistantAddress = document.getElementById("homeAssistantAddress");
        var encrypted = document.getElementById("encrypted");
        var accessToken = document.getElementById("accessToken");

        if (globalSettings.homeAssistantAddress != undefined) {
            homeAssistantAddress.value = globalSettings.homeAssistantAddress;
        }
        if (globalSettings.encrypted != undefined) {
            encrypted.checked = globalSettings.encrypted;
        }
        if (globalSettings.accessToken != undefined) {
            accessToken.value = globalSettings.accessToken;
        }
    }

    function setUpGlobalSettingsElements() {
        logMessage("Setting up event listeners for global settings parameters");
        var homeAssistantAddress = document.getElementById("homeAssistantAddress");
        var encrypted = document.getElementById("encrypted");
        var accessToken = document.getElementById("accessToken");
        homeAssistantAddress.addEventListener("change", function (inEvent) {
            logMessage(inEvent);
            var value = inEvent.target.value;
            globalSettings.homeAssistantAddress = value;
            saveGlobalSettings(inUUID);
            sendToPlugin(action, inUUID, {
                command: PluginCommands.REQUEST_RECONNECT,
            });
        });

        encrypted.addEventListener("click", function (inEvent) {
            logMessage(inEvent);
            var checked = inEvent.target.checked;
            globalSettings.encrypted = checked;
            saveGlobalSettings(inUUID);
            sendToPlugin(action, inUUID, {
                command: PluginCommands.REQUEST_RECONNECT,
            });
        });

        accessToken.addEventListener("change", function (inEvent) {
            logMessage(inEvent);
            var value = inEvent.target.value;
            globalSettings.accessToken = value;
            saveGlobalSettings(inUUID);
            sendToPlugin(action, inUUID, {
                command: PluginCommands.REQUEST_RECONNECT,
            });
        });
    }
}
