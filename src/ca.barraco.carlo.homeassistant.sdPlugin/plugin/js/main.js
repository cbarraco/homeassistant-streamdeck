var streamDeckWebSocket = null;

var globalSettings = {};

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
    fetchServices: -1,
};

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
        registerPluginOrPI(inRegisterEvent, inPluginUUID);
        requestGlobalSettings(inPluginUUID);
    };

    streamDeckWebSocket.onmessage = function (inEvent) {
        var jsonObj = JSON.parse(inEvent.data);

        var event = jsonObj["event"];
        var action = jsonObj["action"];
        var context = jsonObj["context"];
        var jsonPayload = jsonObj["payload"];

        if (event == "keyDown") {
            logStreamDeckEvent(inEvent.data);
            // TODO clean this up
            var data = {};
            data.context = context;
            data.settings = jsonPayload["settings"];
            data.coordinates = jsonPayload["coordinates"];
            data.userDesiredState = jsonPayload["userDesiredState"];
            data.state = jsonPayload["state"];

            // Send onKeyDown event to action
            if (context in actions) {
                actions[context].onKeyDown(data);
            }
        } else if (event == "willAppear") {
            logStreamDeckEvent(inEvent.data);
            var settings = jsonPayload["settings"];

            if (!(context in actions)) {
                // Add current instance
                if (action == ActionType.TOGGLE_SWITCH) {
                    actions[context] = new ToggleSwitchAction(context, settings);
                } else if (action == ActionType.CALL_SERVICE) {
                    actions[context] = new CallServiceAction(context, settings);
                } else if (action == ActionType.TOGGLE_LIGHT) {
                    actions[context] = new ToggleLightAction(context, settings);
                } else if (action == ActionType.SET_LIGHT_COLOR) {
                    actions[context] = new SetLightColorAction(context, settings);
                }
            }
            // buttons need to be visually updated by fetching current state
            if (homeAssistantConnectionState == ConnectionState.CONNECTED) {
                fetchStates();
            }
        } else if (event == "willDisappear") {
            logStreamDeckEvent(inEvent.data);
            // Remove current instance
            if (context in actions) {
                delete actions[context];
            }
        } else if (event == "didReceiveGlobalSettings") {
            globalSettings = jsonPayload["settings"];

            // only try connecting if all the credentials are filled in
            if (globalSettings.homeAssistantAddress == undefined || globalSettings.accessToken == undefined) {
                logMessage("All the required settings weren't filled in");
                return;
            }
            logMessage("Creating HA websocket");
            var webSocketAddress = "";
            if (globalSettings.hasOwnProperty("encrypted") && globalSettings.encrypted == true) {
                webSocketAddress = `wss://${globalSettings.homeAssistantAddress}/api/websocket`;
            } else {
                webSocketAddress = `ws://${globalSettings.homeAssistantAddress}/api/websocket`;
            }

            try {
                homeAssistantWebsocket = new WebSocket(webSocketAddress);
            } catch (error) {
                logMessage("Couldn't connect to HA, probably invalid address");
                logMessage(error);
                homeAssistantConnectionState = ConnectionState.INVALID_ADDRESS;
                return;
            }

            if (homeAssistantWebsocket == null) {
                logMessage("Couldn't connect to HA, probably invalid address");
                homeAssistantConnectionState = ConnectionState.INVALID_ADDRESS;
                return;
            }

            homeAssistantWebsocket.onopen = function () {
                logMessage("Opened connection to HA");
                sendAccessToken();
            };

            homeAssistantWebsocket.onmessage = function (e) {
                const data = JSON.parse(e.data);
                const eventType = data.type;

                if (eventType === "event") {
                    handleStateChange(data.event.data.entity_id, data.event.data.new_state);
                } else if (eventType === "auth_invalid") {
                    handleInvalidAccessToken(data);
                } else if (eventType === "auth_ok") {
                    // everything is good to go
                    logHomeAssistantEvent(data);
                    homeAssistantConnectionState = ConnectionState.CONNECTED;
                    reconnectTimeout = null;
                    fetchStates();
                    fetchServices();
                    subscribeToStateChanges();
                } else if (eventType === "result") {
                    logHomeAssistantEvent(data);
                    const results = data.result;
                    if (results == null) {
                        logMessage("Results message that doesn't contain results");
                        return;
                    } else {
                        // we got results, but for what?
                        if (data.id == lastMessageId.fetchStates) {
                            updateEntitiesCache(results, context, action);
                            for (context in actions) {
                                sendCacheUpdateToPropertyInspector(action, context);
                            }
                        } else if (data.id == lastMessageId.fetchServices) {
                            updateServicesCache(results, context, action);
                        }
                    }
                } else {
                    // other HA message, just log it
                    logHomeAssistantEvent(data);
                }
            };

            homeAssistantWebsocket.onerror = function (e) {
                // error, shut it down
                logHomeAssistantEvent(e);
                homeAssistantWebsocket.close();
            };

            homeAssistantWebsocket.onclose = function (e) {
                logMessage("WebSocket closed");
                logHomeAssistantEvent(e);

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
        } else if (event == "didReceiveSettings") {
            logStreamDeckEvent(inEvent.data);
            var settings = jsonPayload["settings"];
            if (context in actions) {
                actions[context].onSettingsUpdate(settings);
            }
        } else if (event == "sendToPlugin") {
            logStreamDeckEvent(inEvent.data);
            const command = inEvent.data.command;
            if (command == PluginCommands.REQUEST_RECONNECT) {
                clearTimeout(reconnectTimeout);
                requestGlobalSettings(inPluginUUID);
            } else if (command == PluginCommands.REQUEST_CACHE_UPDATE) {
                sendCacheUpdateToPropertyInspector(action, context);
            }
        } else if (event == "propertyInspectorDidAppear") {
            logStreamDeckEvent(inEvent.data);

            // make sure the parameter dropdowns are up to date
            if (homeAssistantConnectionState == ConnectionState.CONNECTED) {
                fetchStates();
                fetchServices();
                for (context in actions) {
                    sendCacheUpdateToPropertyInspector(action, context);
                }
            }
        }
    };

    function sendCacheUpdateToPropertyInspector(action, context) {
        sendToPropertyInspector(action, context, {
            command: PropertyInspectorCommands.UPDATE_CACHE,
            data: homeAssistantCache,
        });
    }

    function updateEntitiesCache(results, context, action) {
        logMessage("Got fetch states result, parsing response");
        delete homeAssistantCache.entities;
        homeAssistantCache.entities = {};

        for (var i = 0; i < results.length; i++) {
            const result = results[i];
            const entityId = result.entity_id;
            const type = entityId.split(".")[0];
            if (homeAssistantCache.entities[type] == undefined) {
                homeAssistantCache.entities[type] = [];
            }
            homeAssistantCache.entities[type].push(result);
            handleStateChange(result.entity_id, result);
        }

        for (context in actions) {
            sendCacheUpdateToPropertyInspector(action, context);
        }
        logMessage(homeAssistantCache.entities);
    }

    function updateServicesCache(results, context, action) {
        logMessage("Got fetch services result, parsing response");
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
            sendCacheUpdateToPropertyInspector(action, context);
        }
        logMessage(homeAssistantCache.services);
    }

    function handleInvalidAccessToken(data) {
        logHomeAssistantEvent(data);
        homeAssistantConnectionState = ConnectionState.INVALID_TOKEN;
        homeAssistantWebsocket.close();
    }

    function handleStateChange(entityId, newState) {
        // TODO this should be delegated to the individual action objects
        for (context in actions) {
            if (actions[context] instanceof ToggleSwitchAction) {
                var actionSettings = actions[context].getSettings();
                if (entityId === actionSettings["entityId"]) {
                    logMessage(`Updating state of switch ${entityId} to ${newState.state}`);
                    if (newState.state === "on") {
                        mainCanvasContext.fillStyle = "#1976D2";
                    } else {
                        mainCanvasContext.fillStyle = "#FF5252";
                    }
                    mainCanvasContext.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
                    setImage(context, mainCanvas.toDataURL());
                }
            } else if (actions[context] instanceof ToggleLightAction) {
                var actionSettings = actions[context].getSettings();
                if (entityId === actionSettings["entityId"]) {
                    logMessage(`Updating state of light ${entityId}`);

                    if (newState.state === "on") {
                        if (newState.attributes.color_mode === "hs") {
                            const color_components = newState.attributes.rgb_color;
                            const hexColor = rgbToHex(color_components[0], color_components[1], color_components[2]);
                            mainCanvasContext.fillStyle = hexColor;
                        } else if (newState.attributes.color_mode === "color_temp") {
                            const miredTemp = newState.attributes.color_temp;
                            const colorTemp = 1000000.0 / miredTemp;
                            const enumTemp = Math.ceil(colorTemp / 100) * 100;
                            const rgb = KelvinToRgb[enumTemp];
                            mainCanvasContext.fillStyle = rgbToHex(rgb[0], rgb[1], rgb[2]);
                        }
                    } else {
                        mainCanvasContext.fillStyle = "#000000";
                    }
                    mainCanvasContext.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
                    setImage(context, mainCanvas.toDataURL());
                }
            }
        }
    }

    function sendAccessToken() {
        logMessage("Sending access token");
        const authMessage = `{"type": "auth", "access_token": "${globalSettings.accessToken}"}`;
        homeAssistantWebsocket.send(authMessage);
    }

    function subscribeToStateChanges() {
        logMessage("Subscribing to state changes");
        const subscribeMessage = `{
                        "id": ${++homeAssistantMessageId},
                        "type": "subscribe_events",
                        "event_type": "state_changed"
                    }`;
        homeAssistantWebsocket.send(subscribeMessage);
    }

    function fetchStates() {
        logMessage("Fetching all states");
        lastMessageId.fetchStates = ++homeAssistantMessageId;
        const fetchMessage = `{
                    "id": ${lastMessageId.fetchStates},
                    "type": "get_states"
                  }`;
        homeAssistantWebsocket.send(fetchMessage);
    }

    function fetchServices() {
        logMessage("Fetching all services");
        lastMessageId.fetchServices = ++homeAssistantMessageId;
        const fetchMessage = `{
                    "id": ${lastMessageId.fetchServices},
                    "type": "get_services"
                  }`;
        homeAssistantWebsocket.send(fetchMessage);
    }
}
