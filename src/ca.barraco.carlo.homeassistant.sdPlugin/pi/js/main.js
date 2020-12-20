var streamDeckWebSocket = null;
var globalSettings = {};
var settings = {};

var homeAssistantCache = {
    entities: [],
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
            eventType: "requestCacheUpdate",
        });
    };

    const wrapper = document.getElementById("wrapper");
    if (action == ActionType.TOGGLE_SWITCH) {
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
    } else if (action == ActionType.CALL_SERVICE) {
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
                var entityId = document.getElementById("entityId");
                populateEntityOptions(entityId, "switch");
                if (settings.entityId != undefined) {
                    entityId.value = settings.entityId;
                }
            } else if (action == ActionType.CALL_SERVICE) {
                var serviceId = document.getElementById("serviceId");
                populateServiceOptions(serviceId);
                if (settings.serviceId != undefined) {
                    serviceId.value = settings.serviceId;
                }

                var payload = document.getElementById("payload");
                populateServiceOptions(payload);
                if (settings.payload != undefined) {
                    payload.value = settings.payload;
                }
            }
        } else if (event == "sendToPropertyInspector") {
            logStreamDeckEvent(evt);
            const updateType = jsonPayload["eventType"];
            if (action == ActionType.TOGGLE_SWITCH && updateType == "entitiesUpdate") {
                homeAssistantCache.entities = jsonPayload["data"];
                var entityId = document.getElementById("entityId");
                populateEntityOptions(entityId, "switch");
                if (settings.entityId != undefined) {
                    entityId.value = settings.entityId;
                }
            } else if (action == ActionType.CALL_SERVICE && updateType == "servicesUpdate") {
                homeAssistantCache.services = jsonPayload["data"];

                var serviceId = document.getElementById("serviceId");
                populateServiceOptions(serviceId);
                if (settings.serviceId != undefined) {
                    serviceId.value = settings.serviceId;
                }

                var payload = document.getElementById("payload");
                if (settings.payload != undefined) {
                    payload.value = settings.payload;
                }
            }
        }
    };

    function populateEntityOptions(entityIdElement, type) {
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
                domainOptGroup.appendChild(serviceOption);
            }

            entityIdElement.appendChild(domainOptGroup);
        }
    }

    function populateServiceOptions(serviceIdElement) {
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
        homeAssistantAddress.addEventListener("change", function (inEvent) {
            var value = inEvent.target.value;
            globalSettings.homeAssistantAddress = value;
            saveGlobalSettings(inUUID);
            sendToPlugin(action, inUUID, {
                eventType: "requestReconnect",
            });
        });

        ssl.addEventListener("click", function (inEvent) {
            var checked = inEvent.target.checked;
            globalSettings.ssl = checked;
            saveGlobalSettings(inUUID);
            sendToPlugin(action, inUUID, {
                eventType: "requestReconnect",
            });
        });

        accessToken.addEventListener("change", function (inEvent) {
            var value = inEvent.target.value;
            globalSettings.accessToken = value;
            saveGlobalSettings(inUUID);
            sendToPlugin(action, inUUID, {
                eventType: "requestReconnect",
            });
        });
    }
}
