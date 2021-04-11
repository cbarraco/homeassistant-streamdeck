// Prototype which represents a set light color action
function SetLightColorAction(inContext, inSettings) {
    var instance = this;

    // Inherit from Action
    Action.call(this, inContext, inSettings);

    var actionOnKeyUp = this.onKeyDown;

    // Public function called on keyDown event
    this.onKeyDown = function (inData) {
        actionOnKeyUp.call(this, inData);
        sendCommand(inData.settings);
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

    function sendCommand(settings) {
        logMessage(`Sending turnOn command to HA for entity ${settings.entityId}`);

        brightnessPayload = "";
        if (settings.brightness != undefined) {
            brightnessPayload = `,"brightness_pct": ${settings.brightness}`;
        }

        colorPayload = "";
        if (settings.colorType == "RGB") {
            const components = hexToRgb(settings.color);
            const red = components.r;
            const green = components.g;
            const blue = components.b;
            colorPayload = `,"rgb_color": [${red}, ${green}, ${blue}]`;
        } else if (settings.colorType == "Temperature") {
            colorPayload = `,"kelvin": ${settings.temperature}`;
        }

        const setLightColorMessage = `{
          "id": ${++homeAssistantMessageId},
          "type": "call_service",
          "domain": "light",
          "service": "turn_on",
          "service_data": {
            "entity_id": "${settings.entityId}"
            ${brightnessPayload}
            ${colorPayload}
          }
        }`;

        logMessage(setLightColorMessage);
        homeAssistantWebsocket.send(setLightColorMessage);
    }
}
