setUpGlobalSettingsElements();

const testButton = document.getElementById("test") as HTMLButtonElement | null;
testButton?.addEventListener("click", function () {
    if (!globalSettings.homeAssistantAddress || !globalSettings.accessToken) {
        logMessage("Home Assistant address or access token missing");
        return;
    }

    logMessage("Testing using global settings");
    logMessage(globalSettings);
    const protocol = globalSettings.encrypted ? "https" : "http";
    const address = `${protocol}://${globalSettings.homeAssistantAddress}/api/`;

    const request = new XMLHttpRequest();
    request.open("GET", address);
    request.setRequestHeader("Authorization", `Bearer ${globalSettings.accessToken}`);
    request.setRequestHeader("Content-Type", "application/json");

    request.onerror = function (event) {
        logMessage("Error during test");
        logMessage(event);
        updateTestResults("Failed to connect", "red");
    };

    request.onload = function () {
        if (request.readyState === XMLHttpRequest.DONE) {
            logMessage("Got test results");
            logMessage(request);
            if (request.status === 200 || request.status === 201) {
                updateTestResults("Success", "green");
                sendGlobalSettings();
            } else if (request.status === 401) {
                updateTestResults("Invalid Access Token", "red");
            } else if (request.status === 404) {
                updateTestResults("Invalid Address", "red");
            } else {
                updateTestResults("Failed to connect", "red");
            }
        }
    };

    request.send();
});

window.addEventListener(
    "message",
    function (event: MessageEvent<{ command: CredentialsCommand; data: GlobalSettings }>) {
        logMessage("Received posted message");
        handleMessage(event.data);
    },
    false
);

function updateTestResults(message: string, color: string): void {
    const results = document.getElementById("results");
    if (!results) {
        return;
    }
    results.style.color = color;
    results.textContent = message;
}

function sendGlobalSettings(): void {
    if (!window.opener || typeof window.opener.sendCredentialsToPropertyInspector !== "function") {
        return;
    }
    logMessage("Sending global settings to property inspector");
    window.opener.sendCredentialsToPropertyInspector({
        command: PropertyInspectorCommands.UPDATE_GLOBAL_SETTINGS,
        data: globalSettings,
    });
}

function handleMessage(message: { command: CredentialsCommand; data: GlobalSettings }): void {
    logMessage("Received message from property inspector");
    logMessage(message);

    if (message.command === CredentialsCommands.UPDATE_ELEMENTS) {
        globalSettings = message.data;
        updateElementsFromGlobalSettings();
    }
}

function updateElementsFromGlobalSettings(): void {
    logMessage("Updating UI using global settings");
    logMessage(globalSettings);

    const homeAssistantAddress = document.getElementById("homeAssistantAddress") as HTMLInputElement | null;
    const encrypted = document.getElementById("encrypted") as HTMLInputElement | null;
    const accessToken = document.getElementById("accessToken") as HTMLInputElement | null;

    if (homeAssistantAddress && globalSettings.homeAssistantAddress) {
        homeAssistantAddress.value = globalSettings.homeAssistantAddress;
    }
    if (encrypted && typeof globalSettings.encrypted === "boolean") {
        encrypted.checked = globalSettings.encrypted;
    }
    if (accessToken && globalSettings.accessToken) {
        accessToken.value = globalSettings.accessToken;
    }
}

function setUpGlobalSettingsElements(): void {
    logMessage("Setting up event listeners for global settings parameters");
    const homeAssistantAddress = document.getElementById("homeAssistantAddress") as HTMLInputElement | null;
    const encrypted = document.getElementById("encrypted") as HTMLInputElement | null;
    const accessToken = document.getElementById("accessToken") as HTMLInputElement | null;

    homeAssistantAddress?.addEventListener("change", function (event) {
        const value = (event.target as HTMLInputElement).value;
        globalSettings.homeAssistantAddress = value;
    });

    encrypted?.addEventListener("click", function (event) {
        const checked = (event.target as HTMLInputElement).checked;
        globalSettings.encrypted = checked;
    });

    accessToken?.addEventListener("change", function (event) {
        const value = (event.target as HTMLInputElement).value;
        globalSettings.accessToken = value;
    });
}
