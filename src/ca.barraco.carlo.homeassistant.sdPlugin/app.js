/* global $CC, Utils, $SD */

var homeAssistantWebsocket;
var currentMessageId = 1;
var homeAssistantEvents = ELGEvents.eventEmitter();

$SD.on('connected', (jsonObj) => connected(jsonObj));

function logData(jsn, tagColor, caller) {
    console.logs(
        "%c%s",
        `color: white; background: ${tagColor || 'red'};`,
        `${caller || arguments.callee.name}: ${JSON.stringify(jsn)}`
    );
}

function logMessage(message, tagColor, caller) {
    console.logs(
        "%c%s",
        `color: white; background: ${tagColor || 'red'};`,
        `${caller || arguments.callee.name}: ${message}`
    );
}

function connected(jsn) {
    logData(jsn);

    $SD.on(
        'ca.barraco.carlo.homeassistant.action.toggle.willAppear',
        (jsonObj) => action.onWillAppear(jsonObj)
    );
    $SD.on(
        'ca.barraco.carlo.homeassistant.action.toggle.willDisappear',
        (jsonObj) => action.onWillDisappear(jsonObj)
    );
    $SD.on('ca.barraco.carlo.homeassistant.action.toggle.keyUp', (jsonObj) =>
        action.onKeyUp(jsonObj)
    );
    $SD.on(
        'ca.barraco.carlo.homeassistant.action.toggle.sendToPlugin',
        (jsonObj) => action.onSendToPlugin(jsonObj)
    );
    $SD.on(
        'ca.barraco.carlo.homeassistant.action.toggle.didReceiveSettings',
        (jsonObj) => action.onDidReceiveSettings(jsonObj)
    );
    $SD.on(
        'ca.barraco.carlo.homeassistant.action.toggle.propertyInspectorDidAppear',
        (jsonObj) => logData(jsonObj)
    );
    $SD.on(
        'ca.barraco.carlo.homeassistant.action.toggle.propertyInspectorDidDisappear',
        (jsonObj) => logData(jsonObj)
    );
}

const action = {
    settings: {},

    onDidReceiveSettings: function (jsn) {
        logData(jsn, 'green');
        this.settings = Utils.getProp(jsn, 'payload.settings', {});
    },

    onWillAppear: function (jsn) {
        logData(jsn, 'blue');
        if (homeAssistantWebsocket == null || homeAssistantWebsocket.isclosed) {
            homeAssistantWebsocket = new WebSocket(
                `wss://${jsn.payload.settings.homeAssistantAddress}/api/websocket`
            );
            homeAssistantWebsocket.onopen = function () {
                logMessage('WebSocket to HA opened, authenticating');
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
                logData(jsn);
                const data = JSON.parse(e.data);
                const eventType = data.event.event_type;
                homeAssistantEvents.emit(eventType, data);
            };

            homeAssistantEvents.on('state_changed', (data) => {
                const entityIdInput = this.settings.entityIdInput;
                if (data.event.data.entity_id === entityIdInput) {
                    $SD.api.setTitle(
                        jsn.context,
                        '' + data.event.data.new_state.state
                    );
                }
            });
        }

        this.settings = jsn.payload.settings;
    },

    onWillDisappear: function (jsn) {
        logData(jsn, 'blue');
        homeAssistantWebsocket.close();
        homeAssistantWebsocket = null;
    },

    onKeyUp: function (jsn) {
        logData(jsn, 'black');
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
        logData(jsn, 'green');
        const sdpi_collection = Utils.getProp(
            jsn,
            'payload.sdpi_collection',
            {}
        );

        if (sdpi_collection.value && sdpi_collection.value !== undefined) {
            logMessage(
                `Setting value for ${sdpi_collection.key} to ${sdpi_collection.value}`,
                'magenta'
            );
            this.settings[sdpi_collection.key] = sdpi_collection.value;
            $SD.api.setSettings(jsn.context, this.settings);
        }
    }
};
