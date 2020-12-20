var streamDeckWebSocket = null;

var globalSettings = {};

var homeAssistantWebsocket = null;
var homeAssistantConnectionState = ConnectionState.DONT_KNOW;
var homeAssistantMessageId = 0;
var reconnectTimeout = null;
var homeAssistantCache = {
    entities: [],
    services: {},
};

// TODO: organize these in a dictionary
var fetchStatesMessageId = -1;
var fetchServicesMessageId = -1;

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
            if (globalSettings.homeAssistantAddress !== undefined && globalSettings.accessToken !== undefined) {
                logMessage("Creating HA websocket");
                var webSocketAddress = "";
                if (globalSettings.hasOwnProperty("ssl") && globalSettings.ssl == true) {
                    webSocketAddress = `wss://${globalSettings.homeAssistantAddress}/api/websocket`;
                } else {
                    webSocketAddress = `ws://${globalSettings.homeAssistantAddress}/api/websocket`;
                }

                homeAssistantWebsocket = new WebSocket(webSocketAddress);
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
                        const newState = data.event.data.new_state.state;
                        const entityId = data.event.data.entity_id;
                        handleStateChange(entityId, newState, context);
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
                            // we got results, but which ones?
                            if (data.id == fetchStatesMessageId) {
                                updateEntitiesCache(results, context, action);
                            } else if (data.id == fetchServicesMessageId) {
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
                    } else if (homeAssistantConnectionState == ConnectionState.NOT_CONNECTED) {
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
        } else if (event == "didReceiveSettings") {
            logStreamDeckEvent(inEvent.data);
            var settings = jsonPayload["settings"];
            if (context in actions) {
                actions[context].setSettings(settings);
            }
        } else if (event == "sendToPlugin") {
            logStreamDeckEvent(inEvent.data);
            const eventType = inEvent.data.eventType;
            if (eventType == "requestReconnect") {
                clearTimeout(reconnectTimeout);
                requestGlobalSettings(inPluginUUID);
            } else if (eventType == "requestCacheUpdate") {
                sendToPropertyInspector(action, context, {
                    eventType: "entitiesUpdate",
                    data: homeAssistantCache.entities,
                });
                sendToPropertyInspector(action, context, {
                    eventType: "servicesUpdate",
                    data: homeAssistantCache.services,
                });
            }
        } else if (event == "propertyInspectorDidAppear") {
            logStreamDeckEvent(inEvent.data);

            // make sure the parameter dropdowns are up to date
            fetchStates();
            fetchServices();
        }
    };

    function updateEntitiesCache(results, context, action) {
        // TODO: organize entities by type like how services are organized by domain
        logMessage("Got fetch states result, parsing response");
        homeAssistantCache.entities.splice(0, homeAssistantCache.entities.length);
        for (var i = 0; i < results.length; i++) {
            const entityState = results[i];
            if (!homeAssistantCache.entities.includes(entityState.entity_id)) {
                homeAssistantCache.entities.push(entityState.entity_id);
            }
            handleStateChange(entityState.entity_id, entityState.state, context);
        }
        sendToPropertyInspector(action, context, {
            eventType: "entitiesUpdate",
            data: homeAssistantCache.entities,
        });
    }

    function updateServicesCache(results, context, action) {
        logMessage("Got fetch services result, parsing response");
        delete homeAssistantCache.services;
        const resultKeys = Object.getOwnPropertyNames(results);
        for (var i = 0; i < resultKeys.length; i++) {
            const domain = resultKeys[i];
            homeAssistantCache.services[domain] = [];
            const serviceKeys = Object.getOwnPropertyNames(results[domain]);
            for (var j = 0; j < serviceKeys.length; j++) {
                homeAssistantCache.services[domain].push(serviceKeys[j]);
            }
        }
        sendToPropertyInspector(action, context, {
            eventType: "servicesUpdate",
            data: homeAssistantCache.services,
        });
        logMessage(homeAssistantCache.services);
    }

    function handleInvalidAccessToken(data) {
        logHomeAssistantEvent(data);
        homeAssistantConnectionState = ConnectionState.INVALID_TOKEN;
        homeAssistantWebsocket.close();
    }

    function handleStateChange(entityId, newState, context) {
        for (context in actions) {
            var actionSettings = actions[context].getSettings();
            if (entityId === actionSettings["entityId"]) {
                logMessage(`Updating state of ${entityId} to ${newState}`);
                if (newState === "on") {
                    mainCanvasContext.fillStyle = "#1976D2";
                } else {
                    mainCanvasContext.fillStyle = "#FF5252";
                }
                mainCanvasContext.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
                setImage(context, mainCanvas.toDataURL());
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
        fetchStatesMessageId = ++homeAssistantMessageId;
        const fetchMessage = `{
                    "id": ${fetchStatesMessageId},
                    "type": "get_states"
                  }`;
        homeAssistantWebsocket.send(fetchMessage);
    }

    function fetchServices() {
        logMessage("Fetching all services");
        fetchServicesMessageId = ++homeAssistantMessageId;
        const fetchMessage = `{
                    "id": ${fetchServicesMessageId},
                    "type": "get_services"
                  }`;
        homeAssistantWebsocket.send(fetchMessage);
    }
}
