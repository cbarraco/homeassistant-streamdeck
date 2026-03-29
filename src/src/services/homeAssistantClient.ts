import { EventEmitter } from "node:events";
import WebSocket from "ws";

import type { GlobalSettings, HomeAssistantEntity } from "../../shared/types";
import {
  ConnectionState,
  type ConnectionStateValue,
} from "../state/connectionState";
import { logHomeAssistantEvent, logMessage } from "../logging";

type ServicesPayload = Record<string, Record<string, unknown>>;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

type HomeAssistantEvents = {
  connectionState: [state: ConnectionStateValue];
  entities: [entities: HomeAssistantEntity[]];
  services: [services: ServicesPayload];
  stateChanged: [entityId: string, entity: HomeAssistantEntity];
};

type StateChangeListener = (
  entityId: string,
  entity: HomeAssistantEntity,
) => void;

interface HomeAssistantMessage {
  type: string;
  id?: number;
  success?: boolean;
  result?: unknown;
  error?: {
    code?: string | number;
    message?: string;
  };
  event?: {
    data: {
      entity_id: string;
      new_state: HomeAssistantEntity;
    };
  };
}

const RECONNECT_DELAY_MS = 30_000;
const REQUEST_TIMEOUT_MS = 15_000;

export class HomeAssistantClient extends EventEmitter<HomeAssistantEvents> {
  private socket: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private settings: GlobalSettings | null = null;
  private messageId = 0;
  private readonly pendingRequests = new Map<number, PendingRequest>();
  private readonly stateChangeListeners = new Set<StateChangeListener>();
  private stateChangeSubscriptionActive = false;
  private unsubscribeFromStateChanges: (() => void) | null = null;

  constructor() {
    super();
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

  async fetchCameraSnapshot(entityId: string): Promise<string> {
    return this.fetchImage(`/api/camera_proxy/${entityId}`);
  }

  async fetchImage(path: string): Promise<string> {
    if (!this.settings?.homeAssistantAddress || !this.settings?.accessToken) {
      throw new Error("Home Assistant is not configured.");
    }
    const { homeAssistantAddress, accessToken, encrypted } = this.settings;
    const protocol = encrypted ? "https" : "http";
    const url = path.startsWith("http") ? path : `${protocol}://${homeAssistantAddress}${path}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`Image request failed: ${response.status} ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    return `data:${contentType};base64,${base64}`;
  }

  async callService(
    domain: string,
    service: string,
    serviceData: Record<string, unknown>,
  ): Promise<unknown> {
    return this.sendRequest({
      type: "call_service",
      domain,
      service,
      service_data: serviceData,
    });
  }

  sendRawMessage<T = unknown>(payload: Record<string, unknown>): Promise<T> {
    return this.sendRequest<T>(payload);
  }

  private connect(): void {
    if (!this.settings) {
      return;
    }

    this.clearReconnectTimer();
    this.closeSocketSilently();

    const { homeAssistantAddress, accessToken, encrypted } = this.settings;
    if (!this.hasCredentials(this.settings)) {
      logMessage(
        "Home Assistant settings are incomplete; skipping connection.",
      );
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
      const parsed = this.parseMessage(data);
      if (parsed) {
        this.handleMessage(parsed);
      }
    });

    this.socket.on("close", (code) => {
      logMessage(`Home Assistant websocket closed: code=${code}`);
      this.socket = null;
      this.emitConnectionState(ConnectionState.NEED_RECONNECT);
      this.rejectAllPending(new Error("Home Assistant websocket closed."));
      this.teardownStateChangeSubscription();
      this.scheduleReconnect();
    });

    this.socket.on("error", (error) => {
      logHomeAssistantEvent(error);
    });
  }

  private handleMessage(message: HomeAssistantMessage): void {
    const { type } = message;
    switch (type) {
      case "auth_ok":
        this.handleAuthOk();
        return;
      case "auth_invalid":
        this.handleAuthInvalid();
        return;
      case "event":
        if (this.handleEventMessage(message)) {
          return;
        }
        break;
      case "result":
        if (this.resolvePendingRequest(message)) {
          return;
        }
        break;
      default:
        break;
    }

    logHomeAssistantEvent(message);
  }

  private subscribeToStateChanges(listener: StateChangeListener): () => void {
    if (!this.stateChangeSubscriptionActive) {
      try {
        this.send({
          id: this.getNextMessageId(),
          type: "subscribe_events",
          event_type: "state_changed",
        });
      } catch (error) {
        throw error instanceof Error ? error : new Error(String(error));
      }
      this.stateChangeSubscriptionActive = true;
    }

    this.stateChangeListeners.add(listener);

    return () => {
      this.stateChangeListeners.delete(listener);
      if (this.stateChangeListeners.size === 0) {
        this.stateChangeSubscriptionActive = false;
      }
    };
  }

