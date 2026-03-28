class SetLightColorAction extends Action {
    constructor(context: string, settings: ActionSettings = {}) {
        super(context, settings);
    }

    onSettingsUpdate(updatedSettings: ActionSettings): void {
        super.onSettingsUpdate(updatedSettings);
        const mainCanvas = document.getElementById("mainCanvas") as HTMLCanvasElement | null;
        if (!mainCanvas) {
            return;
        }

        const canvasContext = mainCanvas.getContext("2d");
        if (!canvasContext) {
            return;
        }

        if (updatedSettings.colorType === "RGB" && typeof updatedSettings.color === "string") {
            canvasContext.fillStyle = updatedSettings.color;
            logMessage(`Changing background to ${updatedSettings.color}`);
        } else if (updatedSettings.colorType === "Temperature" && typeof updatedSettings.temperature === "number") {
            const hex = miredToHex(updatedSettings.temperature);
            canvasContext.fillStyle = hex;
            logMessage(`Changing background to ${hex}`);
        }

        canvasContext.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
        setImage(this.context, mainCanvas.toDataURL());
    }

    onKeyDown(data: KeyDownData): void {
        super.onKeyDown(data);
        this.sendTurnOnCommand(data.settings);
    }

    private sendTurnOnCommand(settings: ActionSettings): void {
        if (!homeAssistantWebsocket) {
            logMessage("Home Assistant websocket is not connected.");
            return;
        }

        const entityId = settings.entityId;
        if (!entityId) {
            logMessage("SetLightColorAction requires an entityId setting.");
            return;
        }

        logMessage(`Sending turn on command to HA for light entity ${entityId}`);

        const serviceData: Record<string, unknown> = {
            entity_id: entityId,
        };

        if (settings.brightness !== undefined) {
            const brightness = Number(settings.brightness);
            if (!Number.isNaN(brightness)) {
                serviceData.brightness_pct = brightness;
            }
        }

        if (settings.colorType === "RGB" && typeof settings.color === "string") {
            const components = hexToRgb(settings.color);
            if (components) {
                serviceData.rgb_color = [components.r, components.g, components.b];
            }
        } else if (settings.colorType === "Temperature" && settings.temperature !== undefined) {
            const temperature = Number(settings.temperature);
            if (!Number.isNaN(temperature)) {
                serviceData.color_temp = temperature;
            }
        }

        const setLightColorMessage = JSON.stringify({
            id: ++homeAssistantMessageId,
            type: "call_service",
            domain: "light",
            service: "turn_on",
            service_data: serviceData,
        });

        logMessage(setLightColorMessage);
        homeAssistantWebsocket.send(setLightColorMessage);
    }
}
