// Global web socket
var websocket = null;

// Global cache
var cache = {};

// Global settings
var globalSettings = {};

// Global Home Assistant socket
var homeAssistantWebsocket = null;

var currentMessageId = 0;

// TODO: since it's just simple colours try constructing image data without canvas
var mainCanvas = null;

var mainCanvasContext = null;

const ConnectionState = {
    NOT_CONNECTED: "not_connected",
    INVALID_ADDRESS: "invalid_address",
    INVALID_TOKEN: "invalid_token",
    NEED_RECONNECT: "need_reconnect",
    CONNECTED: "connected",
};
var homeAssistantConnectionState = ConnectionState.DONT_KNOW;

// Setup the websocket and handle communication
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

    // Create array of currently used actions
    var actions = {};

    // Create a cache
    cache = new Cache();

    mainCanvas = document.getElementById("mainCanvas");
    mainCanvasContext = mainCanvas.getContext("2d");

    // Open the web socket to Stream Deck
    // Use 127.0.0.1 because Windows needs 300ms to resolve localhost
    websocket = new WebSocket("ws://127.0.0.1:" + inPort);

    // Web socket is connected
    websocket.onopen = function () {
        // Register plugin to Stream Deck
        registerPluginOrPI(inRegisterEvent, inPluginUUID);

        // Request the global settings of the plugin
        requestGlobalSettings(inPluginUUID);
    };

    // Add event listener
    document.addEventListener(
        "newCacheAvailable",
        function () {
            // When a new cache is available
            Object.keys(actions).forEach(function (inContext) {
                // Inform all used actions that a new cache is available
                actions[inContext].newCacheAvailable(function () {
                    // Find out type of action
                    if (actions[inContext] instanceof ToggleSwitchAction) {
                        var action =
                            "ca.barraco.carlo.homeassistant.action.toggleswitch";
                    }
                    // Inform PI of new cache
                    sendToPropertyInspector(action, inContext, cache.data);
                });
            });
        },
        false
    );

    // Web socket received a message
    websocket.onmessage = function (inEvent) {

        // Parse parameter from string to object
        var jsonObj = JSON.parse(inEvent.data);

        // Extract payload information
        var event = jsonObj["event"];
        var action = jsonObj["action"];
        var context = jsonObj["context"];
        var jsonPayload = jsonObj["payload"];

        // Key up event
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
                actions[context].onKeyUp(data, function () {
                    // Refresh the cache
                    cache.update();
                });
            }
        } else if (event == "willAppear") {
            logStreamDeckEvent(inEvent.data);
            var settings = jsonPayload["settings"];

            // If this is the first visible action
            if (Object.keys(actions).length == 0) {
                // Start polling
                cache.update();
            }

            // Current instance is not in actions array
            if (!(context in actions)) {
                // Add current instance to array
                if (
                    action ===
                    "ca.barraco.carlo.homeassistant.action.toggleswitch"
                ) {
                    actions[context] = new ToggleSwitchAction(
                        context,
                        settings
                    );
                }
            }

            logMessage("Fetching all states");
            const fetchMessage = `{
                    "id": ${++currentMessageId},
                    "type": "get_states"
                  }`;
            homeAssistantWebsocket.send(fetchMessage);
        } else if (event == "willDisappear") {
            logStreamDeckEvent(inEvent.data);
            // Remove current instance from array
            if (context in actions) {
                delete actions[context];
            }
        } else if (event == "didReceiveGlobalSettings") {
            // Set global settings
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
                // authenticate with access token
                logMessage("Sending access token");
                const authMessage = `{"type": "auth", "access_token": "${globalSettings.accessToken}"}`;
                homeAssistantWebsocket.send(authMessage);

                // subscribe to all state change events
                logMessage("Subscribing to state changes");
                const subscribeMessage = `{
                        "id": ${++currentMessageId},
                        "type": "subscribe_events",
                        "event_type": "state_changed"
                    }`;
                homeAssistantWebsocket.send(subscribeMessage);

                logMessage("Fetching all states");
                const fetchMessage = `{
                    "id": ${++currentMessageId},
                    "type": "get_states"
                  }`;
                homeAssistantWebsocket.send(fetchMessage);
            };

            homeAssistantWebsocket.onmessage = function (e) {
                const data = JSON.parse(e.data);
                const eventType = data.type;

                if (eventType === "event") {
                    // got a new state update
                    const newState = data.event.data.new_state.state;

                    // check if the state update is relevant to our buttons
                    for (context in actions) {
                        var actionSettings = actions[context].getSettings();
                        if (
                            data.event.data.entity_id ===
                            actionSettings["entityIdInput"]
                        ) {
                            logHomeAssistantEvent(data);

                            if (newState === "on") {
                                // on, make it blue
                                mainCanvasContext.fillStyle = "#1976D2";
                                mainCanvasContext.fillRect(
                                    0,
                                    0,
                                    mainCanvas.width,
                                    mainCanvas.height
                                );
                            } else {
                                // off, make it red
                                mainCanvasContext.fillStyle = "#FF5252";
                                mainCanvasContext.fillRect(
                                    0,
                                    0,
                                    mainCanvas.width,
                                    mainCanvas.height
                                );
                            }
                            setImage(context, mainCanvas.toDataURL());
                        }
                    }
                } else if (eventType === "auth_invalid") {
                    // we connected but the access token is invalid
                    logHomeAssistantEvent(data);
                    homeAssistantConnectionState =
                        ConnectionState.INVALID_TOKEN;
                    homeAssistantWebsocket.close();
                } else if (eventType === "auth_ok") {
                    // everything is good to go
                    logHomeAssistantEvent(data);
                    homeAssistantConnectionState = ConnectionState.CONNECTED;
                } else if (eventType === "result") {
                    logHomeAssistantEvent(data);
                    const results = data.result;
                    if (results == null) {
                        logMessage(
                            "Results message that doesn't contain results"
                        );
                        return;
                    } else {
                        logHomeAssistantEvent(data);
                        logMessage(
                            "Updating button states based on fetched state results"
                        );
                        for (var i = 0; i < results.length; i++) {
                            const result = results[i];
                            for (context in actions) {
                                var actionSettings = actions[
                                    context
                                ].getSettings();
                                if (
                                    result.entity_id ===
                                    actionSettings["entityIdInput"]
                                ) {
                                    logMessage(
                                        "Updating state for " + result.entity_id
                                    );

                                    if (result.state === "on") {
                                        // on, make it blue
                                        mainCanvasContext.fillStyle = "#1976D2";
                                    } else {
                                        // off, make it red
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
                    }
                } else {
                    // other HA message, log it
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
                // wait 10 seconds and try to reconnect
                if (homeAssistantConnectionState == ConnectionState.CONNECTED) {
                    logMessage(
                        "We were connected and all of a sudden disconnected, need to retry in 30 seconds"
                    );
                    homeAssistantConnectionState =
                        ConnectionState.NEED_RECONNECT;
                    setTimeout(function () {
                        requestGlobalSettings(inPluginUUID);
                    }, 30000);
                } else if (
                    homeAssistantConnectionState ==
                    ConnectionState.NEED_RECONNECT
                ) {
                    logMessage(
                        "Still not connected, need to retry in 30 seconds"
                    );
                    setTimeout(function () {
                        requestGlobalSettings(inPluginUUID);
                    }, 30000);
                } else if (
                    homeAssistantConnectionState ==
                    ConnectionState.NOT_CONNECTED
                ) {
                    logMessage(
                        "First connection failed, need to retry in 15 seconds"
                    );
                    setTimeout(function () {
                        requestGlobalSettings(inPluginUUID);
                    }, 15000);
                }
            };

            // If at least one action is active
            if (Object.keys(actions).length > 0) {
                // Refresh the cache
                cache.update();
            }
        } else if (event == "didReceiveSettings") {
            logStreamDeckEvent(inEvent.data);
            var settings = jsonPayload["settings"];

            // Set settings
            if (context in actions) {
                actions[context].setSettings(settings);
            }

            // Refresh the cache
            cache.update();
        } else if (event == "propertyInspectorDidAppear") {
            logStreamDeckEvent(inEvent.data);
            // Send cache to PI
            sendToPropertyInspector(action, context, cache.data);
        }
    };
}
