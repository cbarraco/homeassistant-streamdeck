// Prototype which represents a call service action
function CallServiceAction(inContext, inSettings) {
    var instance = this;

    // Inherit from Action
    Action.call(this, inContext, inSettings);

    var actionOnKeyUp = this.onKeyUp;

    // Public function called on key up event
    this.onKeyUp = function (inData) {
        actionOnKeyUp.call(this, inData);
        const entityId = inData.settings.entityId;
        sendServiceCommand(entityId);
    };

    function sendServiceCommand(service, payload) {
        logMessage(`Calling ${domain}.${service}`);
        const testMessage = `{
          "id": ${++homeAssistantMessageId},
          "type": "call_service",
          "domain": "${domain}",
          "service": "${service}",
          "service_data": ${payload}
        }`;
        homeAssistantWebsocket.send(testMessage);
    }
}
