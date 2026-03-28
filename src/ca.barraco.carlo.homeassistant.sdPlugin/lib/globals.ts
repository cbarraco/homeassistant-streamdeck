type Dictionary<T> = Record<string, T>;

interface HomeAssistantEntityAttributes {
    color_mode?: string;
    rgb_color?: [number, number, number];
    color_temp?: number;
    min_mireds?: number;
    max_mireds?: number;
    supported_features?: number;
    [key: string]: unknown;
}

interface HomeAssistantEntity {
    entity_id: string;
    state: string;
    attributes: HomeAssistantEntityAttributes;
}

interface HomeAssistantCache {
    entities: Dictionary<HomeAssistantEntity[]>;
    services: Dictionary<string[]>;
}

interface GlobalSettings {
    homeAssistantAddress?: string;
    accessToken?: string;
    encrypted?: boolean;
    [key: string]: unknown;
}

let streamDeckWebSocket: WebSocket | null = null;
let globalSettings: GlobalSettings = {};
let homeAssistantCache: HomeAssistantCache = { entities: {}, services: {} };

interface Window {
    sendCredentialsToPropertyInspector?: (message: {
        command: PropertyInspectorCommand;
        data: GlobalSettings;
    }) => void;
    connectElgatoStreamDeckSocket?: (...args: any[]) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
}
