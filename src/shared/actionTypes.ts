export const ActionType = {
    TOGGLE_SWITCH: "ca.barraco.carlo.homeassistant.action.toggleswitch",
    CALL_SERVICE: "ca.barraco.carlo.homeassistant.action.callservice",
    TOGGLE_LIGHT: "ca.barraco.carlo.homeassistant.action.togglelight",
    SET_LIGHT_COLOR: "ca.barraco.carlo.homeassistant.action.setlightcolor",
} as const;

export type ActionTypeValue = (typeof ActionType)[keyof typeof ActionType];
