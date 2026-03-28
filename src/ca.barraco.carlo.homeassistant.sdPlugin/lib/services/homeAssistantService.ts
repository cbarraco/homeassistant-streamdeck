import { appStore, type GlobalSettings, type HomeAssistantEntity } from "../globals.js";
import { ConnectionState, type ConnectionStateValue } from "../enums.js";
import { logHomeAssistantEvent, logMessage } from "../logging.js";

interface HomeAssistantEventMessage {
    type: string;
    id?: number;
    result?: unknown;
    event?: {
        data: {
            entity_id: string;
            new_state: HomeAssistantEntity;
        };
    };
}

export interface HomeAssistantServiceHandlers {
    onAuthenticated?: () => void;
    onEntitiesReceived?: (entities: HomeAssistantEntity[]) => void;
    onServicesReceived?: (services: Record<string, Record<string, unknown>>) => void;
    onStateChanged?: (entityId: string, newState: HomeAssistantEntity) => void;
    onConnectionStateChange?: (state: ConnectionStateValue) => void;
    onConnectionClosed?: (state: ConnectionStateValue) => void;
}

interface LastMessageId {
    fetchStates: number;
    fetchServices: number;
}

export class HomeAssistantService {
    private websocket: WebSocket | null = null;
    private messageId = 0;
    private handlers: HomeAssistantServiceHandlers | null = null;
    private lastMessageId: LastMessageId = {
        fetchStates: -1,
        fetchServices: -1,
    };

    connect(settings: GlobalSettings, handlers: HomeAssistantServiceHandlers): void {
        this.disconnect();
        this.handlers = handlers;

        if (!settings.homeAssistantAddress || !settings.accessToken) {
            logMessage("All the required settings weren't filled in");
            this.updateConnectionState(ConnectionState.NOT_CONNECTED);
            return;
        }

        const protocol = settings.encrypted ? "wss" : "ws";
        const webSocketAddress = `${protocol}://${settings.homeAssistantAddress}/api/websocket`;

        try {
            this.websocket = new WebSocket(webSocketAddress);
        } catch (error) {
            logMessage("Couldn't connect to Home Assistant, probably invalid address");
            logMessage(error);
            this.updateConnectionState(ConnectionState.INVALID_ADDRESS);
            return;
        }

        this.updateConnectionState(ConnectionState.NOT_CONNECTED);

        this.websocket.onopen = () => {
            logMessage("Opened connection to Home Assistant");
            this.sendAccessToken(settings.accessToken as string);
        };

        this.websocket.onmessage = (event) => {
            const data = JSON.parse(event.data) as HomeAssistantEventMessage;
            this.handleMessage(data);
        };

        this.websocket.onerror = (event) => {
            logHomeAssistantEvent(event);
            this.websocket?.close();
        };

        this.websocket.onclose = (event) => {
            logMessage("Home Assistant websocket closed");
            logHomeAssistantEvent(event);
            this.websocket = null;
            const previousState = appStore.getState().connectionState;
            const nextState =
                previousState === ConnectionState.CONNECTED
                    ? ConnectionState.NEED_RECONNECT
                    : previousState ?? ConnectionState.NOT_CONNECTED;
            this.updateConnectionState(nextState);
            this.handlers?.onConnectionClosed?.(nextState);
        };
    }

    disconnect(): void {
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
    }

    isConnected(): boolean {
        return this.websocket !== null && appStore.getState().connectionState === ConnectionState.CONNECTED;
    }

    getNextMessageId(): number {
        this.messageId += 1;
        return this.messageId;
    }

    sendMessage(payload: Record<string, unknown>): void {
        if (!this.websocket) {
            throw new Error("Home Assistant websocket is not connected.");
        }
        this.websocket.send(JSON.stringify(payload));
    }

    fetchStates(): void {
        if (!this.websocket) {
            return;
        }
        this.lastMessageId.fetchStates = this.getNextMessageId();
        this.sendMessage({
            id: this.lastMessageId.fetchStates,
            type: "get_states",
        });
    }

    fetchServices(): void {
        if (!this.websocket) {
            return;
        }
        this.lastMessageId.fetchServices = this.getNextMessageId();
        this.sendMessage({
            id: this.lastMessageId.fetchServices,
            type: "get_services",
        });
    }

    subscribeToStateChanges(): void {
        if (!this.websocket) {
            return;
        }
        this.sendMessage({
            id: this.getNextMessageId(),
            type: "subscribe_events",
            event_type: "state_changed",
        });
    }

    private handleMessage(data: HomeAssistantEventMessage): void {
        const eventType = data.type;

        if (eventType === "event" && data.event) {
            const entityId = data.event.data.entity_id;
            const newState = data.event.data.new_state;
            this.handlers?.onStateChanged?.(entityId, newState);
            return;
        }

        if (eventType === "auth_invalid") {
            logHomeAssistantEvent(data);
            this.updateConnectionState(ConnectionState.INVALID_TOKEN);
            this.websocket?.close();
            return;
        }

        if (eventType === "auth_ok") {
            logHomeAssistantEvent(data);
            this.updateConnectionState(ConnectionState.CONNECTED);
            this.handlers?.onAuthenticated?.();
            this.fetchStates();
            this.fetchServices();
            this.subscribeToStateChanges();
            return;
        }

        if (eventType === "result") {
            logHomeAssistantEvent(data);
            if (data.id === this.lastMessageId.fetchStates && Array.isArray(data.result)) {
                this.handlers?.onEntitiesReceived?.(data.result as HomeAssistantEntity[]);
                return;
            }
            if (data.id === this.lastMessageId.fetchServices && data.result && typeof data.result === "object") {
                this.handlers?.onServicesReceived?.(data.result as Record<string, Record<string, unknown>>);
                return;
            }
        }

        logHomeAssistantEvent(data);
    }

    private sendAccessToken(accessToken: string): void {
        if (!this.websocket) {
            return;
        }

        const authMessage = {
            type: "auth",
            access_token: accessToken,
        };
        this.websocket.send(JSON.stringify(authMessage));
    }

    private updateConnectionState(connectionState: ConnectionStateValue): void {
        appStore.dispatch({ type: "SET_CONNECTION_STATE", connectionState });
        this.handlers?.onConnectionStateChange?.(connectionState);
    }
}

export const homeAssistantService = new HomeAssistantService();
