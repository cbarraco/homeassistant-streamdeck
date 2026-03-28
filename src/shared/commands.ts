export const PluginCommands = {
    REQUEST_CACHE_UPDATE: "requestCacheUpdate",
    REQUEST_RECONNECT: "requestReconnect",
} as const;

export type PluginCommand = (typeof PluginCommands)[keyof typeof PluginCommands];

export const PropertyInspectorCommands = {
    UPDATE_CACHE: "updateCache",
    UPDATE_GLOBAL_SETTINGS: "updateGlobalSettings",
    UPDATE_ELEMENTS: "updateElements",
} as const;

export type PropertyInspectorCommand =
    (typeof PropertyInspectorCommands)[keyof typeof PropertyInspectorCommands];
