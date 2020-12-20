var streamDeckWebSocket = null;
var globalSettings = {};
var settings = {};

var homeAssistantCache = {
    entities: [],
    services: null
};

// Property inspector entry point
function connectElgatoStreamDeckSocket(
    inPort,
    inUUID,
    inRegisterEvent,
    inInfo,
    inActionInfo
) {
    var info = JSON.parse(inInfo);
    var language = info["application"]["language"];

    var actionInfo = JSON.parse(inActionInfo);
    settings = actionInfo["payload"]["settings"];
    var action = actionInfo["action"];

    // Open the web socket to Stream Deck
    streamDeckWebSocket = new WebSocket("ws://127.0.0.1:" + inPort);

    // WebSocket is connected, send message
    streamDeckWebSocket.onopen = function () {
        registerPluginOrPI(inRegisterEvent, inUUID);
        requestGlobalSettings(inUUID);
    };

    var homeAssistantAddress = document.getElementById("homeAssistantAddress");
    var ssl = document.getElementById("ssl");
    var accessToken = document.getElementById("accessToken");
    setUpGlobalSettingsElements(homeAssistantAddress, ssl, accessToken);
    updateElementsFromGlobalSettings(homeAssistantAddress, ssl, accessToken);

    var entityId = document.getElementById("entityId");
    entityId.value = settings.entityId;
    entityId.addEventListener("input", function (inEvent) {
        var value = inEvent.target.value;
        settings.entityId = value;
        saveSettings(action, inUUID, settings);
    });

    // Create actions
    // if (action == "com.elgato.twitch.chatmessage") {
    //     var pi = new ChatMessagePI(inUUID, language);
    // } else if (action == "com.elgato.twitch.subchat") {
    //     var pi = new SubChatPI(inUUID, language);
    // }

    streamDeckWebSocket.onmessage = function (evt) {
        var jsonObj = JSON.parse(evt.data);
        var event = jsonObj["event"];
        var jsonPayload = jsonObj["payload"];

        logStreamDeckEvent(jsonObj);

        if (event == "didReceiveGlobalSettings") {
            globalSettings = jsonPayload["settings"];

            var homeAssistantAddress = document.getElementById(
                "homeAssistantAddress"
            );
            var ssl = document.getElementById("ssl");
            var accessToken = document.getElementById("accessToken");

            updateElementsFromGlobalSettings(
                homeAssistantAddress,
                ssl,
                accessToken
            );
        } else if (event == "didReceiveSettings") {
            settings = jsonPayload["settings"];
            var entityId = document.getElementById("entityId");
            populateEntityOptions(entityId);
            entityId.value = settings.entityId;
        } else if (event == "sendToPropertyInspector") {
            logStreamDeckEvent(evt);
            homeAssistantCache.entities = jsonPayload["entityUpdate"];
            var entityId = document.getElementById("entityId");
            populateEntityOptions(entityId);
            entityId.value = settings.entityId;
        }
    };

    function populateEntityOptions(entityId) {
        entityId.innerHTML = "";
        homeAssistantCache.entities.forEach((element) => {
            if (element.startsWith("switch.")) {
                const entityOption = document.createElement("option");
                entityOption.value = element;
                entityOption.innerHTML = element;
                entityId.appendChild(entityOption);
            }
        });
    }

    function updateElementsFromGlobalSettings(
        homeAssistantAddress,
        ssl,
        accessToken
    ) {
        homeAssistantAddress.value = globalSettings.homeAssistantAddress;
        ssl.checked = globalSettings.ssl;
        accessToken.value = globalSettings.accessToken;
    }

    function setUpGlobalSettingsElements(
        homeAssistantAddress,
        ssl,
        accessToken
    ) {
        homeAssistantAddress.addEventListener("change", function (inEvent) {
            var value = inEvent.target.value;
            globalSettings.homeAssistantAddress = value;
            saveGlobalSettings(inUUID);
            sendToPlugin(action, inUUID, {});
        });

        ssl.addEventListener("click", function (inEvent) {
            var checked = inEvent.target.checked;
            globalSettings.ssl = checked;
            saveGlobalSettings(inUUID);
            sendToPlugin(action, inUUID, {});
        });

        accessToken.addEventListener("change", function (inEvent) {
            var value = inEvent.target.value;
            globalSettings.accessToken = value;
            saveGlobalSettings(inUUID);
            sendToPlugin(action, inUUID, {});
        });
    }
}
