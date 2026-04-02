import { logStreamDeckEvent, logMessage } from "./logging";
import { appStore, type GlobalSettings, type HomeAssistantCache } from "./globals";
import { CredentialsCommands } from "./credentials/commands";
import { PropertyInspectorCommands, type PropertyInspectorCommand } from "./commands";
import { PluginCommands } from "../shared/commands";
import { ActionType, type ActionTypeValue } from "../shared/actionTypes";
import { registerPluginOrPI, requestGlobalSettings, saveGlobalSettings, sendToPlugin } from "./utils";
import type { ActionSettings } from "../shared/types";
import { ActionPI, type PropertyInspectorActionInfo } from "./action";
import { ToggleSwitchPIAction as ToggleSwitchActionPI } from "./panels/toggleSwitch";
import { CallServicePIAction as CallServiceActionPI } from "./panels/callService";
import { ToggleLightPIAction as ToggleLightActionPI } from "./panels/toggleLight";
import { SetLightColorPIAction as SetLightColorActionPI } from "./panels/setLightColor";
import { StepLightBrightnessPIAction as StepLightBrightnessActionPI } from "./panels/stepLightBrightness";
import { CameraFeedPIAction as CameraFeedActionPI } from "./panels/cameraFeed";
import { MediaPlayerPIAction as MediaPlayerActionPI } from "./panels/mediaPlayer";
import { TriggerAutomationPIAction as TriggerAutomationActionPI } from "./panels/triggerAutomation";
import { RunScriptPIAction as RunScriptActionPI } from "./panels/runScript";
import { AlarmControlPanelPIAction as AlarmControlPanelActionPI } from "./panels/alarmControlPanel";
import { DisplayStatePIAction as DisplayStateActionPI } from "./panels/displayState";
import { ControlCoverPIAction as ControlCoverActionPI } from "./panels/controlCover";
import { ClimateControlPIAction as ClimateControlActionPI } from "./panels/climateControl";
import { LockControlPIAction as LockControlActionPI } from "./panels/lockControl";
import { TimerControlPIAction as TimerControlActionPI } from "./panels/timerControl";
import { FanControlPIAction as FanControlActionPI } from "./panels/fanControl";
import { DisplayAttributePIAction as DisplayAttributeActionPI } from "./panels/displayAttribute";
import { WeatherDisplayPIAction as WeatherDisplayActionPI } from "./panels/weatherDisplay";
import { VacuumControlPIAction as VacuumControlActionPI } from "./panels/vacuumControl";

interface StreamDeckPIMessage {
    event: string;
    payload?: {
        settings?: ActionSettings;
        command?: PropertyInspectorCommand;
        data?: HomeAssistantCache;
    };
}

export class PropertyInspectorController {
    private settings: ActionSettings = {};
    private credentialsWindow: Window | null = null;
    private pluginUUID: string | null = null;
    private actionPI: ActionPI | null = null;

    initialize(
        inPort: string,
        inUUID: string,
        inRegisterEvent: string,
        inInfo: string,
        inActionInfo: string
    ): void {
        this.pluginUUID = inUUID;

        const actionInfo = JSON.parse(inActionInfo) as PropertyInspectorActionInfo;
        logStreamDeckEvent(actionInfo);

        this.settings = (actionInfo.payload.settings ?? {}) as ActionSettings;
        const action = actionInfo.action;

        const streamDeckSocket = new WebSocket(`ws://127.0.0.1:${inPort}`);
        appStore.dispatch({ type: "SET_STREAM_DECK_SOCKET", socket: streamDeckSocket });

        streamDeckSocket.onopen = () => {
            registerPluginOrPI(inRegisterEvent, inUUID);
            requestGlobalSettings(inUUID);
            sendToPlugin(action, inUUID, {
                command: PluginCommands.REQUEST_CACHE_UPDATE,
            });
        };

        this.actionPI = this.createPropertyInspector(action, inUUID, actionInfo);
        this.actionPI?.setUp();

        this.setUpCredentialsButton();

        streamDeckSocket.onmessage = (streamDeckMessage) => {
            logStreamDeckEvent(streamDeckMessage);
            const streamDeckMessageData = JSON.parse(streamDeckMessage.data) as StreamDeckPIMessage;
            this.handleStreamDeckMessage(streamDeckMessageData);
        };
    }

