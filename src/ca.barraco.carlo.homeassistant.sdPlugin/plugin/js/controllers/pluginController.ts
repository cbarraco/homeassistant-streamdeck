import { homeAssistantService } from "../../../lib/services/homeAssistantService.js";
import { rgbToHex, miredToHex } from "../../../lib/colorUtils.js";
import {
    appStore,
    type GlobalSettings,
    type HomeAssistantEntity,
    type HomeAssistantCache,
} from "../../../lib/globals.js";
import {
    ActionType,
    ConnectionState,
    PluginCommands,
    PropertyInspectorCommands,
    type ActionTypeValue,
    type PluginCommand,
} from "../../../lib/enums.js";
import { logStreamDeckEvent, logMessage } from "../../../lib/logging.js";
import { registerPluginOrPI, requestGlobalSettings, sendToPropertyInspector, setImage } from "../../../lib/utils.js";
import type { ActionSettings, KeyDownData } from "../action.js";
import { Action } from "../action.js";
import { CallServiceAction } from "../actions/callServiceAction.js";
import { SetLightColorAction } from "../actions/setLightColorAction.js";
import { ToggleLightAction } from "../actions/toggleLightAction.js";
import { ToggleSwitchAction } from "../actions/toggleSwitchAction.js";

interface StreamDeckCoordinates {
    column: number;
    row: number;
}

interface StreamDeckMessagePayload {
    settings?: ActionSettings;
    coordinates?: StreamDeckCoordinates;
    userDesiredState?: number;
    state?: number;
    command?: PluginCommand;
    data?: unknown;
}

interface StreamDeckEventMessage {
    event: string;
    action?: ActionTypeValue;
    context: string;
    payload?: StreamDeckMessagePayload;
}

interface RegisteredAction {
    type: ActionTypeValue;
    instance: Action;
}

type ActionRegistry = Record<string, RegisteredAction>;

export class PluginController {
    private actions: ActionRegistry = {};
    private reconnectTimeout: number | null = null;
    private pluginUUID: string | null = null;
    private mainCanvas: HTMLCanvasElement | null = null;
    private mainCanvasContext: CanvasRenderingContext2D | null = null;

    initialize(inPort: string, pluginUUID: string, inRegisterEvent: string, inInfo: string): void {
        logStreamDeckEvent(inInfo);
        this.pluginUUID = pluginUUID;
        this.actions = {};
        this.mainCanvas = document.getElementById("mainCanvas") as HTMLCanvasElement | null;
        this.mainCanvasContext = this.mainCanvas?.getContext("2d") ?? null;

        const socket = new WebSocket(`ws://127.0.0.1:${inPort}`);
        appStore.dispatch({ type: "SET_STREAM_DECK_SOCKET", socket });

        socket.onopen = () => {
            registerPluginOrPI(inRegisterEvent, pluginUUID);
            requestGlobalSettings(pluginUUID);
        };

        socket.onmessage = (event) => {
            logStreamDeckEvent(event.data);
            const message = JSON.parse(event.data) as StreamDeckEventMessage;
            this.handleStreamDeckMessage(message, pluginUUID);
        };
    }

    private handleStreamDeckMessage(message: StreamDeckEventMessage, pluginUUID: string): void {
        const payload = message.payload ?? {};
        const settings = (payload.settings ?? {}) as ActionSettings;

        if (message.event === "keyDown") {
            const registeredAction = this.actions[message.context];
            if (registeredAction) {
                const data: KeyDownData = {
                    context: message.context,
                    settings,
                    coordinates: payload.coordinates,
                    userDesiredState: payload.userDesiredState,
                    state: payload.state,
                };
                registeredAction.instance.onKeyDown(data);
            }
            return;
        }

        if (message.event === "willAppear") {
            if (!this.actions[message.context]) {
                const instance = this.createActionInstance(message.action, message.context, settings);
                if (instance && message.action) {
                    this.actions[message.context] = {
                        type: message.action,
                        instance,
                    };
                }
            }

            if (appStore.getState().connectionState === ConnectionState.CONNECTED) {
                homeAssistantService.fetchStates();
            }
            return;
        }

        if (message.event === "willDisappear") {
            delete this.actions[message.context];
            return;
        }

        if (message.event === "didReceiveGlobalSettings") {
            appStore.dispatch({ type: "SET_GLOBAL_SETTINGS", settings: settings as GlobalSettings });
            this.connectToHomeAssistant(pluginUUID);
            return;
        }

        if (message.event === "didReceiveSettings") {
            const registeredAction = this.actions[message.context];
            if (registeredAction) {
                registeredAction.instance.onSettingsUpdate(settings);
            }
            return;
        }

        if (message.event === "sendToPlugin") {
            this.handlePluginCommand(message, payload);
            return;
        }

        if (message.event === "propertyInspectorDidAppear") {
            if (appStore.getState().connectionState === ConnectionState.CONNECTED) {
                homeAssistantService.fetchStates();
                homeAssistantService.fetchServices();
                this.broadcastCacheUpdates();
            }
            return;
        }
    }

