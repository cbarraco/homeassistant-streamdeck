class CallServiceAction extends Action {
    constructor(context: string, settings: ActionSettings = {}) {
        super(context, settings);
    }

    onKeyDown(data: KeyDownData): void {
        super.onKeyDown(data);
        const serviceId = data.settings.serviceId;
        if (!serviceId) {
            logMessage("CallServiceAction requires a serviceId setting.");
            return;
        }
        const payload = this.normalizePayload(data.settings.payload);
        this.sendServiceCommand(serviceId, payload);
    }

    private normalizePayload(rawPayload?: string): string {
        if (!rawPayload || rawPayload.trim() === "") {
            return "{}";
        }

        try {
            JSON.parse(rawPayload);
            return rawPayload;
        } catch (error) {
            logMessage("Payload is not valid JSON. Falling back to empty object.");
            return "{}";
        }
    }

    private sendServiceCommand(serviceId: string, payload: string): void {
        if (!homeAssistantWebsocket) {
            logMessage("Home Assistant websocket is not connected.");
            return;
        }

        const [domain, service] = serviceId.split(".");
        if (!domain || !service) {
            logMessage(`Invalid service id: ${serviceId}`);
            return;
        }

        logMessage(`Calling ${domain}.${service}`);
        const callServiceMessage = `{
          "id": ${++homeAssistantMessageId},
          "type": "call_service",
          "domain": "${domain}",
          "service": "${service}",
          "service_data": ${payload}
        }`;
        homeAssistantWebsocket.send(callServiceMessage);
    }
}
