/* global $CC, Utils, $SD */

var homeAssistantWebsocket;
var currentMessageId = 1;
var homeAssistantEvents = ELGEvents.eventEmitter();

$SD.on("connected", (jsonObj) => connected(jsonObj));

function connected(jsn) {
    console.log("connected: " + JSON.stringify(jsn));

    $SD.on(
        "ca.barraco.carlo.homeassistant.action.toggle.willAppear",
        (jsonObj) => action.onWillAppear(jsonObj)
    );
    $SD.on(
        "ca.barraco.carlo.homeassistant.action.toggle.willDisappear",
        (jsonObj) => action.onWillDisappear(jsonObj)
    );
    $SD.on("ca.barraco.carlo.homeassistant.action.toggle.keyUp", (jsonObj) =>
        action.onKeyUp(jsonObj)
    );
    $SD.on(
        "ca.barraco.carlo.homeassistant.action.toggle.sendToPlugin",
        (jsonObj) => action.onSendToPlugin(jsonObj)
    );
    $SD.on(
        "ca.barraco.carlo.homeassistant.action.toggle.didReceiveSettings",
        (jsonObj) => action.onDidReceiveSettings(jsonObj)
    );
    $SD.on(
        "ca.barraco.carlo.homeassistant.action.toggle.propertyInspectorDidAppear",
        (jsonObj) => {
            console.log(
                "%c%s",
                "color: white; background: black; font-size: 13px;",
                "[app.js]propertyInspectorDidAppear:"
            );
        }
    );
    $SD.on(
        "ca.barraco.carlo.homeassistant.action.toggle.propertyInspectorDidDisappear",
        (jsonObj) => {
            console.log(
                "%c%s",
                "color: white; background: red; font-size: 13px;",
                "[app.js]propertyInspectorDidDisappear:"
            );
        }
    );
}

const action = {
    settings: {},

    onDidReceiveSettings: function (jsn) {
        console.log("onDidReceiveSettings: " + JSON.stringify(jsn));
        this.settings = Utils.getProp(jsn, "payload.settings", {});
    },

    onWillAppear: function (jsn) {
        console.log("onWillAppear: " + JSON.stringify(jsn));
        if (homeAssistantWebsocket == null || homeAssistantWebsocket.isclosed) {
            homeAssistantWebsocket = new WebSocket(
                `wss://${jsn.payload.settings.homeAssistantAddress}/api/websocket`
            );
            homeAssistantWebsocket.onopen = function () {
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
                console.log("onmessage: " + JSON.stringify(e.data));
                const data = JSON.parse(e.data);
                const eventType = data.event.event_type;
                homeAssistantEvents.emit(eventType, data);
            };

            homeAssistantEvents.on("state_changed", (data) => {
                const entityIdInput = this.settings.entityIdInput;
                if (data.event.data.entity_id === entityIdInput) {
                    $SD.api.setTitle(
                        jsn.context,
                        "" + data.event.data.new_state.state
                    );
                }
            });
        }

        this.settings = jsn.payload.settings;
    },

    onWillDisappear: function (jsn) {
        console.log("onWillDisappear: " + JSON.stringify(jsn));
        homeAssistantWebsocket.close();
        homeAssistantWebsocket = null;
    },

    onKeyUp: function (jsn) {
        console.log("onKeyUp: " + JSON.stringify(jsn));
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
        console.log("onSendToPlugin: " + JSON.stringify(jsn));
        const sdpi_collection = Utils.getProp(
            jsn,
            "payload.sdpi_collection",
            {}
        );

        if (sdpi_collection.value && sdpi_collection.value !== undefined) {
            console.log(
                `Setting value for ${sdpi_collection.key} to ${sdpi_collection.value}`
            );
            this.settings[sdpi_collection.key] = sdpi_collection.value;
            $SD.api.setSettings(jsn.context, this.settings);
        }
    },

    saveSettings: function (jsn, sdpi_collection) {
        console.log("saveSettings:", jsn);
    },

    logStuff: function (inJsonData, caller, tagColor) {
        console.log(
            "%c%s",
            `color: white; background: ${tagColor || "grey"}; font-size: 15px;`,
            `[app.js]logStuff from: ${caller}`
        );
    },
};
