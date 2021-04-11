var globalSettings = {};

setUpGlobalSettingsElements();

const test = document.getElementById("test");
test.addEventListener("click", function (e) {
    logMessage("Testing using global settings");
    logMessage(globalSettings);
    var address = "";
    if (globalSettings.hasOwnProperty("encrypted") && globalSettings.encrypted == true) {
        address = `https://${globalSettings.homeAssistantAddress}/api/`;
    } else {
        address = `http://${globalSettings.homeAssistantAddress}/api/`;
    }
    const request = new XMLHttpRequest();
    request.open("GET", address);
    request.setRequestHeader("Authorization", `Bearer ${globalSettings.accessToken}`);
    request.setRequestHeader("Content-Type", "application/json");
    request.onerror = function (e) {
        logMessage("Error during test");
        logMessage(e);
        const results = document.getElementById("results");
        results.style = "color:red";
        results.innerHTML = "Failed to connect";
    };

    function sendGlobalSettings() {
        logMessage("Sending global settings to property inspector");
        window.opener.sendCredentialsToPropertyInspector({
            command: PropertyInspectorCommands.UPDATE_GLOBAL_SETTINGS,
            data: globalSettings,
        });
    }
    
    request.onload = function () {
        if (request.readyState === request.DONE) {
            logMessage("Got test results");
            logMessage(request);
            const results = document.getElementById("results");
            if (request.status === 200 || request.status == 201) {
                results.style = "color:green";
                results.innerHTML = "Success";
                sendGlobalSettings();
            } else if (request.status === 401) {
                results.style = "color:red";
                results.innerHTML = "Invalid Access Token";
            } else if (request.status === 404) {
                results.style = "color:red";
                results.innerHTML = "Invalid Address";
            } else {
                results.style = "color:red";
                results.innerHTML = "Failed to connect";
            }
        }
    };
    request.send(null);
});

window.addEventListener(
    "message",
    function (propertyInspectorMessage) {
        logMessage("Received posted message");
        handleMessage(propertyInspectorMessage.data);
    },
    false
);

function handleMessage(propertyInspectorMessage) {
    logMessage("Received message from property inspector");
    logMessage(propertyInspectorMessage);

    const command = propertyInspectorMessage["command"];
    const data = propertyInspectorMessage["data"];
    if (command == CredentialsCommands.UPDATE_ELEMENTS) {
        globalSettings = data;
        updateElementsFromGlobalSettings();
    }
}

function updateElementsFromGlobalSettings() {
    logMessage("Updating UI using global settings");
    logMessage(globalSettings);
    var homeAssistantAddress = document.getElementById("homeAssistantAddress");
    var encrypted = document.getElementById("encrypted");
    var accessToken = document.getElementById("accessToken");

    if (globalSettings.homeAssistantAddress != undefined) {
        homeAssistantAddress.value = globalSettings.homeAssistantAddress;
    }
    if (globalSettings.encrypted != undefined) {
        encrypted.checked = globalSettings.encrypted;
    }
    if (globalSettings.accessToken != undefined) {
        accessToken.value = globalSettings.accessToken;
    }
}

function setUpGlobalSettingsElements() {
    logMessage("Setting up event listeners for global settings parameters");
    var homeAssistantAddress = document.getElementById("homeAssistantAddress");
    var encrypted = document.getElementById("encrypted");
    var accessToken = document.getElementById("accessToken");
    homeAssistantAddress.addEventListener("change", function (inEvent) {
        logMessage("Received updated HA address");
        logMessage(inEvent);
        var value = inEvent.target.value;
        globalSettings.homeAssistantAddress = value;
    });

    encrypted.addEventListener("click", function (inEvent) {
        logMessage("Received updated encryption settings");
        logMessage(inEvent);
        var checked = inEvent.target.checked;
        globalSettings.encrypted = checked;
    });

    accessToken.addEventListener("change", function (inEvent) {
        logMessage("Received updated access token");
        logMessage(inEvent);
        var value = inEvent.target.value;
        globalSettings.accessToken = value;
    });

    
}
