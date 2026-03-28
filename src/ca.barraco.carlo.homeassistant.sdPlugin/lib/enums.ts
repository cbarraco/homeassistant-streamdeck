// Make sure the action names don't have capitals!!!
// SD makes them lower case when returned via events
export const ActionType = {
    TOGGLE_SWITCH: "ca.barraco.carlo.homeassistant.action.toggleswitch",
    CALL_SERVICE: "ca.barraco.carlo.homeassistant.action.callservice",
    TOGGLE_LIGHT: "ca.barraco.carlo.homeassistant.action.togglelight",
    SET_LIGHT_COLOR: "ca.barraco.carlo.homeassistant.action.setlightcolor",
} as const;

export type ActionTypeValue = (typeof ActionType)[keyof typeof ActionType];

export const ConnectionState = {
    NOT_CONNECTED: "not_connected",
    INVALID_ADDRESS: "invalid_address",
    INVALID_TOKEN: "invalid_token",
    NEED_RECONNECT: "need_reconnect",
    CONNECTED: "connected",
    DONT_KNOW: "dont_know",
} as const;

export type ConnectionStateValue = (typeof ConnectionState)[keyof typeof ConnectionState];

export const PluginCommands = {
    REQUEST_CACHE_UPDATE: "requestCacheUpdate",
    REQUEST_RECONNECT: "requestReconnect",
} as const;

export type PluginCommand = (typeof PluginCommands)[keyof typeof PluginCommands];

export const PropertyInspectorCommands = {
    UPDATE_CACHE: "updateCache",
    UPDATE_GLOBAL_SETTINGS: "updateGlobalSettings",
} as const;

export type PropertyInspectorCommand = (typeof PropertyInspectorCommands)[keyof typeof PropertyInspectorCommands];

export const CredentialsCommands = {
    UPDATE_ELEMENTS: "updateElements",
} as const;

export type CredentialsCommand = (typeof CredentialsCommands)[keyof typeof CredentialsCommands];

export const LightSupportedFeaturesBitmask = {
    SUPPORT_BRIGHTNESS: 1,
    SUPPORT_COLOR_TEMP: 2,
    SUPPORT_EFFECT: 4,
    SUPPORT_FLASH: 8,
    SUPPORT_COLOR: 16,
    SUPPORT_TRANSITION: 32,
    SUPPORT_WHITE_VALUE: 128,
} as const;

export type LightSupportedFeatureFlag =
    (typeof LightSupportedFeaturesBitmask)[keyof typeof LightSupportedFeaturesBitmask];


