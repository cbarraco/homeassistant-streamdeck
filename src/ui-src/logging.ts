export const LOG_STYLES = {
    streamDeck: "color: white; background: green;",
    homeAssistant: "color: white; background: blue;",
    plugin: "color: white; background: magenta;",
} as const;

export class Logger {
    private static write: (style: string, message: string) => void = (style, message) => {
        console.log("%c%s", style, message);
    };

    static configure(options: { writer?: (style: string, message: string) => void } = {}): void {
        if (options.writer) {
            Logger.write = options.writer;
        }
    }

    static logStreamDeckEvent(data: unknown): void {
        Logger.log("streamDeck", data);
    }

    static logHomeAssistantEvent(data: unknown): void {
        Logger.log("homeAssistant", data);
    }

    static logMessage(message: unknown): void {
        Logger.log("plugin", message);
    }

    private static log(channel: keyof typeof LOG_STYLES, data: unknown): void {
        Logger.write(LOG_STYLES[channel], Logger.stringify(data));
    }

    static logLegend(): void {
        Logger.log("plugin", "Purple is a log from the plugin logic");
        Logger.log("homeAssistant", "Blue is a log from the Home Assistant WebSocket API");
        Logger.log("streamDeck", "Green is a log from the Stream Deck WebSocket API");
    }

    private static stringify(data: unknown): string {
        if (typeof data === "string") {
            return data;
        }
        try {
            return JSON.stringify(data);
        } catch {
            return String(data);
        }
    }
}

Logger.logLegend();

export const logStreamDeckEvent = Logger.logStreamDeckEvent.bind(Logger);
export const logHomeAssistantEvent = Logger.logHomeAssistantEvent.bind(Logger);
export const logMessage = Logger.logMessage.bind(Logger);

