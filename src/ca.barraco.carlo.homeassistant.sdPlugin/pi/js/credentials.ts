import { logMessage } from "../../lib/logging.js";
import { appStore, type GlobalSettings } from "../../lib/globals.js";
import {
    PropertyInspectorCommands,
    CredentialsCommands,
    type CredentialsCommand,
    type PropertyInspectorCommand,
} from "../../lib/enums.js";

setUpGlobalSettingsElements();

const testButton = document.getElementById("test") as HTMLButtonElement | null;
testButton?.addEventListener("click", function () {
    const settings = appStore.getState().globalSettings;
    if (!settings.homeAssistantAddress || !settings.accessToken) {
        logMessage("Home Assistant address or access token missing");
        return;
    }

    logMessage("Testing using global settings");
    logMessage(settings);
    const protocol = settings.encrypted ? "https" : "http";
    const address = `${protocol}://${settings.homeAssistantAddress}/api/`;

    const request = new XMLHttpRequest();
    request.open("GET", address);
    request.setRequestHeader("Authorization", `Bearer ${settings.accessToken}`);
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
    (results as HTMLElement).style.color = color;
    results.textContent = message;
}

function sendGlobalSettings(): void {
    if (!window.opener || typeof window.opener.sendCredentialsToPropertyInspector !== "function") {
        return;
    }
    logMessage("Sending global settings to property inspector");
    window.opener.sendCredentialsToPropertyInspector({
        command: PropertyInspectorCommands.UPDATE_GLOBAL_SETTINGS,
        data: appStore.getState().globalSettings,
    });
}

function handleMessage(message: { command: CredentialsCommand; data: GlobalSettings }): void {
    logMessage("Received message from property inspector");
    logMessage(message);

    if (message.command === CredentialsCommands.UPDATE_ELEMENTS) {
        appStore.dispatch({ type: "SET_GLOBAL_SETTINGS", settings: message.data });
        updateElementsFromGlobalSettings();
    }
}

function updateElementsFromGlobalSettings(): void {
    logMessage("Updating UI using global settings");
    logMessage(appStore.getState().globalSettings);

    const homeAssistantAddress = document.getElementById("homeAssistantAddress") as HTMLInputElement | null;
    const encrypted = document.getElementById("encrypted") as HTMLInputElement | null;
    const accessToken = document.getElementById("accessToken") as HTMLInputElement | null;
    const settings = appStore.getState().globalSettings;

    if (homeAssistantAddress && settings.homeAssistantAddress) {
        homeAssistantAddress.value = settings.homeAssistantAddress;
    }
    if (encrypted && typeof settings.encrypted === "boolean") {
        encrypted.checked = settings.encrypted;
    }
    if (accessToken && settings.accessToken) {
        accessToken.value = settings.accessToken;
    }
}

function setUpGlobalSettingsElements(): void {
    logMessage("Setting up event listeners for global settings parameters");
    const homeAssistantAddress = document.getElementById("homeAssistantAddress") as HTMLInputElement | null;
    const encrypted = document.getElementById("encrypted") as HTMLInputElement | null;
    const accessToken = document.getElementById("accessToken") as HTMLInputElement | null;

    homeAssistantAddress?.addEventListener("change", function (event) {
        const value = (event.target as HTMLInputElement).value;
        updateSettings({ homeAssistantAddress: value });
    });

    encrypted?.addEventListener("click", function (event) {
        const checked = (event.target as HTMLInputElement).checked;
        updateSettings({ encrypted: checked });
    });

    accessToken?.addEventListener("change", function (event) {
        const value = (event.target as HTMLInputElement).value;
        updateSettings({ accessToken: value });
    });
}

function updateSettings(patch: Partial<GlobalSettings>): void {
    const current = appStore.getState().globalSettings;
    appStore.dispatch({
        type: "SET_GLOBAL_SETTINGS",
        settings: {
            ...current,
            ...patch,
        },
    });
}
