/* global $CC, Utils, $SD */

var homeAssistantWebsocket;
var currentMessageId = 1;
var homeAssistantEvents = ELGEvents.eventEmitter();

$SD.on("connected", (jsonObj) => connected(jsonObj));

function connected(jsn) {
    console.log("connected: " + JSON.stringify(jsn));

    $SD.on("com.elgato.template.action.willAppear", (jsonObj) =>
        action.onWillAppear(jsonObj)
    );
    $SD.on("com.elgato.template.action.willDisappear", (jsonObj) =>
        action.onwillDisappear(jsonObj)
    );
    $SD.on("com.elgato.template.action.keyUp", (jsonObj) =>
        action.onKeyUp(jsonObj)
    );
    $SD.on("com.elgato.template.action.sendToPlugin", (jsonObj) =>
        action.onSendToPlugin(jsonObj)
    );
    $SD.on("com.elgato.template.action.didReceiveSettings", (jsonObj) =>
        action.onDidReceiveSettings(jsonObj)
    );
    $SD.on(
        "com.elgato.template.action.propertyInspectorDidAppear",
        (jsonObj) => {
            console.log(
                "%c%s",
                "color: white; background: black; font-size: 13px;",
                "[app.js]propertyInspectorDidAppear:"
            );
        }
    );
    $SD.on(
        "com.elgato.template.action.propertyInspectorDidDisappear",
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
        if (homeAssistantWebsocket == null) {
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
                const entityIdInput = jsn.payload.settings.entityIdInput;
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
    },

    onKeyUp: function (jsn) {
        console.log("onKeyUp: " + JSON.stringify(jsn));
        const testMessage = `{
            "id": ${currentMessageId++},
            "type": "call_service",
            "domain": "switch",
            "service": "toggle",
            "service_data": {
              "entity_id": "switch.office_lamp_msl120_main_channel"
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
            this.logStuff(
                { [sdpi_collection.key]: sdpi_collection.value },
                "onSendToPlugin",
                "fuchsia"
            );
        }
    },

    saveSettings: function (jsn, sdpi_collection) {
        console.log("saveSettings:", jsn);
        if (
            sdpi_collection.hasOwnProperty("key") &&
            sdpi_collection.key != ""
        ) {
            if (sdpi_collection.value && sdpi_collection.value !== undefined) {
                this.settings[sdpi_collection.key] = sdpi_collection.value;
                console.log("setSettings....", this.settings);
                $SD.api.setSettings(jsn.context, this.settings);
            }
        }
    },

    logStuff: function (inJsonData, caller, tagColor) {
        console.log(
            "%c%s",
            `color: white; background: ${tagColor || "grey"}; font-size: 15px;`,
            `[app.js]logStuff from: ${caller}`
        );
    },
};