  private async fetchStates(): Promise<void> {
    try {
      const entities = await this.sendRequest<HomeAssistantEntity[]>({
        type: "get_states",
      });
      if (Array.isArray(entities)) {
        this.emit("entities", entities);
      }
    } catch (error) {
      logHomeAssistantEvent(error);
    }
  }

  private async fetchServices(): Promise<void> {
    try {
      const services = await this.sendRequest<ServicesPayload>({
        type: "get_services",
      });
      if (services) {
        this.emit("services", services);
      }
    } catch (error) {
      logHomeAssistantEvent(error);
    }
  }

  private send(payload: Record<string, unknown>): void {
    this.getSocket().send(JSON.stringify(payload));
  }

  private sendRequest<T>(payload: Record<string, unknown>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let socket: WebSocket;
      try {
        socket = this.getSocket();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }

      const id = this.getNextMessageId();
      const message = {
        ...payload,
        id,
      };

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(
          new Error(
            `Home Assistant request ${id} timed out after ${REQUEST_TIMEOUT_MS} ms.`,
          ),
        );
      }, REQUEST_TIMEOUT_MS);

      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value as T);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });

      try {
        socket.send(JSON.stringify(message));
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private getNextMessageId(): number {
    this.messageId += 1;
    return this.messageId;
  }

  private resolvePendingRequest(message: HomeAssistantMessage): boolean {
    if (typeof message.id !== "number") {
      return false;
    }

    const pending = this.pendingRequests.get(message.id);
    if (!pending) {
      return false;
    }

    this.pendingRequests.delete(message.id);

    if (message.success === false) {
      const errorMessage =
        message.error?.message ?? "Home Assistant returned an error.";
      pending.reject(new Error(errorMessage));
      return true;
    }

    pending.resolve(message.result);
    return true;
  }

  private rejectAllPending(error: Error): void {
    this.pendingRequests.forEach((pending) => pending.reject(error));
    this.pendingRequests.clear();
  }

  private handleAuthOk(): void {
    logMessage("Authenticated with Home Assistant.");
    this.emitConnectionState(ConnectionState.CONNECTED);
    void this.fetchStates();
    void this.fetchServices();
    this.teardownStateChangeSubscription();
    try {
      this.unsubscribeFromStateChanges = this.subscribeToStateChanges(
        (entityId, entity) => {
          this.emit("stateChanged", entityId, entity);
        },
      );
    } catch (error) {
      logHomeAssistantEvent(error);
    }
  }

  private handleAuthInvalid(): void {
    logMessage("Home Assistant rejected the access token.");
    this.emitConnectionState(ConnectionState.INVALID_TOKEN);
    this.teardownStateChangeSubscription();
    this.socket?.close();
  }

  private handleEventMessage(message: HomeAssistantMessage): boolean {
    if (!message.event) {
      return false;
    }
    const entityId = message.event.data.entity_id;
    const newState = message.event.data.new_state;
    this.stateChangeListeners.forEach((listener) =>
      listener(entityId, newState),
    );
    return true;
  }

  private parseMessage(data: WebSocket.RawData): HomeAssistantMessage | null {
    try {
      return JSON.parse(data.toString()) as HomeAssistantMessage;
    } catch (error) {
      logHomeAssistantEvent(error);
      return null;
    }
  }

  private getSocket(): WebSocket {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("Home Assistant websocket is not connected.");
    }
    return this.socket;
  }

  private closeSocketSilently(): void {
    if (!this.socket) {
      return;
    }
    this.socket.removeAllListeners();
    this.socket.close();
    this.socket = null;
  }

  private hasCredentials(settings: GlobalSettings): boolean {
    return Boolean(settings.homeAssistantAddress && settings.accessToken);
  }

  private disconnect(): void {
    this.closeSocketSilently();
    this.rejectAllPending(new Error("Home Assistant websocket disconnected."));
    this.clearReconnectTimer();
    this.teardownStateChangeSubscription();
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

  private teardownStateChangeSubscription(): void {
    if (this.unsubscribeFromStateChanges) {
      this.unsubscribeFromStateChanges();
      this.unsubscribeFromStateChanges = null;
    }
    this.stateChangeSubscriptionActive = false;
  }
}

export const homeAssistantClient = new HomeAssistantClient();
