import { ConnectionState, type ConnectionStateValue } from "../enums.js";

export type Dictionary<T> = Record<string, T>;

export interface HomeAssistantEntityAttributes {
    color_mode?: string;
    rgb_color?: [number, number, number];
    color_temp?: number;
    min_mireds?: number;
    max_mireds?: number;
    supported_features?: number;
    [key: string]: unknown;
}

export interface HomeAssistantEntity {
    entity_id: string;
    state: string;
    attributes: HomeAssistantEntityAttributes;
}

export interface HomeAssistantCache {
    entities: Dictionary<HomeAssistantEntity[]>;
    services: Dictionary<string[]>;
}

export interface GlobalSettings {
    homeAssistantAddress?: string;
    accessToken?: string;
    encrypted?: boolean;
    [key: string]: unknown;
}

export interface AppState {
    streamDeckWebSocket: WebSocket | null;
    globalSettings: GlobalSettings;
    homeAssistantCache: HomeAssistantCache;
    connectionState: ConnectionStateValue;
}

export type AppAction =
    | { type: "SET_STREAM_DECK_SOCKET"; socket: WebSocket | null }
    | { type: "SET_GLOBAL_SETTINGS"; settings: GlobalSettings }
    | { type: "SET_CONNECTION_STATE"; connectionState: ConnectionStateValue }
    | { type: "RESET_CACHE" }
    | { type: "SET_ENTITIES_CACHE"; entities: HomeAssistantCache["entities"] }
    | { type: "SET_SERVICES_CACHE"; services: HomeAssistantCache["services"] };

type Listener = (state: AppState, action: AppAction) => void;

const initialState: AppState = {
    streamDeckWebSocket: null,
    globalSettings: {},
    homeAssistantCache: {
        entities: {},
        services: {},
    },
    connectionState: ConnectionState.DONT_KNOW,
};

export class Store {
    private state: AppState = initialState;
    private listeners = new Set<Listener>();

    getState(): AppState {
        return this.state;
    }

    dispatch(action: AppAction): void {
        this.state = reducer(this.state, action);
        this.listeners.forEach((listener) => listener(this.state, action));
    }

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
}

function reducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
        case "SET_STREAM_DECK_SOCKET":
            return { ...state, streamDeckWebSocket: action.socket };
        case "SET_GLOBAL_SETTINGS":
            return { ...state, globalSettings: { ...action.settings } };
        case "SET_CONNECTION_STATE":
            return { ...state, connectionState: action.connectionState };
        case "RESET_CACHE":
            return {
                ...state,
                homeAssistantCache: { entities: {}, services: {} },
            };
        case "SET_ENTITIES_CACHE":
            return {
                ...state,
                homeAssistantCache: {
                    ...state.homeAssistantCache,
                    entities: action.entities,
                },
            };
        case "SET_SERVICES_CACHE":
            return {
                ...state,
                homeAssistantCache: {
                    ...state.homeAssistantCache,
                    services: action.services,
                },
            };
        default:
            return state;
    }
}

export const appStore = new Store();