    private handlePluginCommand(message: StreamDeckEventMessage, payload: StreamDeckMessagePayload): void {
        const command = payload.command as PluginCommand | undefined;
        if (!command) {
            return;
        }

        if (command === PluginCommands.REQUEST_RECONNECT) {
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }
            if (this.pluginUUID) {
                requestGlobalSettings(this.pluginUUID);
            }
        } else if (command === PluginCommands.REQUEST_CACHE_UPDATE) {
            const registeredAction = this.actions[message.context];
            if (registeredAction) {
                this.sendCacheUpdateToPropertyInspector(registeredAction, message.context);
            }
        }
    }

    private connectToHomeAssistant(pluginUUID: string): void {
        const settings = appStore.getState().globalSettings;
        homeAssistantService.connect(settings, {
            onAuthenticated: () => {
                this.clearReconnectTimeout();
            },
            onEntitiesReceived: (entities) => this.updateEntitiesCache(entities),
            onServicesReceived: (services) => this.updateServicesCache(services),
            onStateChanged: (entityId, newState) => this.handleStateChange(entityId, newState),
            onConnectionStateChange: (state) => {
                if (state === ConnectionState.CONNECTED) {
                    this.clearReconnectTimeout();
                }
            },
            onConnectionClosed: () => {
                this.scheduleReconnect(pluginUUID);
            },
        });
    }

    private scheduleReconnect(pluginUUID: string): void {
        if (!pluginUUID) {
            return;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        this.reconnectTimeout = window.setTimeout(() => {
            requestGlobalSettings(pluginUUID);
        }, 30000);
    }

    private clearReconnectTimeout(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    private sendCacheUpdateToPropertyInspector(actionEntry: RegisteredAction, context: string): void {
        sendToPropertyInspector(actionEntry.type, context, {
            command: PropertyInspectorCommands.UPDATE_CACHE,
            data: appStore.getState().homeAssistantCache,
        });
    }

    private broadcastCacheUpdates(): void {
        Object.entries(this.actions).forEach(([context, entry]) => {
            this.sendCacheUpdateToPropertyInspector(entry, context);
        });
    }

    private updateEntitiesCache(results: HomeAssistantEntity[]): void {
        const entities: HomeAssistantCache["entities"] = {};

        results.forEach((result) => {
            const entityId = result.entity_id;
            const type = entityId.split(".")[0];
            if (!entities[type]) {
                entities[type] = [];
            }
            entities[type].push(result);
            this.handleStateChange(entityId, result);
        });

        appStore.dispatch({ type: "SET_ENTITIES_CACHE", entities });
        this.broadcastCacheUpdates();
        logMessage(appStore.getState().homeAssistantCache.entities);
    }

    private updateServicesCache(results: Record<string, Record<string, unknown>>): void {
        const services: HomeAssistantCache["services"] = {};
        Object.keys(results).forEach((domain) => {
            const domainServices = Object.keys(results[domain]);
            services[domain] = domainServices.map((service) => `${domain}.${service}`);
        });
        appStore.dispatch({ type: "SET_SERVICES_CACHE", services });
        this.broadcastCacheUpdates();
        logMessage(appStore.getState().homeAssistantCache.services);
    }

    private handleStateChange(entityId: string, newState: HomeAssistantEntity): void {
        if (!this.mainCanvas || !this.mainCanvasContext) {
            return;
        }

        const canvas = this.mainCanvas;
        const canvasContext = this.mainCanvasContext;

        Object.entries(this.actions).forEach(([context, entry]) => {
            const actionSettings = entry.instance.getSettings();
            if (entry.instance instanceof ToggleSwitchAction && actionSettings.entityId === entityId) {
                logMessage(`Updating state of switch ${entityId} to ${newState.state}`);
                canvasContext.fillStyle = newState.state === "on" ? "#1976D2" : "#FF5252";
                canvasContext.fillRect(0, 0, canvas.width, canvas.height);
                setImage(context, canvas.toDataURL());
            } else if (entry.instance instanceof ToggleLightAction && actionSettings.entityId === entityId) {
                logMessage(`Updating state of light ${entityId}`);
                    if (newState.state === "on") {
                        if (newState.attributes.color_mode === "hs" && Array.isArray(newState.attributes.rgb_color)) {
                            const [red, green, blue] = newState.attributes.rgb_color as number[];
                            canvasContext.fillStyle = rgbToHex(red, green, blue);
                        } else if (newState.attributes.color_mode === "color_temp" && newState.attributes.color_temp) {
                            const hex = miredToHex(Number(newState.attributes.color_temp));
                            canvasContext.fillStyle = hex;
                        }
                    } else {
                        canvasContext.fillStyle = "#000000";
                    }
                canvasContext.fillRect(0, 0, canvas.width, canvas.height);
                setImage(context, canvas.toDataURL());
            }
        });
    }

    private createActionInstance(
        actionType: ActionTypeValue | undefined,
        context: string,
        settings: ActionSettings
    ): Action | null {
        if (!actionType) {
            logMessage("Received action without a valid type");
            return null;
        }

        if (actionType === ActionType.TOGGLE_SWITCH) {
            return new ToggleSwitchAction(context, settings);
        }
        if (actionType === ActionType.CALL_SERVICE) {
            return new CallServiceAction(context, settings);
        }
        if (actionType === ActionType.TOGGLE_LIGHT) {
            return new ToggleLightAction(context, settings);
        }
        if (actionType === ActionType.SET_LIGHT_COLOR) {
            return new SetLightColorAction(context, settings);
        }

        logMessage(`Unknown action type: ${actionType}`);
        return null;
    }
}
