// Protype which represents an action
function Action(inContext, inSettings) {
    var instance = this;

    var context = inContext;

    var settings = inSettings;

    // Public function returning the context
    this.getContext = function () {
        return context;
    };

    // Public function returning the settings
    this.getSettings = function () {
        return settings;
    };

    // Public function for settings the settings
    this.setSettings = function (inSettings) {
        settings = inSettings;
    };

    // Public function called on key up event
    this.onKeyDown = function (inData) {};
}
