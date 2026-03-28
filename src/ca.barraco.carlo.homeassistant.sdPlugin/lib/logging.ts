const LOG_STYLES = {
    streamDeck: "color: white; background: green;",
    homeAssistant: "color: white; background: blue;",
    plugin: "color: white; background: magenta;",
};

function logStreamDeckEvent(jsn: unknown): void {
    console.log("%c%s", LOG_STYLES.streamDeck, JSON.stringify(jsn));
}

function logHomeAssistantEvent(jsn: unknown): void {
    console.log("%c%s", LOG_STYLES.homeAssistant, JSON.stringify(jsn));
}

function logMessage(message: unknown): void {
    console.log("%c%s", LOG_STYLES.plugin, JSON.stringify(message));
}

function logLegend(): void {
    console.log("%c%s", LOG_STYLES.plugin, "Purple is a log from the plugin logic");
    console.log("%c%s", LOG_STYLES.homeAssistant, "Blue is a log from the Home Assistant WebSocket API");
    console.log("%c%s", LOG_STYLES.streamDeck, "Green is a log from the Stream Deck WebSocket API");
}
logLegend();
