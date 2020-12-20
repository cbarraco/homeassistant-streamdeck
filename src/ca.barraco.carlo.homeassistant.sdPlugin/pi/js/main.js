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

    window.addEventListener("beforeunload", function (e) {
        e.preventDefault();
        sendValueToPlugin("propertyInspectorWillDisappear", "property_inspector");
    });

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

    var homeAssistantAddress = document.getElementById("homeAssistantAddress");
    var ssl = document.getElementById("ssl");
    var accessToken = document.getElementById("accessToken");
    setUpGlobalSettingsElements(homeAssistantAddress, ssl, accessToken);
    updateElementsFromGlobalSettings(homeAssistantAddress, ssl, accessToken);

    streamDeckWebSocket.onmessage = function (evt) {
        var jsonObj = JSON.parse(evt.data);
        var event = jsonObj["event"];
        var jsonPayload = jsonObj["payload"];

        logStreamDeckEvent(jsonObj);

        if (event == "didReceiveGlobalSettings") {
            globalSettings = jsonPayload["settings"];
            var homeAssistantAddress = document.getElementById("homeAssistantAddress");
            var ssl = document.getElementById("ssl");
            var accessToken = document.getElementById("accessToken");
            updateElementsFromGlobalSettings(homeAssistantAddress, ssl, accessToken);
        } else if (event == "didReceiveSettings") {
            settings = jsonPayload["settings"];
            if (action == ActionType.TOGGLE_SWITCH) {
                handleNewSettingsForToggleSwitchAction();
            } else if (action == ActionType.CALL_SERVICE) {
                handleNewSettingsForCallServiceAction();
            }
        } else if (event == "sendToPropertyInspector") {
            logStreamDeckEvent(evt);
            const command = jsonPayload["command"];
            if (command == PropertyInspectorCommands.UPDATE_CACHE) {
                homeAssistantCache = jsonPayload["data"];
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

        var entityId = document.getElementById("entityId");
        entityId.value = settings.entityId;
        entityId.addEventListener("input", function (inEvent) {
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

        var serviceId = document.getElementById("serviceId");
        serviceId.value = settings.serviceId;
        serviceId.addEventListener("input", function (inEvent) {
            var value = inEvent.target.value;
            settings.serviceId = value;
            saveSettings(action, inUUID, settings);
        });

        var payload = document.getElementById("payload");
        payload.value = settings.serviceId;
        payload.addEventListener("input", function (inEvent) {
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
        entityIdElement.innerHTML = "";

        var domainKeys = [];
        if (type != undefined) {
            // populate entities with specific type
            domainKeys = [type];
        } else {
            // populate entities with all entity types
            domainKeys = Object.getOwnPropertyNames(homeAssistantCache.entities);
        }

        for (var i = 0; i < domainKeys.length; i++) {
            const typeKey = domainKeys[i];
            const domainOptGroup = document.createElement("optgroup");
            domainOptGroup.label = typeKey;

            const entities = homeAssistantCache.entities[typeKey];
            for (var j = 0; j < entities.length; j++) {
                const entityId = entities[j];
                const entityOption = document.createElement("option");
                entityOption.value = entityId;
                entityOption.innerHTML = entityId;
                domainOptGroup.appendChild(entityOption);
            }

            entityIdElement.appendChild(domainOptGroup);
        }
    }

    function populateServiceOptions(serviceIdElement) {
        logMessage("Populating services parameter options");
        logMessage(homeAssistantCache.services);
        serviceIdElement.innerHTML = "";

        const domainKeys = Object.getOwnPropertyNames(homeAssistantCache.services);
        for (var i = 0; i < domainKeys.length; i++) {
            const domainKey = domainKeys[i];
            const domainOptGroup = document.createElement("optgroup");
            domainOptGroup.label = domainKey;

            const services = homeAssistantCache.services[domainKey];
            for (var j = 0; j < services.length; j++) {
                const serviceKey = services[j];
                const serviceOption = document.createElement("option");
                serviceOption.value = domainKey + "." + serviceKey;
                serviceOption.innerHTML = domainKey + "." + serviceKey;
                domainOptGroup.appendChild(serviceOption);
            }

            serviceIdElement.appendChild(domainOptGroup);
        }
    }

    function updateElementsFromGlobalSettings(homeAssistantAddress, ssl, accessToken) {
        logMessage("Updating UI using global settings");
        if (globalSettings.homeAssistantAddress != undefined) {
            homeAssistantAddress.value = globalSettings.homeAssistantAddress;
        }
        if (globalSettings.ssl != undefined) {
            ssl.checked = globalSettings.ssl;
        }
        if (globalSettings.accessToken != undefined) {
            accessToken.value = globalSettings.accessToken;
        }
    }

    function setUpGlobalSettingsElements(homeAssistantAddress, ssl, accessToken) {
        logMessage("Setting up event listeners for global settings parameters");
        homeAssistantAddress.addEventListener("change", function (inEvent) {
            logMessage(inEvent);
            var value = inEvent.target.value;
            globalSettings.homeAssistantAddress = value;
            saveGlobalSettings(inUUID);
            sendToPlugin(action, inUUID, {
                command: PluginCommands.REQUEST_RECONNECT,
            });
        });

        ssl.addEventListener("click", function (inEvent) {
            logMessage(inEvent);
            var checked = inEvent.target.checked;
            globalSettings.ssl = checked;
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
