var streamDeckWebSocket = null;

var globalSettings = {
    homeAssistantAddress: "",
    accessToken: "",
    encrypted: false,
};

var homeAssistantWebsocket = null;
var homeAssistantConnectionState = ConnectionState.DONT_KNOW;
var homeAssistantMessageId = 0;
var reconnectTimeout = null;
var homeAssistantCache = {
    entities: {},
    services: {},
};

var lastMessageId = {
    fetchStates: -1,
    fetchServices: -1
};

var subscriptions = {};

var mainCanvas = null;
var mainCanvasContext = null;

// Plugin entry point
function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) {
    logStreamDeckEvent(inInfo);

    var actions = {};

    mainCanvas = document.getElementById("mainCanvas");
    mainCanvasContext = mainCanvas.getContext("2d");

    // Open the web socket to Stream Deck
    // Use 127.0.0.1 because Windows needs 300ms to resolve localhost
    streamDeckWebSocket = new WebSocket("ws://127.0.0.1:" + inPort);

    streamDeckWebSocket.onopen = function () {
        logStreamDeckEvent("Connected to Stream Deck");
        registerPluginOrPI(inRegisterEvent, inPluginUUID);
        requestGlobalSettings(inPluginUUID);
    };

    streamDeckWebSocket.onmessage = function (inEvent) {
        var inData = JSON.parse(inEvent.data);
        if (inData.event == "keyDown") {
            handleKeyDownEvent(inData);
        } else if (inData.event == "willAppear") {
            handleWillAppearEvent(inData);
        } else if (inData.event == "willDisappear") {
            handleWillDisappearEvent(inData);
        } else if (inData.event == "didReceiveGlobalSettings") {
            handleDidReceiveGlobalSettingsEvent(inData);
        } else if (inData.event == "didReceiveSettings") {
            handleDidReceiveSettings(inData);
        } else if (inData.event == "sendToPlugin") {
            handleSendToPlugin(inEvent, inData);
        } else if (inData.event == "propertyInspectorDidAppear") {
            handlePropertyInspectorDidAppear(inData);
        } else {
            logStreamDeckEvent("Received unhandled event: " + inData.event);
        }
    };

    function handlePropertyInspectorDidAppear(inData) {
        // make sure the parameter dropdowns are up to date
        if (homeAssistantConnectionState == ConnectionState.CONNECTED) {
            fetchStates();
            fetchServices();
            for (context in actions) {
                sendCacheUpdateToPropertyInspector(inData.action, context);
            }
        }
    }

    function handleSendToPlugin(inEvent, inData) {
        logStreamDeckEvent("Handling sendToPlugin event");
        const command = inEvent.data.command;
        if (command == PluginCommands.REQUEST_RECONNECT) {
            clearTimeout(reconnectTimeout);
            requestGlobalSettings(inPluginUUID);
        } else if (command == PluginCommands.REQUEST_CACHE_UPDATE) {
            sendCacheUpdateToPropertyInspector(inData.action, inData.context);
        }
    }

    function handleDidReceiveSettings(inData) {
        logStreamDeckEvent("Handling didReceiveSettings event");
        if (inData.context in actions) {
            actions[inData.context].onSettingsUpdate(inData.payload.settings);
        }
    }

    function handleDidReceiveGlobalSettingsEvent(inData) {
        logStreamDeckEvent("Handling didReceiveGlobalSettings event");
        globalSettings = inData.payload.settings;
        // only try connecting if all the credentials are filled in
        if (
            inData.payload.settings.homeAssistantAddress == undefined ||
            inData.payload.settings.accessToken == undefined
        ) {
            logMessage("All the required settings weren't filled in");
        } else {
            createHomeAssistantWebSocket(inData);
        }
    }

    function createHomeAssistantWebSocket(inData) {
        logMessage("Creating HA websocket");
        var webSocketAddress = "";
        if (inData.payload.settings.hasOwnProperty("encrypted") && inData.payload.settings.encrypted == true) {
            webSocketAddress = `wss://${inData.payload.settings.homeAssistantAddress}/api/websocket`;
        } else {
            webSocketAddress = `ws://${inData.payload.settings.homeAssistantAddress}/api/websocket`;
        }

        try {
            homeAssistantWebsocket = new WebSocket(webSocketAddress);
            if (homeAssistantWebsocket == null) {
                logMessage("Couldn't connect to HA, probably invalid address");
                homeAssistantConnectionState = ConnectionState.INVALID_ADDRESS;
            } else {
                setupHomeAssistantWebSocket(inData);
            }
        } catch (error) {
            logMessage("Couldn't connect to HA, probably invalid address");
            logMessage(error);
            homeAssistantConnectionState = ConnectionState.INVALID_ADDRESS;
        }
    }

    function setupHomeAssistantWebSocket(inData) {
        homeAssistantWebsocket.onopen = function () {
            logMessage("Opened connection to HA");
            sendAccessToken(inData.payload.settings.accessToken);
        };

        homeAssistantWebsocket.onmessage = function (e) {
            var homeAssistantEvent = JSON.parse(e.data);
            if (homeAssistantEvent.type === "event") {
                handleStateChange(
                    homeAssistantEvent.event.variables.trigger.entity_id,
                    homeAssistantEvent.event.variables.trigger.to_state
                );
            } else if (homeAssistantEvent.type === "auth_invalid") {
                handleInvalidAccessToken(homeAssistantEvent);
            } else if (homeAssistantEvent.type === "auth_ok") {
                // everything is good to go
                logHomeAssistantEvent(homeAssistantEvent);
                homeAssistantConnectionState = ConnectionState.CONNECTED;
                reconnectTimeout = null;
                fetchStates();
                fetchServices();
                for (context in actions) {
                    entityId = actions[context].getSettings().entityId;
                    subscribeToTrigger("state", entityId);
                }
            } else if (homeAssistantEvent.type === "result") {
                const results = homeAssistantEvent.result;
                if (results == null) {
                    var entityId = findKeyByValue(subscriptions, homeAssistantEvent.id);
                    if (entityId == null) {
                        logHomeAssistantEvent("Results message that doesn't contain results");
                    } else {
                        logHomeAssistantEvent("Successfully subscribed to events from " + entityId);
                    }
                } else {
                    // we got results, but for what?
                    logMessage(lastMessageId);
                    if (homeAssistantEvent.id == lastMessageId.fetchStates) {
                        updateEntitiesCache(results);
                    } else if (homeAssistantEvent.id == lastMessageId.fetchServices) {
                        updateServicesCache(results);
                    }
                }
            } else {
                // other HA message, just log it
                logHomeAssistantEvent(homeAssistantEvent);
            }
        };

        homeAssistantWebsocket.onerror = function (e) {
            logMessage("WebSocket error:");
            logHomeAssistantEvent(e);
            homeAssistantWebsocket.close();
        };

        homeAssistantWebsocket.onclose = function (e) {
            logMessage(`WebSocket closed: ${e.code} ${e.reason}`);

            var tryAgain = false;
            if (homeAssistantConnectionState == ConnectionState.CONNECTED) {
                logMessage("We were connected and suddenly disconnected, retry in 30 seconds");
                homeAssistantConnectionState = ConnectionState.NEED_RECONNECT;
                tryAgain = true;
            } else if (homeAssistantConnectionState == ConnectionState.NEED_RECONNECT) {
                logMessage("Still not connected, retry in 30 seconds");
                tryAgain = true;
            } else if (
                homeAssistantConnectionState == ConnectionState.NOT_CONNECTED ||
                homeAssistantConnectionState == ConnectionState.INVALID_ADDRESS
            ) {
                logMessage("First connection failed, retry in 30 seconds");
                tryAgain = true;
            }

            if (tryAgain && reconnectTimeout != null) {
                reconnectTimeout = setTimeout(function () {
                    requestGlobalSettings(inPluginUUID);
                }, 30000);
            }
        };
    }

    function handleWillDisappearEvent(inData) {
        logStreamDeckEvent("Handling willDisappear event");
        if (inData.context in actions) {
            delete actions[inData.context];
        }
    }

    function handleWillAppearEvent(inData) {
        logStreamDeckEvent("Handling willAppear event");
        if (!(inData.context in actions)) {
            // Add current instance
            if (inData.action == ActionType.TOGGLE_SWITCH) {
                actions[inData.context] = new ToggleSwitchAction(inData.context, inData.payload.settings);
            } else if (inData.action == ActionType.CALL_SERVICE) {
                actions[inData.context] = new CallServiceAction(inData.context, inData.payload.settings);
            } else if (inData.action == ActionType.TOGGLE_LIGHT) {
                actions[inData.context] = new ToggleLightAction(inData.context, inData.payload.settings);
            } else if (inData.action == ActionType.SET_LIGHT_COLOR) {
                actions[inData.context] = new SetLightColorAction(inData.context, inData.payload.settings);
            }
        }
    }

    function handleKeyDownEvent(inData) {
        logStreamDeckEvent("Got keyDown event for action " + inData.action + " and context " + inData.context);
        actions[inData.context].onKeyDown(inData);
    }

    function sendCacheUpdateToPropertyInspector(action, context) {
        logMessage(`Sending cache update to ${context}`);
        sendToPropertyInspector(action, context, {
            command: PropertyInspectorCommands.UPDATE_CACHE,
            data: homeAssistantCache,
        });
    }

    function updateEntitiesCache(results) {
        logMessage(`Got fetchStates result containing ${results.length} entities`);
        delete homeAssistantCache.entities;
        homeAssistantCache.entities = {};

        for (var i = 0; i < results.length; i++) {
            const entityState = results[i];
            const entityId = entityState.entity_id;
            if (homeAssistantCache.entities[entityId] == undefined) {
                homeAssistantCache.entities[entityId] = [];
            }
            homeAssistantCache.entities[entityId].push(entityState);
            handleStateChange(entityState.entity_id, entityState);
        }
        logMessage('Done updating entities cache');

        for (context in actions) {
            sendCacheUpdateToPropertyInspector(actions[context], context);
        }
    }

    function updateServicesCache(results) {
        logMessage(`Got fetchServices result containing ${results.length} services`);
        delete homeAssistantCache.services;
        homeAssistantCache.services = {};
        const resultKeys = Object.getOwnPropertyNames(results);
        for (var i = 0; i < resultKeys.length; i++) {
            const domain = resultKeys[i];
            homeAssistantCache.services[domain] = [];
            const serviceKeys = Object.getOwnPropertyNames(results[domain]);
            for (var j = 0; j < serviceKeys.length; j++) {
                homeAssistantCache.services[domain].push(domain + "." + serviceKeys[j]);
            }
        }
        for (context in actions) {
            sendCacheUpdateToPropertyInspector(actions[context], context);
        }
    }

    function handleInvalidAccessToken(data) {
        logHomeAssistantEvent(data);
        logMessage("Invalid access token, shutting down");
        homeAssistantConnectionState = ConnectionState.INVALID_TOKEN;
        homeAssistantWebsocket.close();
    }

    function handleStateChange(entityId, newState) {
        // TODO this should be delegated to the individual action objects
        for (context in actions) {
            var actionSettings = actions[context].getSettings();
            if (entityId === actionSettings["entityId"]) {
                if (actions[context] instanceof ToggleSwitchAction) {
                    logMessage(`Updating state of switch ${entityId} to ${newState.state}`);
                    if (newState.state === "on") {
                        mainCanvasContext.fillStyle = "#1976D2";
                    } else {
                        mainCanvasContext.fillStyle = "#FF5252";
                    }
                    mainCanvasContext.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
                    setImage(context, mainCanvas.toDataURL());
                } else if (actions[context] instanceof ToggleLightAction) {
                    logMessage(`Updating state of light ${entityId}`);
                    if (newState.state === "on") {
                        if (newState.attributes.color_mode === "hs") {
                            const color_components = newState.attributes.rgb_color;
                            const hexColor = rgbToHex(color_components[0], color_components[1], color_components[2]);
                            mainCanvasContext.fillStyle = hexColor;
                        } else if (newState.attributes.color_mode === "color_temp") {
                            const miredTemp = newState.attributes.color_temp;
                            mainCanvasContext.fillStyle = miredToHex(miredTemp);
                        }
                        logMessage(`Updated color of light ${entityId} to ${mainCanvasContext.fillStyle}`);
                    } else {
                        mainCanvasContext.fillStyle = "#000000";
                    }
                    mainCanvasContext.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
                    setImage(context, mainCanvas.toDataURL());
                }
            }
        }
    }

    function sendAccessToken(accessToken) {
        logMessage("Sending access token");
        const authMessage = `{"type": "auth", "access_token": "${accessToken}"}`;
        homeAssistantWebsocket.send(authMessage);
    }

    function subscribeToTrigger(platform, entityId) {
        logMessage(`Subscribing to triggers from ${entityId}`);
        if (entityId in subscriptions) {
            logMessage(`Already subscribed to ${entityId}`);
            return;
        }
        else {
            subscriptions[entityId] = ++homeAssistantMessageId;
        }
        const subscribeMessage = `{
            "id": ${subscriptions[entityId]},
            "type": "subscribe_trigger",
            "trigger": {
                "platform": "${platform}",
                "entity_id": "${entityId}",
                "to": null
            }
        }`;

        logHomeAssistantEvent(subscribeMessage);
        homeAssistantWebsocket.send(subscribeMessage);
    }

    function fetchStates() {
        logMessage("Fetching all states");
        lastMessageId.fetchStates = ++homeAssistantMessageId;
        const fetchMessage = `{
            "id": ${lastMessageId.fetchStates},
            "type": "get_states"
        }`;

        logHomeAssistantEvent(fetchMessage);
        homeAssistantWebsocket.send(fetchMessage);
    }

    function fetchServices() {
        logMessage("Fetching all services");
        lastMessageId.fetchServices = ++homeAssistantMessageId;
        const fetchMessage = `{
            "id": ${lastMessageId.fetchServices},
            "type": "get_services"
        }`;

        logHomeAssistantEvent(fetchMessage);
        homeAssistantWebsocket.send(fetchMessage);
    }

    function findKeyByValue(obj, value) {
        for (let key in obj) {
            if (obj.hasOwnProperty(key) && obj[key] === value) {
              return key;
            }
          }
          // if the value is not found, return null
          return null;
      }
}
