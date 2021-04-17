// Protype which represents an action
function Action(inContext, inSettings) {
    var instance = this;

    var context = inContext;

    var settings = inSettings;

    // Public function returning the settings
    this.getSettings = function () {
        return settings;
    };

    // Public function for settings the settings
    this.onSettingsUpdate = function (inUpdatedSettings) {
        logMessage("Received updated settings");
        logMessage(inUpdatedSettings);
        settings = inUpdatedSettings;
    };

    // Public function called on keyDown event
    this.onKeyDown = function (inData) {};
}
