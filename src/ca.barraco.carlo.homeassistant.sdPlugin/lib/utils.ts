type StreamDeckUUID = string;
type StreamDeckContext = string;
type StreamDeckAction = string;
type StreamDeckTarget = number | undefined;
type StreamDeckState = number | undefined;
type StreamDeckPayload = Record<string, unknown>;
type LocalizationCallback = (success: boolean, data: Record<string, unknown> | string) => void;

function sendStreamDeckMessage(payload: unknown): void {
    if (!streamDeckWebSocket) {
        return;
    }

    streamDeckWebSocket.send(JSON.stringify(payload));
}

function registerPluginOrPI(event: string, uuid: StreamDeckUUID): void {
    sendStreamDeckMessage({ event, uuid });
}

function saveSettings(action: StreamDeckAction, uuid: StreamDeckContext, settings: StreamDeckPayload): void {
    sendStreamDeckMessage({
        action,
        event: "setSettings",
        context: uuid,
        payload: settings,
    });
}

function saveGlobalSettings(uuid: StreamDeckUUID): void {
    sendStreamDeckMessage({
        event: "setGlobalSettings",
        context: uuid,
        payload: globalSettings,
    });
}

function requestGlobalSettings(uuid: StreamDeckUUID): void {
    sendStreamDeckMessage({
        event: "getGlobalSettings",
        context: uuid,
    });
}

function addAccount(uuid: StreamDeckUUID): void {
    sendStreamDeckMessage({
        event: "addAccount",
        context: uuid,
    });
}

function openUrl(url: string): void {
    sendStreamDeckMessage({
        event: "openUrl",
        payload: {
            url,
        },
    });
}

function log(message: string): void {
    const time = new Date();
    const timeString = `${time.toLocaleDateString()} ${time.toLocaleTimeString()}`;
    console.log(`${timeString}: ${message}`);

    try {
        sendStreamDeckMessage({
            event: "logMessage",
            payload: {
                message,
            },
        });
    } catch (error) {
        console.log("Websocket not defined", error);
    }
}

function showOk(uuid: StreamDeckUUID): void {
    sendStreamDeckMessage({
        event: "showOk",
        context: uuid,
    });
}

function showAlert(uuid: StreamDeckUUID): void {
    sendStreamDeckMessage({
        event: "showAlert",
        context: uuid,
    });
}

function setTitle(uuid: StreamDeckUUID, title: string, target?: StreamDeckTarget, state?: StreamDeckState): void {
    const payload: Record<string, unknown> = {
        title,
    };

    if (typeof target !== "undefined") {
        payload.target = target;
    }
    if (typeof state !== "undefined") {
        payload.state = state;
    }

    sendStreamDeckMessage({
        event: "setTitle",
        context: uuid,
        payload,
    });
}

function setImage(uuid: StreamDeckUUID, image: string, target?: StreamDeckTarget, state?: StreamDeckState): void {
    const payload: Record<string, unknown> = {
        image,
    };

    if (typeof target !== "undefined") {
        payload.target = target;
    }
    if (typeof state !== "undefined") {
        payload.state = state;
    }

    sendStreamDeckMessage({
        event: "setImage",
        context: uuid,
        payload,
    });
}

function setState(uuid: StreamDeckUUID, state: number): void {
    sendStreamDeckMessage({
        event: "setState",
        context: uuid,
        payload: {
            state,
        },
    });
}

function sendToPropertyInspector(action: StreamDeckAction, context: StreamDeckContext, data: StreamDeckPayload): void {
    sendStreamDeckMessage({
        action,
        event: "sendToPropertyInspector",
        context,
        payload: data,
    });
}

function sendToPlugin(action: StreamDeckAction, context: StreamDeckContext, data: StreamDeckPayload): void {
    sendStreamDeckMessage({
        action,
        event: "sendToPlugin",
        context,
        payload: data,
    });
}

function getLocalization(language: string, callback: LocalizationCallback): void {
    const url = `../${language}.json`;
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onload = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            try {
                const data = JSON.parse(xhr.responseText) as Record<string, unknown>;
                const localization = (data["Localization"] as Record<string, unknown>) ?? {};
                callback(true, localization);
            } catch (error) {
                callback(false, "Localizations is not a valid json.");
            }
        } else {
            callback(false, "Could not load the localizations.");
        }
    };
    xhr.onerror = function () {
        callback(false, "An error occurred while loading the localizations.");
    };
    xhr.ontimeout = function () {
        callback(false, "Localization timed out.");
    };
    xhr.send();
}
