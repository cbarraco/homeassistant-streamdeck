var streamDeckWebSocket = null;

var globalSettings = {};

var homeAssistantWebsocket = null;
var homeAssistantConnectionState = ConnectionState.DONT_KNOW;
var homeAssistantMessageId = 0;
var reconnectTimeout = null;
var knownEntityIds = [];

var mainCanvas = null;
var mainCanvasContext = null;

// Plugin entry point
function connectElgatoStreamDeckSocket(
    inPort,
    inPluginUUID,
    inRegisterEvent,
    inInfo
) {
    logStreamDeckEvent(inPort);
    logStreamDeckEvent(inPluginUUID);
    logStreamDeckEvent(inRegisterEvent);
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

        if (event == "keyUp") {
            logStreamDeckEvent(inEvent.data);
            var data = {};
            data.context = context;
            data.settings = jsonPayload["settings"];
            data.coordinates = jsonPayload["coordinates"];
            data.userDesiredState = jsonPayload["userDesiredState"];
            data.state = jsonPayload["state"];

            // Send onKeyUp event to actions
            if (context in actions) {
                actions[context].onKeyUp(data);
            }
        } else if (event == "willAppear") {
            logStreamDeckEvent(inEvent.data);
            var settings = jsonPayload["settings"];

            if (!(context in actions)) {
                // Add current instance to array
                if (action == ActionType.TOGGLE_SWITCH) {
                    actions[context] = new ToggleSwitchAction(
                        context,
                        settings
                    );
                }
            }
            fetchStates();
        } else if (event == "willDisappear") {
            logStreamDeckEvent(inEvent.data);
            // Remove current instance from array
            if (context in actions) {
                delete actions[context];
            }
        } else if (event == "didReceiveGlobalSettings") {
            globalSettings = jsonPayload["settings"];

            logMessage("Creating websocket");
            var webSocketAddress = "";
            if (globalSettings.ssl == true) {
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
                subscribeToStateChanges();
                fetchStates();
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
                } else if (eventType === "result") {
                    logHomeAssistantEvent(data);
                    const entityStateResults = data.result;
                    if (entityStateResults == null) {
                        logMessage(
                            "Results message that doesn't contain results"
                        );
                        return;
                    } else {
                        for (var i = 0; i < entityStateResults.length; i++) {
                            const entityState = entityStateResults[i];
                            if (
                                !knownEntityIds.includes(entityState.entity_id)
                            ) {
                                knownEntityIds.push(entityState.entity_id);
                            }
                            handleStateChange(
                                entityState.entity_id,
                                entityState.state,
                                context
                            );
                        }
                        sendToPropertyInspector(action, context, {
                            entityUpdate: knownEntityIds,
                        });
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
                    logMessage(
                        "We were connected and suddenly disconnected, retry in 30 seconds"
                    );
                    homeAssistantConnectionState =
                        ConnectionState.NEED_RECONNECT;
                    tryAgain = true;
                } else if (
                    homeAssistantConnectionState ==
                    ConnectionState.NEED_RECONNECT
                ) {
                    logMessage("Still not connected, retry in 30 seconds");
                    tryAgain = true;
                } else if (
                    homeAssistantConnectionState ==
                    ConnectionState.NOT_CONNECTED
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
                actions[context].setSettings(settings);
            }
        } else if (event == "sendToPlugin") {
            logStreamDeckEvent(inEvent.data);
            clearTimeout(reconnectTimeout);
            requestGlobalSettings(inPluginUUID);
        }
    };

    function handleInvalidAccessToken(data) {
        logHomeAssistantEvent(data);
        homeAssistantConnectionState = ConnectionState.INVALID_TOKEN;
        homeAssistantWebsocket.close();
    }

    function handleStateChange(entityId, newState, context) {
        for (context in actions) {
            var actionSettings = actions[context].getSettings();
            if (entityId === actionSettings["entityIdInput"]) {
                logMessage(`Updating state of ${entityId} to ${newState}`);
                if (newState === "on") {
                    mainCanvasContext.fillStyle = "#1976D2";
                } else {
                    mainCanvasContext.fillStyle = "#FF5252";
                }
                mainCanvasContext.fillRect(
                    0,
                    0,
                    mainCanvas.width,
                    mainCanvas.height
                );
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
        const fetchMessage = `{
                    "id": ${++homeAssistantMessageId},
                    "type": "get_states"
                  }`;
        homeAssistantWebsocket.send(fetchMessage);
    }
}