    private handleStreamDeckMessage(streamDeckMessageData: StreamDeckPIMessage): void {
        const event = streamDeckMessageData.event;
        const payload = streamDeckMessageData.payload ?? {};

        if (event === "didReceiveGlobalSettings") {
            appStore.dispatch({ type: "SET_GLOBAL_SETTINGS", settings: (payload.settings ?? {}) as GlobalSettings });
            if (this.credentialsWindow) {
                logMessage("Sending global settings to credentials window");
                this.credentialsWindow.postMessage({
                    command: CredentialsCommands.UPDATE_ELEMENTS,
                    data: appStore.getState().globalSettings,
                });
            }
            return;
        }

        if (event === "didReceiveSettings") {
            this.settings = (payload.settings ?? {}) as ActionSettings;
            logMessage("Updating based on new settings");
            this.actionPI?.setSettings(this.settings);
            this.actionPI?.update(appStore.getState().homeAssistantCache);
            return;
        }

        if (event === "sendToPropertyInspector") {
            const command = payload.command;
            if (command === PropertyInspectorCommands.UPDATE_CACHE && payload.data) {
                logMessage("Updating based on update cache command");
                this.hydrateCache(payload.data);
                this.actionPI?.update(appStore.getState().homeAssistantCache);
            }
        }
    }

    private setUpCredentialsButton(): void {
        const enterCredentials = document.getElementById("enterCredentials") as HTMLButtonElement | null;
        enterCredentials?.addEventListener("click", () => {
            this.credentialsWindow = window.open("credentials/index.html", "Enter Credentials");
            if (!this.credentialsWindow) {
                return;
            }

            logMessage("Sending global settings to credentials window");
            this.credentialsWindow.addEventListener(
                "DOMContentLoaded",
                () => {
                    this.credentialsWindow?.postMessage({
                        command: CredentialsCommands.UPDATE_ELEMENTS,
                        data: appStore.getState().globalSettings,
                    });
                },
                { once: true }
            );
        });
    }

    sendCredentialsToPropertyInspector(message: { command: PropertyInspectorCommand; data: GlobalSettings }): void {
        logMessage("Received message from credentials window");
        logMessage(message);
        if (message.command === PropertyInspectorCommands.UPDATE_GLOBAL_SETTINGS) {
            logMessage("Updating global settings");
            appStore.dispatch({ type: "SET_GLOBAL_SETTINGS", settings: message.data });
            if (this.pluginUUID) {
                saveGlobalSettings(this.pluginUUID);
            }
        }
    }

    private createPropertyInspector(
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
        if (action === ActionType.STEP_LIGHT_BRIGHTNESS) {
            return new StepLightBrightnessActionPI(uuid, actionInfo);
        }
        if (action === ActionType.CAMERA_THUMBNAIL) {
            return new CameraFeedActionPI(uuid, actionInfo);
        }
        if (action === ActionType.MEDIA_PLAYER) {
            return new MediaPlayerActionPI(uuid, actionInfo);
        }
        if (action === ActionType.TRIGGER_AUTOMATION) {
            return new TriggerAutomationActionPI(uuid, actionInfo);
        }
        if (action === ActionType.RUN_SCRIPT) {
            return new RunScriptActionPI(uuid, actionInfo);
        }
        if (action === ActionType.ALARM_CONTROL_PANEL) {
            return new AlarmControlPanelActionPI(uuid, actionInfo);
        }
        if (action === ActionType.DISPLAY_STATE) {
            return new DisplayStateActionPI(uuid, actionInfo);
        }
        if (action === ActionType.CONTROL_COVER) {
            return new ControlCoverActionPI(uuid, actionInfo);
        }
        if (action === ActionType.CLIMATE_CONTROL) {
            return new ClimateControlActionPI(uuid, actionInfo);
        }
        if (action === ActionType.LOCK_CONTROL) {
            return new LockControlActionPI(uuid, actionInfo);
        }
        if (action === ActionType.TIMER_CONTROL) {
            return new TimerControlActionPI(uuid, actionInfo);
        }
        if (action === ActionType.FAN_CONTROL) {
            return new FanControlActionPI(uuid, actionInfo);
        }
        if (action === ActionType.DISPLAY_ATTRIBUTE) {
            return new DisplayAttributeActionPI(uuid, actionInfo);
        }
        if (action === ActionType.WEATHER_DISPLAY) {
            return new WeatherDisplayActionPI(uuid, actionInfo);
        }
        if (action === ActionType.VACUUM_CONTROL) {
            return new VacuumControlActionPI(uuid, actionInfo);
        }
        logMessage(`Unknown action type for PI: ${action}`);
        return null;
    }

    private hydrateCache(cache: HomeAssistantCache): void {
        appStore.dispatch({
            type: "SET_ENTITIES_CACHE",
            entities: cache.entities ?? {},
        });
        appStore.dispatch({
            type: "SET_SERVICES_CACHE",
            services: cache.services ?? {},
        });
    }
}

