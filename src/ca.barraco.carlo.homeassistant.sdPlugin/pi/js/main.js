var streamDeckWebSocket = null;
var globalSettings = {};
var settings = {};

var knownEntityIds = [];

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

    var entityIdInput = document.getElementById("entityIdInput");
    entityIdInput.value = settings.entityIdInput;
    entityIdInput.addEventListener("input", function (inEvent) {
        var value = inEvent.target.value;
        settings.entityIdInput = value;
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
            var entityIdInput = document.getElementById("entityIdInput");
            populateEntityOptions(entityIdInput);
            entityIdInput.value = settings.entityIdInput;
        } else if (event == "sendToPropertyInspector") {
            logStreamDeckEvent(evt);
            knownEntityIds = jsonPayload["entityUpdate"];
            var entityIdInput = document.getElementById("entityIdInput");
            populateEntityOptions(entityIdInput);
            entityIdInput.value = settings.entityIdInput;
        }
    };

    function populateEntityOptions(entityIdInput) {
        entityIdInput.innerHTML = "";
        knownEntityIds.forEach((element) => {
            if (element.startsWith("switch.")) {
                const entityOption = document.createElement("option");
                entityOption.value = element;
                entityOption.innerHTML = element;
                entityIdInput.appendChild(entityOption);
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
