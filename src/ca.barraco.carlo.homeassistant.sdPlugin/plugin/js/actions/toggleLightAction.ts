class ToggleLightAction extends Action {
    constructor(context: string, settings: ActionSettings = {}) {
        super(context, settings);
    }

    onKeyDown(data: KeyDownData): void {
        super.onKeyDown(data);
        const entityId = data.settings.entityId;
        if (!entityId) {
            logMessage("ToggleLightAction requires an entityId setting.");
            return;
        }
        this.sendCommand(entityId);
    }

    private sendCommand(entityId: string): void {
        if (!homeAssistantWebsocket) {
            logMessage("Home Assistant websocket is not connected.");
            return;
        }

        logMessage(`Sending toggle command to HA for entity ${entityId}`);
        const message = `{
          "id": ${++homeAssistantMessageId},
          "type": "call_service",
          "domain": "light",
          "service": "toggle",
          "service_data": {
            "entity_id": "${entityId}"
          }
        }`;
        homeAssistantWebsocket.send(message);
    }
}
