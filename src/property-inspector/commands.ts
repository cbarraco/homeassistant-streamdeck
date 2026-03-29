export const PropertyInspectorCommands = {
    UPDATE_CACHE: "updateCache",
    UPDATE_GLOBAL_SETTINGS: "updateGlobalSettings",
} as const;

export type PropertyInspectorCommand =
    (typeof PropertyInspectorCommands)[keyof typeof PropertyInspectorCommands];

