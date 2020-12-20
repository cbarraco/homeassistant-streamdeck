// Prototype which represents a call service action
function CallServiceAction(inContext, inSettings) {
    var instance = this;

    // Inherit from Action
    Action.call(this, inContext, inSettings);

    var actionOnKeyUp = this.onKeyUp;

    // Public function called on key up event
    this.onKeyUp = function (inData) {
        actionOnKeyUp.call(this, inData);
        const entityIdInput = inData.settings.entityIdInput;
        sendServiceCommand(entityIdInput);
    };

    function sendServiceCommand(service, payload) {
        logMessage(`Calling ${service}`);
        const domain = service.split(".")[0];
        const domainService = service.split(".")[1];
        const testMessage = `{
          "id": ${++homeAssistantMessageId},
          "type": "call_service",
          "domain": "${domain}",
          "service": "${domainService}",
          "service_data": ${payload}
        }`;
        homeAssistantWebsocket.send(testMessage);
    }
}
