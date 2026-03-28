"use strict";
class ToggleSwitchAction extends Action {
    constructor(context, settings = {}) {
        super(context, settings);
    }
    onKeyDown(data) {
        super.onKeyDown(data);
        const entityId = data.settings.entityId;
        if (!entityId) {
            logMessage("ToggleSwitchAction requires an entityId setting.");
            return;
        }
        this.sendCommand(entityId);
    }
    sendCommand(entityId) {
        if (!homeAssistantWebsocket) {
            logMessage("Home Assistant websocket is not connected.");
            return;
        }
        logMessage(`Sending toggle command to HA for entity ${entityId}`);
        const message = `{
          "id": ${++homeAssistantMessageId},
          "type": "call_service",
          "domain": "switch",
          "service": "toggle",
          "service_data": {
            "entity_id": "${entityId}"
          }
        }`;
        homeAssistantWebsocket.send(message);
    }
}
