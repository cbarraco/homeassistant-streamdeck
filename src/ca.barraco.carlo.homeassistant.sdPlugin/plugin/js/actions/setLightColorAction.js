// Prototype which represents a set light color action
function SetLightColorAction(inContext, inSettings) {
    var instance = this;

    // Inherit from Action
    Action.call(this, inContext, inSettings);

    var actiononSettingsUpdate = this.onSettingsUpdate;
    this.onSettingsUpdate = function(inUpdatedSettings) {
        actiononSettingsUpdate.call(this, inUpdatedSettings);
        var mainCanvas = document.getElementById("mainCanvas");
        var mainCanvasContext = mainCanvas.getContext("2d");
        if (inUpdatedSettings.colorType == "RGB") {
            mainCanvasContext.fillStyle = inUpdatedSettings.color;
            logMessage(`Changing background to ${inUpdatedSettings.color}`);
        } else if (inUpdatedSettings.colorType == "Temperature") {
            var hex = miredToHex(inUpdatedSettings.temperature);
            mainCanvasContext.fillStyle = hex;
            logMessage(`Changing background to ${hex}`);
        }
        mainCanvasContext.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
        setImage(inContext, mainCanvas.toDataURL());
    };

    // Public function called on keyDown event
    var actionOnKeyUp = this.onKeyDown;
    this.onKeyDown = function (inData) {
        actionOnKeyUp.call(this, inData);
        sendTurnOnCommand(inData.payload.settings);
    };

    function sendTurnOnCommand(settings) {
        logMessage(`Sending turn on command to HA for light entity ${settings.entityId}`);

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
            colorPayload = `,"color_temp": ${settings.temperature}`;
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
