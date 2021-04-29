// Prototype which represents a command media player action
function CommandMediaPlayerAction(inContext, inSettings) {
    var instance = this;

    // Inherit from Action
    Action.call(this, inContext, inSettings);

    var actionOnKeyUp = this.onKeyDown;

    // Public function called on keyDown event
    this.onKeyDown = function (inData) {
        actionOnKeyUp.call(this, inData);
        const entityId = inData.settings.entityId;
        sendCommand(entityId);
    };

    function sendCommand(entityId) {
        logMessage(`Sending command to HA for entity ${entityId}`);
        const message = `{
          "id": ${++homeAssistantMessageId},
          "type": "call_service",
          "domain": "media_player",
          "service": "media_play_pause",
          "service_data": {
            "entity_id": "${entityId}"
          }
        }`;
        homeAssistantWebsocket.send(message);
    }
}
