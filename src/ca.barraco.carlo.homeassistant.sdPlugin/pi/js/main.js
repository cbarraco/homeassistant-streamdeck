// Global web socket
var streamDeckWebSocket = null;

// Global plugin settings
var globalSettings = {};

// Global settings
var settings = {};

// Global cache
var cache = {};

var knownEntityIds = [];

// Setup the websocket and handle communication
function connectElgatoStreamDeckSocket(
    inPort,
    inUUID,
    inRegisterEvent,
    inInfo,
    inActionInfo
) {
    // Parse parameter from string to object
    var actionInfo = JSON.parse(inActionInfo);
    var info = JSON.parse(inInfo);

    // Save global settings
    settings = actionInfo["payload"]["settings"];

    // Retrieve language
    var language = info["application"]["language"];

    // Retrieve action identifier
    var action = actionInfo["action"];

    // Open the web socket to Stream Deck
    streamDeckWebSocket = new WebSocket("ws://127.0.0.1:" + inPort);

    // WebSocket is connected, send message
    streamDeckWebSocket.onopen = function () {
        // Register property inspector to Stream Deck
        registerPluginOrPI(inRegisterEvent, inUUID);

        // Request the global settings of the plugin
        requestGlobalSettings(inUUID);
    };

    var homeAssistantAddress = document.getElementById("homeAssistantAddress");
    homeAssistantAddress.value = globalSettings.homeAssistantAddress;
    homeAssistantAddress.addEventListener("change", onHomeAssistantAddress);

    var ssl = document.getElementById("ssl");
    ssl.checked = globalSettings.ssl;
    ssl.addEventListener("click", onSsl);

    var accessToken = document.getElementById("accessToken");
    accessToken.value = globalSettings.accessToken;
    accessToken.addEventListener("change", onAccessToken);

    var entityIdInput = document.getElementById("entityIdInput");
    entityIdInput.value = settings.entityIdInput;
    entityIdInput.addEventListener("input", onEntityIdInput);

    // Create actions
    // if (action == "com.elgato.twitch.chatmessage") {
    //     var pi = new ChatMessagePI(inUUID, language);
    // } else if (action == "com.elgato.twitch.subchat") {
    //     var pi = new SubChatPI(inUUID, language);
    // }

    function onHomeAssistantAddress(inEvent) {
        var value = inEvent.target.value;
        globalSettings.homeAssistantAddress = value;
        saveGlobalSettings(inUUID);
        // TODO supply some data to be explicit
        sendToPlugin(action, inUUID, {});
    }

    function onSsl(inEvent) {
        var checked = inEvent.target.checked;
        globalSettings.ssl = checked;
        saveGlobalSettings(inUUID);
        // TODO supply some data to be explicit
        sendToPlugin(action, inUUID, {});
    }

    function onAccessToken(inEvent) {
        var value = inEvent.target.value;
        globalSettings.accessToken = value;
        saveGlobalSettings(inUUID);
        // TODO supply some data to be explicit
        sendToPlugin(action, inUUID, {});
    }

    function onEntityIdInput(inEvent) {
        var value = inEvent.target.value;
        settings.entityIdInput = value;
        saveSettings(action, inUUID, settings);
    }

    streamDeckWebSocket.onmessage = function (evt) {
        // Received message from Stream Deck
        var jsonObj = JSON.parse(evt.data);
        var event = jsonObj["event"];
        var jsonPayload = jsonObj["payload"];

        if (event == "didReceiveGlobalSettings") {
            // Set global plugin settings
            globalSettings = jsonPayload["settings"];

            var homeAssistantAddress = document.getElementById(
                "homeAssistantAddress"
            );
            homeAssistantAddress.value = globalSettings.homeAssistantAddress;
            ssl.checked = globalSettings.ssl;
            var accessToken = document.getElementById("accessToken");
            accessToken.value = globalSettings.accessToken;
        } else if (event == "didReceiveSettings") {
            // Save global settings after default was set
            settings = jsonPayload["settings"];

            var entityIdInput = document.getElementById("entityIdInput");
            entityIdInput.value = settings.entityIdInput;
        } else if (event == "sendToPropertyInspector") {
            logStreamDeckEvent(evt);
            knownEntityIds = jsonPayload["entityUpdate"];
        }
    };
}
