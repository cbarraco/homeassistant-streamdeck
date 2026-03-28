let homeAssistantWebsocket: WebSocket | null = null;
let homeAssistantConnectionState: ConnectionStateValue = ConnectionState.DONT_KNOW;
let homeAssistantMessageId = 0;
let reconnectTimeout: number | null = null;

const lastMessageId = {
    fetchStates: -1,
    fetchServices: -1,
};

let mainCanvas: HTMLCanvasElement | null = null;
let mainCanvasContext: CanvasRenderingContext2D | null = null;

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

interface HomeAssistantEventMessage {
    type: string;
    id: number;
    result?: unknown;
    event?: {
        data: {
            entity_id: string;
            new_state: HomeAssistantEntity;
        };
    };
}

const connectElgatoStreamDeckSocketPlugin = (
    inPort: string,
    inPluginUUID: string,
    inRegisterEvent: string,
    inInfo: string
): void => {
    logStreamDeckEvent(inInfo);

    const actions: ActionRegistry = {};

    mainCanvas = document.getElementById("mainCanvas") as HTMLCanvasElement | null;
    mainCanvasContext = mainCanvas?.getContext("2d") ?? null;

    streamDeckWebSocket = new WebSocket(`ws://127.0.0.1:${inPort}`);

    streamDeckWebSocket.onopen = function () {
        registerPluginOrPI(inRegisterEvent, inPluginUUID);
        requestGlobalSettings(inPluginUUID);
    };

    streamDeckWebSocket.onmessage = function (event) {
        logStreamDeckEvent(event.data);
        const message = JSON.parse(event.data) as StreamDeckEventMessage;
        const payload = message.payload ?? {};
        const settings = (payload.settings ?? {}) as ActionSettings;

        if (message.event === "keyDown") {
            const registeredAction = actions[message.context];
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
            if (!actions[message.context]) {
                const instance = createActionInstance(message.action, message.context, settings);
                if (instance && message.action) {
                    actions[message.context] = {
                        type: message.action,
                        instance,
                    };
                }
            }

            if (homeAssistantConnectionState === ConnectionState.CONNECTED) {
                fetchStates();
            }
            return;
        }

        if (message.event === "willDisappear") {
            delete actions[message.context];
            return;
        }

        if (message.event === "didReceiveGlobalSettings") {
            globalSettings = settings as GlobalSettings;
            connectToHomeAssistant(actions, inPluginUUID);
            return;
        }

        if (message.event === "didReceiveSettings") {
            const registeredAction = actions[message.context];
            if (registeredAction) {
                registeredAction.instance.onSettingsUpdate(settings);
            }
            return;
        }

        if (message.event === "sendToPlugin") {
            const command = payload.command as PluginCommand | undefined;
            if (!command) {
                return;
            }

            if (command === PluginCommands.REQUEST_RECONNECT) {
                if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout);
                    reconnectTimeout = null;
                }
                requestGlobalSettings(inPluginUUID);
            } else if (command === PluginCommands.REQUEST_CACHE_UPDATE) {
                const registeredAction = actions[message.context];
                if (registeredAction) {
                    sendCacheUpdateToPropertyInspector(registeredAction, message.context);
                }
            }
            return;
        }

        if (message.event === "propertyInspectorDidAppear") {
            if (homeAssistantConnectionState === ConnectionState.CONNECTED) {
                fetchStates();
                fetchServices();
                broadcastCacheUpdates(actions);
            }
            return;
        }
    };

    function connectToHomeAssistant(actionRegistry: ActionRegistry, pluginUUID: string): void {
        if (!globalSettings.homeAssistantAddress || !globalSettings.accessToken) {
            logMessage("All the required settings weren't filled in");
            return;
        }

        homeAssistantConnectionState = ConnectionState.NOT_CONNECTED;

        if (homeAssistantWebsocket) {
            homeAssistantWebsocket.close();
            homeAssistantWebsocket = null;
        }

        const protocol = globalSettings.encrypted ? "wss" : "ws";
        const webSocketAddress = `${protocol}://${globalSettings.homeAssistantAddress}/api/websocket`;

        try {
            homeAssistantWebsocket = new WebSocket(webSocketAddress);
        } catch (error) {
            logMessage("Couldn't connect to HA, probably invalid address");
            logMessage(error);
            homeAssistantConnectionState = ConnectionState.INVALID_ADDRESS;
            return;
        }

        homeAssistantWebsocket.onopen = function () {
            logMessage("Opened connection to HA");
            sendAccessToken();
        };

        homeAssistantWebsocket.onmessage = function (event) {
            const data = JSON.parse(event.data) as HomeAssistantEventMessage;
            const eventType = data.type;

            if (eventType === "event" && data.event) {
                handleStateChange(actionRegistry, data.event.data.entity_id, data.event.data.new_state);
            } else if (eventType === "auth_invalid") {
                handleInvalidAccessToken(data);
            } else if (eventType === "auth_ok") {
                logHomeAssistantEvent(data);
                homeAssistantConnectionState = ConnectionState.CONNECTED;
                if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout);
                    reconnectTimeout = null;
                }
                fetchStates();
                fetchServices();
                subscribeToStateChanges();
            } else if (eventType === "result") {
                logHomeAssistantEvent(data);
                if (data.id === lastMessageId.fetchStates && Array.isArray(data.result)) {
                    updateEntitiesCache(actionRegistry, data.result as HomeAssistantEntity[]);
                } else if (data.id === lastMessageId.fetchServices && data.result && typeof data.result === "object") {
                    updateServicesCache(actionRegistry, data.result as Record<string, Record<string, unknown>>);
                }
            } else {
                logHomeAssistantEvent(data);
            }
        };

        homeAssistantWebsocket.onerror = function (event) {
            logHomeAssistantEvent(event);
            homeAssistantWebsocket?.close();
        };

        homeAssistantWebsocket.onclose = function (event) {
            logMessage("WebSocket closed");
            logHomeAssistantEvent(event);
            homeAssistantWebsocket = null;

            let tryAgain = false;
            if (homeAssistantConnectionState === ConnectionState.CONNECTED) {
                logMessage("We were connected and suddenly disconnected, retry in 30 seconds");
                homeAssistantConnectionState = ConnectionState.NEED_RECONNECT;
                tryAgain = true;
            } else if (homeAssistantConnectionState === ConnectionState.NEED_RECONNECT) {
                logMessage("Still not connected, retry in 30 seconds");
                tryAgain = true;
            } else if (
                homeAssistantConnectionState === ConnectionState.NOT_CONNECTED ||
                homeAssistantConnectionState === ConnectionState.INVALID_ADDRESS
            ) {
                logMessage("First connection failed, retry in 30 seconds");
                tryAgain = true;
            }

            if (tryAgain) {
                if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout);
                }
                reconnectTimeout = window.setTimeout(function () {
                    requestGlobalSettings(pluginUUID);
                }, 30000);
            }
        };
    }

    function sendCacheUpdateToPropertyInspector(actionEntry: RegisteredAction, context: string): void {
        sendToPropertyInspector(actionEntry.type, context, {
            command: PropertyInspectorCommands.UPDATE_CACHE,
            data: homeAssistantCache,
        });
    }

    function broadcastCacheUpdates(actionRegistry: ActionRegistry): void {
        Object.entries(actionRegistry).forEach(([context, entry]) => {
            sendCacheUpdateToPropertyInspector(entry, context);
        });
    }

    function updateEntitiesCache(actionRegistry: ActionRegistry, results: HomeAssistantEntity[]): void {
        homeAssistantCache.entities = {};

        results.forEach((result) => {
            const entityId = result.entity_id;
            const type = entityId.split(".")[0];
            if (!homeAssistantCache.entities[type]) {
                homeAssistantCache.entities[type] = [];
            }
            homeAssistantCache.entities[type].push(result);
            handleStateChange(actionRegistry, entityId, result);
        });

        broadcastCacheUpdates(actionRegistry);
        logMessage(homeAssistantCache.entities);
    }

    function updateServicesCache(
        actionRegistry: ActionRegistry,
        results: Record<string, Record<string, unknown>>
    ): void {
        homeAssistantCache.services = {};
        Object.keys(results).forEach((domain) => {
            const services = Object.keys(results[domain]);
            homeAssistantCache.services[domain] = services.map((service) => `${domain}.${service}`);
        });

        broadcastCacheUpdates(actionRegistry);
        logMessage(homeAssistantCache.services);
    }

    function handleInvalidAccessToken(data: unknown): void {
        logHomeAssistantEvent(data);
        homeAssistantConnectionState = ConnectionState.INVALID_TOKEN;
        homeAssistantWebsocket?.close();
    }

    function handleStateChange(actionRegistry: ActionRegistry, entityId: string, newState: HomeAssistantEntity): void {
        if (!mainCanvas || !mainCanvasContext) {
            return;
        }

        const canvas = mainCanvas;
        const canvasContext = mainCanvasContext;

        Object.entries(actionRegistry).forEach(([context, entry]) => {
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

    function sendAccessToken(): void {
        if (!homeAssistantWebsocket || !globalSettings.accessToken) {
            return;
        }

        const authMessage = JSON.stringify({
            type: "auth",
            access_token: globalSettings.accessToken,
        });
        homeAssistantWebsocket.send(authMessage);
    }

    function subscribeToStateChanges(): void {
        if (!homeAssistantWebsocket) {
            return;
        }

        const subscribeMessage = JSON.stringify({
            id: ++homeAssistantMessageId,
            type: "subscribe_events",
            event_type: "state_changed",
        });
        homeAssistantWebsocket.send(subscribeMessage);
    }

    function fetchStates(): void {
        if (!homeAssistantWebsocket) {
            return;
        }

        lastMessageId.fetchStates = ++homeAssistantMessageId;
        const fetchMessage = JSON.stringify({
            id: lastMessageId.fetchStates,
            type: "get_states",
        });
        homeAssistantWebsocket.send(fetchMessage);
    }

    function fetchServices(): void {
        if (!homeAssistantWebsocket) {
            return;
        }

        lastMessageId.fetchServices = ++homeAssistantMessageId;
        const fetchMessage = JSON.stringify({
            id: lastMessageId.fetchServices,
            type: "get_services",
        });
        homeAssistantWebsocket.send(fetchMessage);
    }
};

window.connectElgatoStreamDeckSocket = connectElgatoStreamDeckSocketPlugin;

function createActionInstance(
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
