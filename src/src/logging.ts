import streamDeck from "@elgato/streamdeck";

type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

function write(level: LogLevel, channel: string, payload: unknown): void {
    const message = `[${channel}] ${format(payload)}`;
    const logger = streamDeck.logger;
    if (typeof logger[level] === "function") {
        logger[level](message);
    } else {
        console.log(message);
    }
}

function format(payload: unknown): string {
    if (typeof payload === "string") {
        return payload;
    }
    try {
        return JSON.stringify(payload);
    } catch {
        return String(payload);
    }
}

export function logMessage(payload: unknown): void {
    write("info", "plugin", payload);
}

export function logHomeAssistantEvent(payload: unknown): void {
    write("debug", "home-assistant", payload);
}
