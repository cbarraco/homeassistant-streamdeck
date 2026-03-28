"use strict";
class Action {
    constructor(context, settings = {}) {
        this.context = context;
        this.settings = settings;
    }
    getSettings() {
        return this.settings;
    }
    onSettingsUpdate(updatedSettings) {
        logMessage("Received updated settings");
        logMessage(updatedSettings);
        this.settings = updatedSettings;
    }
    onKeyDown(_data) {
        // default no-op
    }
}
