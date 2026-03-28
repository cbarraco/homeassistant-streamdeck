import { EventEmitter } from "node:events";
import WebSocket from "ws";

import type { GlobalSettings, HomeAssistantEntity } from "../../shared/types";
import { ConnectionState, type ConnectionStateValue } from "../state/connectionState";
import { logHomeAssistantEvent, logMessage } from "../logging";

type ServicesPayload = Record<string, Record<string, unknown>>;

type HomeAssistantEvents = {
    connectionState: (state: ConnectionStateValue) => void;
    entities: (entities: HomeAssistantEntity[]) => void;
    services: (services: ServicesPayload) => void;
    stateChanged: (entityId: string, entity: HomeAssistantEntity) => void;
};

interface HomeAssistantMessage {
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

const RECONNECT_DELAY_MS = 30_000;

export class HomeAssistantClient extends EventEmitter {
    private socket: WebSocket | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private settings: GlobalSettings | null = null;
    private messageId = 0;
    private lastMessageIds = {
        fetchStates: -1,
        fetchServices: -1,
    };

    constructor() {
        super();
    }

    override on(event: "connectionState", listener: (state: ConnectionStateValue) => void): this;
    override on(event: "entities", listener: (entities: HomeAssistantEntity[]) => void): this;
    override on(event: "services", listener: (services: ServicesPayload) => void): this;
    override on(event: "stateChanged", listener: (entityId: string, entity: HomeAssistantEntity) => void): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    override on(event: string, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }

    applySettings(settings: GlobalSettings): void {
        this.settings = settings;
        if (!this.hasCredentials(settings)) {
            this.disconnect();
            this.emitConnectionState(ConnectionState.NOT_CONNECTED);
            return;
        }
        this.connect();
    }

    requestReconnect(): void {
        if (this.settings) {
            this.connect();
        }
    }

    isConnected(): boolean {
        return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
    }

    callService(domain: string, service: string, serviceData: Record<string, unknown>): void {
        if (!this.isConnected()) {
            throw new Error("Home Assistant websocket is not connected.");
        }

        const payload = {
            id: this.getNextMessageId(),
            type: "call_service",
            domain,
            service,
            service_data: serviceData,
        };
        this.send(payload);
    }

    sendRawMessage(payload: Record<string, unknown>): void {
        this.send(payload);
    }

    private connect(): void {
        if (!this.settings) {
            return;
        }

        this.clearReconnectTimer();

        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.close();
            this.socket = null;
        }

        const { homeAssistantAddress, accessToken, encrypted } = this.settings;
        if (!this.hasCredentials(this.settings)) {
            logMessage("Home Assistant settings are incomplete; skipping connection.");
            this.emitConnectionState(ConnectionState.NOT_CONNECTED);
            return;
        }

        const protocol = encrypted ? "wss" : "ws";
        const url = `${protocol}://${homeAssistantAddress}/api/websocket`;
        logMessage(`Connecting to Home Assistant at ${url}`);

        try {
            this.socket = new WebSocket(url);
        } catch (error) {
            logMessage("Failed to create websocket connection.");
            logHomeAssistantEvent(error);
            this.emitConnectionState(ConnectionState.INVALID_ADDRESS);
            return;
        }

        this.emitConnectionState(ConnectionState.DONT_KNOW);

        this.socket.on("open", () => {
            logMessage("Home Assistant websocket connected.");
            this.send({
                type: "auth",
                access_token: accessToken,
            });
        });

        this.socket.on("message", (data) => {
            const parsed = JSON.parse(data.toString()) as HomeAssistantMessage;
            this.handleMessage(parsed);
        });

        this.socket.on("close", (code) => {
            logMessage(`Home Assistant websocket closed: code=${code}`);
            this.socket = null;
            this.emitConnectionState(ConnectionState.NEED_RECONNECT);
            this.scheduleReconnect();
        });

        this.socket.on("error", (error) => {
            logHomeAssistantEvent(error);
        });
    }

    private handleMessage(message: HomeAssistantMessage): void {
        const { type } = message;
        if (type === "auth_ok") {
            logMessage("Authenticated with Home Assistant.");
            this.emitConnectionState(ConnectionState.CONNECTED);
            this.fetchStates();
            this.fetchServices();
            this.subscribeToStateChanges();
            return;
        }

        if (type === "auth_invalid") {
            logMessage("Home Assistant rejected the access token.");
            this.emitConnectionState(ConnectionState.INVALID_TOKEN);
            this.socket?.close();
            return;
        }

        if (type === "event" && message.event) {
            const entityId = message.event.data.entity_id;
            const newState = message.event.data.new_state;
            this.emit("stateChanged", entityId, newState);
            return;
        }

        if (type === "result") {
            if (message.id === this.lastMessageIds.fetchStates && Array.isArray(message.result)) {
                this.emit("entities", message.result as HomeAssistantEntity[]);
                return;
            }

            if (message.id === this.lastMessageIds.fetchServices && message.result) {
                this.emit("services", message.result as ServicesPayload);
                return;
            }
        }

        logHomeAssistantEvent(message);
    }

    private subscribeToStateChanges(): void {
        this.send({
            id: this.getNextMessageId(),
            type: "subscribe_events",
            event_type: "state_changed",
        });
    }

    private fetchStates(): void {
        this.lastMessageIds.fetchStates = this.getNextMessageId();
        this.send({
            id: this.lastMessageIds.fetchStates,
            type: "get_states",
        });
    }

    private fetchServices(): void {
        this.lastMessageIds.fetchServices = this.getNextMessageId();
        this.send({
            id: this.lastMessageIds.fetchServices,
            type: "get_services",
        });
    }

    private send(payload: Record<string, unknown>): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            throw new Error("Home Assistant websocket is not connected.");
        }
        this.socket.send(JSON.stringify(payload));
    }

    private getNextMessageId(): number {
        this.messageId += 1;
        return this.messageId;
    }

    private hasCredentials(settings: GlobalSettings): boolean {
        return Boolean(settings.homeAssistantAddress && settings.accessToken);
    }

    private disconnect(): void {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.close();
            this.socket = null;
        }
        this.clearReconnectTimer();
    }

    private scheduleReconnect(): void {
        this.clearReconnectTimer();
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.settings) {
                this.connect();
            }
        }, RECONNECT_DELAY_MS);
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private emitConnectionState(state: ConnectionStateValue): void {
        this.emit("connectionState", state);
    }
}

export const homeAssistantClient = new HomeAssistantClient();
