// Protype which represents an action
function Action(inContext, inSettings) {
    // Init Action
    var instance = this;

    // Private variable containing the context of the action
    var context = inContext;

    // Private variable containing the settings of the action
    var settings = inSettings;

    var entityId = "";

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
    this.onKeyUp = function (inData, inCallback) {
        
    };
}
