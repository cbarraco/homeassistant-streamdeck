// Prototype which represents a toggle switch action
function ToggleSwitchAction(inContext, inSettings) {
    var instance = this;

    // Inherit from Action
    Action.call(this, inContext, inSettings);

    var actionOnKeyUp = this.onKeyUp;

    // Public function called on key up event
    this.onKeyUp = function (inData) {
        actionOnKeyUp.call(this, inData);
        const entityId = inData.settings.entityId;
        sendToggleCommand(entityId);
    };

    function sendToggleCommand(entityId) {
        logMessage(`Sending toggle command to HA for entity ${entityId}`);
        const testMessage = `{
          "id": ${++homeAssistantMessageId},
          "type": "call_service",
          "domain": "switch",
          "service": "toggle",
          "service_data": {
            "entity_id": "${entityId}"
          }
        }`;
        homeAssistantWebsocket.send(testMessage);
    }
}
