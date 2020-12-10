// Prototype which represents a toggle switch action
function ToggleSwitchAction(inContext, inSettings) {
    // Init ToggleSwitchAction
    var instance = this;

    // Inherit from Action
    Action.call(this, inContext, inSettings);

    // Before overwriting parrent method, save a copy of it
    var actionOnKeyUp = this.onKeyUp;

    // Public function called on key up event
    this.onKeyUp = function (inData, inCallback) {
        // Call actions onKeyUp method
        actionOnKeyUp.call(this, inData, send);

        const entityIdInput = inData.settings.entityIdInput;
        const testMessage = `{
          "id": ${++currentMessageId},
          "type": "call_service",
          "domain": "switch",
          "service": "toggle",
          "service_data": {
            "entity_id": "${entityIdInput}"
          }
        }`;

        logMessage(`Sending service call to HA: ${testMessage}`);

        homeAssistantWebsocket.send(testMessage);

        inCallback();
    };

    // Private function called for sending a message
    function send(account, target) {}
}
