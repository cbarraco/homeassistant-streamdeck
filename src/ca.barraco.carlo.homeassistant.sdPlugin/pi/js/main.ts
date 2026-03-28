import { logStreamDeckEvent, logMessage } from "../../lib/logging.js";
import { appStore, type GlobalSettings, type HomeAssistantCache } from "../../lib/globals.js";
import {
    CredentialsCommands,
    PropertyInspectorCommands,
    PluginCommands,
    ActionType,
    type ActionTypeValue,
    type PropertyInspectorCommand,
} from "../../lib/enums.js";
import { registerPluginOrPI, requestGlobalSettings, saveGlobalSettings, sendToPlugin } from "../../lib/utils.js";
import type { ActionSettings } from "../../plugin/js/action.js";
import { ActionPI, type PropertyInspectorActionInfo } from "./actionPI.js";
import { ToggleSwitchActionPI } from "./actions/toggleSwitchActionPI.js";
import { CallServiceActionPI } from "./actions/callServiceActionPI.js";
import { ToggleLightActionPI } from "./actions/toggleLightActionPI.js";
import { SetLightColorActionPI } from "./actions/setLightColorActionPI.js";

let settings: ActionSettings = {};
let credentialsWindow: Window | null = null;
let pluginUUID: string | null = null;
let actionPI: ActionPI | null = null;

interface StreamDeckPIMessage {
    event: string;
    payload?: {
        settings?: ActionSettings;
        command?: PropertyInspectorCommand;
        data?: HomeAssistantCache;
    };
}

const connectElgatoStreamDeckSocketPI = (
    inPort: string,
    inUUID: string,
    inRegisterEvent: string,
    inInfo: string,
    inActionInfo: string
): void => {
    pluginUUID = inUUID;

    const actionInfo = JSON.parse(inActionInfo) as PropertyInspectorActionInfo;
    logStreamDeckEvent(actionInfo);

    settings = (actionInfo.payload.settings ?? {}) as ActionSettings;
    const action = actionInfo.action;

    const streamDeckSocket = new WebSocket(`ws://127.0.0.1:${inPort}`);
    appStore.dispatch({ type: "SET_STREAM_DECK_SOCKET", socket: streamDeckSocket });

    streamDeckSocket.onopen = function () {
        registerPluginOrPI(inRegisterEvent, inUUID);
        requestGlobalSettings(inUUID);
        sendToPlugin(action, inUUID, {
            command: PluginCommands.REQUEST_CACHE_UPDATE,
        });
    };

    actionPI = createPropertyInspector(action, inUUID, actionInfo);
    actionPI?.setUp();

    const enterCredentials = document.getElementById("enterCredentials") as HTMLButtonElement | null;
    enterCredentials?.addEventListener("click", function () {
        credentialsWindow = window.open("credentials.html", "Enter Credentials");
        if (!credentialsWindow) {
            return;
        }

        logMessage("Sending global settings to credentials window");
        credentialsWindow.addEventListener(
            "DOMContentLoaded",
            function () {
                credentialsWindow?.postMessage({
                    command: CredentialsCommands.UPDATE_ELEMENTS,
                    data: appStore.getState().globalSettings,
                });
            },
            { once: true }
        );
    });

    streamDeckSocket.onmessage = function (streamDeckMessage) {
        logStreamDeckEvent(streamDeckMessage);
        const streamDeckMessageData = JSON.parse(streamDeckMessage.data) as StreamDeckPIMessage;
        const event = streamDeckMessageData.event;
        const payload = streamDeckMessageData.payload ?? {};

        if (event === "didReceiveGlobalSettings") {
            appStore.dispatch({ type: "SET_GLOBAL_SETTINGS", settings: (payload.settings ?? {}) as GlobalSettings });
            if (credentialsWindow) {
                logMessage("Sending global settings to credentials window");
                credentialsWindow.postMessage({
                    command: CredentialsCommands.UPDATE_ELEMENTS,
                    data: appStore.getState().globalSettings,
                });
            }
        } else if (event === "didReceiveSettings") {
            settings = (payload.settings ?? {}) as ActionSettings;
            logMessage("Updating based on new settings");
            actionPI?.setSettings(settings);
            actionPI?.update(appStore.getState().homeAssistantCache);
        } else if (event === "sendToPropertyInspector") {
            const command = payload.command;
            if (command === PropertyInspectorCommands.UPDATE_CACHE && payload.data) {
                logMessage("Updating based on update cache command");
                hydrateCache(payload.data);
                actionPI?.update(appStore.getState().homeAssistantCache);
            }
        }
    };
};

window.connectElgatoStreamDeckSocket = connectElgatoStreamDeckSocketPI as unknown as
    typeof window.connectElgatoStreamDeckSocket;

function createPropertyInspector(
    action: ActionTypeValue,
    uuid: string,
    actionInfo: PropertyInspectorActionInfo
): ActionPI | null {
    logMessage(`Creating actionPI of type ${action}`);
    if (action === ActionType.TOGGLE_SWITCH) {
        return new ToggleSwitchActionPI(uuid, actionInfo);
    }
    if (action === ActionType.CALL_SERVICE) {
        return new CallServiceActionPI(uuid, actionInfo);
    }
    if (action === ActionType.TOGGLE_LIGHT) {
        return new ToggleLightActionPI(uuid, actionInfo);
    }
    if (action === ActionType.SET_LIGHT_COLOR) {
        return new SetLightColorActionPI(uuid, actionInfo);
    }
    logMessage(`Unknown action type for PI: ${action}`);
    return null;
}

export function sendCredentialsToPropertyInspector(message: { command: PropertyInspectorCommand; data: GlobalSettings }): void {
    logMessage("Received message from credentials window");
    logMessage(message);
    if (message.command === PropertyInspectorCommands.UPDATE_GLOBAL_SETTINGS) {
        logMessage("Updating global settings");
        appStore.dispatch({ type: "SET_GLOBAL_SETTINGS", settings: message.data });
        if (pluginUUID) {
            saveGlobalSettings(pluginUUID);
        }
    }
}

window.sendCredentialsToPropertyInspector = sendCredentialsToPropertyInspector;

function hydrateCache(cache: HomeAssistantCache): void {
    appStore.dispatch({
        type: "SET_ENTITIES_CACHE",
        entities: cache.entities ?? {},
    });
    appStore.dispatch({
        type: "SET_SERVICES_CACHE",
        services: cache.services ?? {},
    });
}
