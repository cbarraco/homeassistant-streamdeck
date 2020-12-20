// Make sure the action names don't have capitals!!!
// SD makes them lower case when returned via events
const ActionType = {
    TOGGLE_SWITCH: "ca.barraco.carlo.homeassistant.action.toggleswitch",
    CALL_SERVICE: "ca.barraco.carlo.homeassistant.action.callservice"
};

const ConnectionState = {
    NOT_CONNECTED: "not_connected",
    INVALID_ADDRESS: "invalid_address",
    INVALID_TOKEN: "invalid_token",
    NEED_RECONNECT: "need_reconnect",
    CONNECTED: "connected",
};

const PluginCommands = {
    REQUEST_CACHE_UPDATE: "requestCacheUpdate",
    REQUEST_RECONNECT: "requestReconnect",
};

const PropertyInspectorCommands = {
    UPDATE_SERVICE_CACHE: "updateServiceCache",
    UPDATE_ENTITIES_CACHE: "updateEntitiesCache",
};