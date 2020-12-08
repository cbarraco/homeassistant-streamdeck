// Global web socket
var websocket = null;

// Global cache
var cache = {};

// Global settings
var globalSettings = {};

// Global Home Assistant socket
var homeAssistantWebsocket = null;

var currentMessageId = 1;

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
        logStreamDeckEvent(inEvent.data);

        // Parse parameter from string to object
        var jsonObj = JSON.parse(inEvent.data);

        // Extract payload information
        var event = jsonObj["event"];
        var action = jsonObj["action"];
        var context = jsonObj["context"];
        var jsonPayload = jsonObj["payload"];

        // Key up event
        if (event == "keyUp") {
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
        } else if (event == "willDisappear") {
            // Remove current instance from array
            if (context in actions) {
                delete actions[context];
            }
        } else if (event == "didReceiveGlobalSettings") {
            // Set global settings
            globalSettings = jsonPayload["settings"];

            if (homeAssistantWebsocket) {
                homeAssistantWebsocket.close();
            }

            homeAssistantWebsocket = new WebSocket(
                `wss://${globalSettings.homeAssistantAddress}/api/websocket`
            );

            homeAssistantWebsocket.onopen = function () {
                // authenticate
                const authMessage = `{"type": "auth", "access_token": "${globalSettings.accessToken}"}`;
                homeAssistantWebsocket.send(authMessage);

                // subscribe to state change events
                const subscribeMessage = `{
                    "id": ${currentMessageId++},
                    "type": "subscribe_events",
                    "event_type": "state_changed"
                }`;
                homeAssistantWebsocket.send(subscribeMessage);
            };

            homeAssistantWebsocket.onmessage = function (e) {
                const data = JSON.parse(e.data);
                const eventType = data.type;

                if (eventType === "event") {
                    const newState = data.event.data.new_state.state;
                    for (context in actions) {
                        var actionSettings = actions[context].getSettings();
                        if (
                            data.event.data.entity_id ===
                            actionSettings["entityIdInput"]
                        ) {
                            logHomeAssistantEvent(data);
                            const mainCanvas = document.getElementById(
                                "mainCanvas"
                            );
                            var ctx = mainCanvas.getContext("2d");

                            if (newState === "on") {
                                ctx.fillStyle = "#1976D2";
                                ctx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
                            } else {
                                ctx.fillStyle = "#FF5252";
                                ctx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
                            }
                            ctx.drawImage();
                            setImage(context, mainCanvas.toDataURL());
                        }
                    }
                } else {
                    logHomeAssistantEvent(data);
                }
            };

            // If at least one action is active
            if (Object.keys(actions).length > 0) {
                // Refresh the cache
                cache.update();
            }
        } else if (event == "didReceiveSettings") {
            var settings = jsonPayload["settings"];

            // Set settings
            if (context in actions) {
                actions[context].setSettings(settings);
            }

            // Refresh the cache
            cache.update();
        } else if (event == "propertyInspectorDidAppear") {
            // Send cache to PI
            sendToPropertyInspector(action, context, cache.data);
        } else if (event == "sendToPlugin") {
            requestGlobalSettings(inPluginUUID);
        }
    };
}
