// Prototype which represents a toggle light action
function ToggleLightAction(inContext, inSettings) {
    var instance = this;

    // Inherit from Action
    Action.call(this, inContext, inSettings);

    var actionOnKeyUp = this.onKeyDown;

    // Public function called on keyDown event
    this.onKeyDown = function (inData) {
        actionOnKeyUp.call(this, inData);
        const entityId = inData.settings.entityId;
        const color = inData.settings.color;
        sendToggleCommand(entityId, color);
    };

    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16),
              }
            : null;
    }

    function sendToggleCommand(entityId, color) {
        logMessage(`Sending toggle command to HA for entity ${entityId}`);

        const components = hexToRgb(color);
        const red = components.r;
        const green = components.g;
        const blue = components.b;
        const testMessage = `{
          "id": ${++homeAssistantMessageId},
          "type": "call_service",
          "domain": "light",
          "service": "toggle",
          "service_data": {
            "entity_id": "${entityId}",
            "rgb_color": [${red}, ${green}, ${blue}]
          }
        }`;
        homeAssistantWebsocket.send(testMessage);
    }
}
