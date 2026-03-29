export const ActionType = {
    TOGGLE_SWITCH: "ca.barraco.carlo.homeassistant.action.toggleswitch",
    CALL_SERVICE: "ca.barraco.carlo.homeassistant.action.callservice",
    TOGGLE_LIGHT: "ca.barraco.carlo.homeassistant.action.togglelight",
    SET_LIGHT_COLOR: "ca.barraco.carlo.homeassistant.action.setlightcolor",
    STEP_LIGHT_BRIGHTNESS: "ca.barraco.carlo.homeassistant.action.steplightbrightness",
    CAMERA_THUMBNAIL: "ca.barraco.carlo.homeassistant.action.camerathumbnail",
    MEDIA_PLAYER: "ca.barraco.carlo.homeassistant.action.mediaplayer",
    TRIGGER_AUTOMATION: "ca.barraco.carlo.homeassistant.action.triggerautomation",
    RUN_SCRIPT: "ca.barraco.carlo.homeassistant.action.runscript",
    ALARM_CONTROL_PANEL: "ca.barraco.carlo.homeassistant.action.alarmcontrolpanel",
    DISPLAY_STATE: "ca.barraco.carlo.homeassistant.action.displaystate",
    CONTROL_COVER: "ca.barraco.carlo.homeassistant.action.controlcover",
    CLIMATE_CONTROL: "ca.barraco.carlo.homeassistant.action.climatecontrol",
    LOCK_CONTROL: "ca.barraco.carlo.homeassistant.action.lockcontrol",
    TIMER_CONTROL: "ca.barraco.carlo.homeassistant.action.timercontrol",
} as const;

export type ActionTypeValue = (typeof ActionType)[keyof typeof ActionType];
