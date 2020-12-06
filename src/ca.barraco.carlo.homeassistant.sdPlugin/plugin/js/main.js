// Global web socket
var websocket = null;

// Global cache
var cache = {};

// Global settings
var globalSettings = {
    accessToken: haToken,
    homeAssistantAddress: haAddress,
};

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
    homeAssistantWebsocket = new WebSocket(`wss://${haAddress}/api/websocket`);

    homeAssistantWebsocket.onopen = function () {
        // authenticate
        const authMessage = `{"type": "auth", "access_token": "${haToken}"}`;
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
            if (
                data.event.data.entity_id ===
                "switch.office_lamp_msl120_main_channel"
            ) {
                // only want to log relevant events
                logHomeAssistantEvent(data);
                const newState = data.event.data.new_state.state;
                if (newState === "on") {
                    setState(jsn.context, 0);
                } else if (newState === "off") {
                    setState(jsn.context, 1);
                }
            }
        } else {
            logHomeAssistantEvent(data);
        }
    };

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
                    if (actions[inContext] instanceof ChatMessageAction) {
                        var action = "com.elgato.twitch.chatmessage";
                    } else if (actions[inContext] instanceof SubChatAction) {
                        var action = "com.elgato.twitch.subchat";
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

        logStreamDeckEvent(inEvent.data);

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

            const entityIdInput = data.settings.entityIdInput;
            const testMessage = `{
            "id": ${currentMessageId++},
            "type": "call_service",
            "domain": "switch",
            "service": "toggle",
            "service_data": {
              "entity_id": "${entityIdInput}"
            }
          }`;
            homeAssistantWebsocket.send(testMessage);
        } else if (event == "willAppear") {
            var settings = jsonPayload["settings"];

            // If this is the first visible action
            if (Object.keys(actions).length == 0) {
                // Start polling
                cache.update();
            }

            // Add current instance is not in actions array
            if (!(context in actions)) {
                // Add current instance to array
                if (action == "com.elgato.twitch.chatmessage") {
                    actions[context] = new ChatMessageAction(context, settings);
                } else if (action == "com.elgato.twitch.subchat") {
                    actions[context] = new SubChatAction(context, settings);
                }
            }
        } else if (event == "willDisappear") {
            // Remove current instance from array
            if (context in actions) {
                if (action == "com.elgato.twitch.viewers") {
                    actions[context].stopTimer();
                }
                delete actions[context];
            }
        } else if (event == "didReceiveGlobalSettings") {
            // Set global settings
            globalSettings = jsonPayload["settings"];

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
        }
    };
}

const toggleAction = {
    settings: {},

    onDidReceiveSettings: function (jsn) {
        logStreamDeckEvent(jsn);
        this.settings = Utils.getProp(jsn, "payload.settings", {});
    },

    onWillAppear: function (jsn) {
        logStreamDeckEvent(jsn);

        if (homeAssistantWebsocket == null || homeAssistantWebsocket.isclosed) {
            homeAssistantWebsocket = new WebSocket(
                `wss://${jsn.payload.settings.homeAssistantAddress}/api/websocket`
            );
            homeAssistantWebsocket.onopen = function () {
                logMessage("connected to HA, authenticating");
                // authenticate
                const authMessage = `{"type": "auth","access_token": "${jsn.payload.settings.accessToken}"}`;
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

                // only want to log relevant events
                if (eventType !== "event") {
                    logHomeAssistantEvent(data);
                }

                homeAssistantEvents.emit(eventType, data);
            };

            homeAssistantEvents.on("event", (data) => {
                const entityIdInput = this.settings.entityIdInput;
                if (data.event.data.entity_id === entityIdInput) {
                    logHomeAssistantEvent(data);
                    const newState = data.event.data.new_state.state;
                    if (newState === "on") {
                        $SD.api.setState(jsn.context, 0);
                    } else if (newState === "off") {
                        $SD.api.setState(jsn.context, 1);
                    }
                }
            });
        }

        this.settings = jsn.payload.settings;
    },

    onWillDisappear: function (jsn) {
        logStreamDeckEvent(jsn);
    },

    onKeyUp: function (jsn) {
        logStreamDeckEvent(jsn);
        const entityIdInput = jsn.payload.settings.entityIdInput;
        const testMessage = `{
            "id": ${currentMessageId++},
            "type": "call_service",
            "domain": "switch",
            "service": "toggle",
            "service_data": {
              "entity_id": "${entityIdInput}"
            }
          }`;
        homeAssistantWebsocket.send(testMessage);
    },

    onSendToPlugin: function (jsn) {
        logStreamDeckEvent(jsn);
        const sdpi_collection = Utils.getProp(
            jsn,
            "payload.sdpi_collection",
            {}
        );

        if (sdpi_collection.value && sdpi_collection.value !== undefined) {
            logMessage(
                `Setting value for ${sdpi_collection.key} to ${sdpi_collection.value}`,
                "magenta"
            );
            this.settings[sdpi_collection.key] = sdpi_collection.value;
            $SD.api.setSettings(jsn.context, this.settings);
        }
    },
};
