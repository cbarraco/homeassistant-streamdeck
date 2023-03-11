var streamDeckWebSocket = null;
var globalSettings = {};
var settings = {};

var homeAssistantCache = {
    entities: {},
    services: {},
};

var credentialsWindow = null;
var pluginUUID = null;

// Property inspector entry point
function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
    var info = JSON.parse(inInfo);
    var language = info["application"]["language"];

    pluginUUID = inUUID;

    var actionInfo = JSON.parse(inActionInfo);
    logStreamDeckEvent(actionInfo);
    settings = actionInfo["payload"]["settings"];
    var action = actionInfo["action"];
    var context = actionInfo["context"];

    // Open the web socket to Stream Deck
    streamDeckWebSocket = new WebSocket("ws://127.0.0.1:" + inPort);

    // WebSocket is connected, send message
    streamDeckWebSocket.onopen = function () {
        registerPluginOrPI(inRegisterEvent, inUUID);
        requestGlobalSettings(inUUID);
        sendToPlugin(action, inUUID, {
            command: PluginCommands.REQUEST_CACHE,
        });
    };

    var actionPI = null;
    logMessage("Creating actionPI of type " + action);
    if (action == ActionType.TOGGLE_SWITCH) {
        actionPI = new ToggleSwitchActionPI(inUUID, actionInfo);
    } else if (action == ActionType.CALL_SERVICE) {
        actionPI = new CallServiceActionPI(inUUID, actionInfo);
    } else if (action == ActionType.TOGGLE_LIGHT) {
        actionPI = new ToggleLightActionPI(inUUID, actionInfo);
    } else if (action == ActionType.SET_LIGHT_COLOR){
        actionPI = new SetLightColorActionPI(inUUID, actionInfo);
    }
    actionPI.setUp();

    const enterCredentials = document.getElementById("enterCredentials");
    enterCredentials.addEventListener("click", function () {
        credentialsWindow = window.open("credentials.html", "Enter Credentials");
        logMessage("Sending global settings to credentials window");
        credentialsWindow.addEventListener("DOMContentLoaded", function (e) {
            credentialsWindow.postMessage({
                command: CredentialsCommands.UPDATE_ELEMENTS,
                data: globalSettings,
            });
        });
    });

    streamDeckWebSocket.onmessage = function (streamDeckMessage) {
        var streamDeckMessageData = JSON.parse(streamDeckMessage.data);
        var event = streamDeckMessageData["event"];
        var payload = streamDeckMessageData["payload"];

        if (event == "didReceiveGlobalSettings") {
            logStreamDeckEvent(streamDeckMessage);
            globalSettings = payload["settings"];
            if (credentialsWindow != null) {
                logMessage("Sending global settings to credentials window");
                credentialsWindow.postMessage({
                    command: CredentialsCommands.UPDATE_ELEMENTS,
                    data: globalSettings,
                });
            }
        } else if (event == "didReceiveSettings") {
            logStreamDeckEvent(streamDeckMessage);
            settings = payload["settings"];
            logMessage("Updating based on new settings")
            actionPI.update(homeAssistantCache);
        } else if (event == "sendToPropertyInspector") {
            logStreamDeckEvent(streamDeckMessage);
            const command = payload["command"];
            if (command == PropertyInspectorCommands.UPDATE_CACHE) {
                logMessage("Performing cache update");
                homeAssistantCache = payload["data"];
                actionPI.update(homeAssistantCache);
            }
        }
    };
}

// remotely invoked in credentials.js
function sendCredentialsToPropertyInspector(message) {
    logMessage("Received message from credentials window");
    logMessage(message);
    const command = message["command"];
    const data = message["data"];
    if (command == PropertyInspectorCommands.UPDATE_GLOBAL_SETTINGS) {
        logMessage("Updating global settings");
        globalSettings = data;
        saveGlobalSettings(pluginUUID);
    }
}
