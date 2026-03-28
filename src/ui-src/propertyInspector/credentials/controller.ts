import { logMessage } from "../../logging";
import { appStore, type GlobalSettings } from "../../globals";
import { PropertyInspectorCommands, type PropertyInspectorCommand } from "../commands";
import { CredentialsCommands, type CredentialsCommand } from "./commands";

export class CredentialsController {
    initialize(): void {
        this.setUpGlobalSettingsElements();
        this.setUpTestButton();
        window.addEventListener(
            "message",
            (event: MessageEvent<{ command: CredentialsCommand; data: GlobalSettings }>) => {
                logMessage("Received posted message");
                this.handleMessage(event.data);
            }
        );
    }

    private setUpTestButton(): void {
        const testButton = document.getElementById("test") as HTMLButtonElement | null;
        testButton?.addEventListener("click", () => {
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

            request.onerror = (event) => {
                logMessage("Error during test");
                logMessage(event);
                this.updateTestResults("Failed to connect", "red");
            };

            request.onload = () => {
                if (request.readyState === XMLHttpRequest.DONE) {
                    logMessage("Got test results");
                    logMessage(request);
                    if (request.status === 200 || request.status === 201) {
                        this.updateTestResults("Success", "green");
                        this.sendGlobalSettings();
                    } else if (request.status === 401) {
                        this.updateTestResults("Invalid Access Token", "red");
                    } else if (request.status === 404) {
                        this.updateTestResults("Invalid Address", "red");
                    } else {
                        this.updateTestResults("Failed to connect", "red");
                    }
                }
            };

            request.send();
        });
    }

    private updateTestResults(message: string, color: string): void {
        const results = document.getElementById("results");
        if (!results) {
            return;
        }
        (results as HTMLElement).style.color = color;
        results.textContent = message;
    }

    private sendGlobalSettings(): void {
        if (!window.opener || typeof window.opener.sendCredentialsToPropertyInspector !== "function") {
            return;
        }
        logMessage("Sending global settings to property inspector");
        window.opener.sendCredentialsToPropertyInspector({
            command: PropertyInspectorCommands.UPDATE_GLOBAL_SETTINGS,
            data: appStore.getState().globalSettings,
        });
    }

    private handleMessage(message: { command: CredentialsCommand; data: GlobalSettings }): void {
        logMessage("Received message from property inspector");
        logMessage(message);

        if (message.command === CredentialsCommands.UPDATE_ELEMENTS) {
            appStore.dispatch({ type: "SET_GLOBAL_SETTINGS", settings: message.data });
            this.updateElementsFromGlobalSettings();
        }
    }

    private updateElementsFromGlobalSettings(): void {
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

    private setUpGlobalSettingsElements(): void {
        logMessage("Setting up event listeners for global settings parameters");
        const homeAssistantAddress = document.getElementById("homeAssistantAddress") as HTMLInputElement | null;
        const encrypted = document.getElementById("encrypted") as HTMLInputElement | null;
        const accessToken = document.getElementById("accessToken") as HTMLInputElement | null;

        homeAssistantAddress?.addEventListener("change", (event) => {
            const value = (event.target as HTMLInputElement).value;
            this.updateSettings({ homeAssistantAddress: value });
        });

        encrypted?.addEventListener("click", (event) => {
            const checked = (event.target as HTMLInputElement).checked;
            this.updateSettings({ encrypted: checked });
        });

        accessToken?.addEventListener("change", (event) => {
            const value = (event.target as HTMLInputElement).value;
            this.updateSettings({ accessToken: value });
        });
    }

    private updateSettings(patch: Partial<GlobalSettings>): void {
        const current = appStore.getState().globalSettings;
        appStore.dispatch({
            type: "SET_GLOBAL_SETTINGS",
            settings: {
                ...current,
                ...patch,
            },
        });
    }
}

