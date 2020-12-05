/* global $CC, Utils, $SD */

var homeAssistantWebsocket;
var currentMessageId = 1;

$SD.on("connected", (jsonObj) => connected(jsonObj));

function connected(jsn) {
    homeAssistantWebsocket = new WebSocket(`wss://${ip}/api/websocket`);

    $SD.on("com.elgato.template.action.willAppear", (jsonObj) =>
        action.onWillAppear(jsonObj)
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
        console.log(
            "%c%s",
            "color: white; background: red; font-size: 15px;",
            "[app.js]onDidReceiveSettings:"
        );

        this.settings = Utils.getProp(jsn, "payload.settings", {});
        this.logStuff(this.settings, "onDidReceiveSettings", "orange");
        this.setTitle(jsn);
    },

    onWillAppear: function (jsn) {
        console.log(
            "You can cache your settings in 'onWillAppear'",
            jsn.payload.settings
        );

        var self = this;
        homeAssistantWebsocket.onopen = function () {
            // authenticate
            const authMessage = `{"type": "auth","access_token": "${authtoken}"}`;
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
            var data = JSON.parse(e.data);
            if (
                data.event.data.entity_id ==
                "switch.office_lamp_msl120_main_channel"
            ) {
                $SD.api.setTitle(
                    jsn.context,
                    "" + data.event.data.new_state.state
                );
            }
        };

        this.settings = jsn.payload.settings;
    },

    onKeyUp: function (jsn) {
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

    setTitle: function (jsn) {
        if (this.settings && this.settings.hasOwnProperty("mynameinput")) {
            console.log(
                "watch the key on your StreamDeck - it got a new title...",
                this.settings.mynameinput
            );
            $SD.api.setTitle(jsn.context, this.settings.mynameinput);
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
