/* global $CC, Utils, $SD */

var homeAssistantWebsocket;
var currentMessageId = 1;
var homeAssistantEvents = ELGEvents.eventEmitter();

$SD.on("connected", (jsonObj) => connected(jsonObj));

function connected(jsn) {
    logStreamDeckEvent(jsn);
    
    $SD.on(
        "ca.barraco.carlo.homeassistant.action.toggle.willAppear",
        (jsonObj) => toggleAction.onWillAppear(jsonObj)
    );
    $SD.on(
        "ca.barraco.carlo.homeassistant.action.toggle.willDisappear",
        (jsonObj) => toggleAction.onWillDisappear(jsonObj)
    );
    $SD.on("ca.barraco.carlo.homeassistant.action.toggle.keyUp", (jsonObj) =>
        toggleAction.onKeyUp(jsonObj)
    );
    $SD.on(
        "ca.barraco.carlo.homeassistant.action.toggle.sendToPlugin",
        (jsonObj) => toggleAction.onSendToPlugin(jsonObj)
    );
    $SD.on(
        "ca.barraco.carlo.homeassistant.action.toggle.didReceiveSettings",
        (jsonObj) => toggleAction.onDidReceiveSettings(jsonObj)
    );
    $SD.on(
        "ca.barraco.carlo.homeassistant.action.toggle.didReceiveGlobalSettings",
        (jsonObj) => toggleAction.onDidReceiveGlobalSettings(jsonObj)
    );
    $SD.on(
        "ca.barraco.carlo.homeassistant.action.toggle.propertyInspectorDidAppear",
        (jsonObj) => logStreamDeckEvent(jsonObj)
    );
    $SD.on(
        "ca.barraco.carlo.homeassistant.action.toggle.propertyInspectorDidDisappear",
        (jsonObj) => logStreamDeckEvent(jsonObj)
    );
}

const toggleAction = {
    settings: {},

    onDidReceiveGlobalSettings: function (jsn) {
        logStreamDeckEvent(jsn);
    },

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
        homeAssistantWebsocket.close();
        homeAssistantWebsocket = null;
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
