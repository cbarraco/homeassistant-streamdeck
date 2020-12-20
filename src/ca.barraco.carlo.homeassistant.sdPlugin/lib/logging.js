function logStreamDeckEvent(jsn) {
    console.log(
        "%c%s",
        'color: white; background: green;',
        JSON.stringify(jsn)
    );
}

function logHomeAssistantEvent(jsn) {
    console.log(
        "%c%s",
        'color: white; background: blue;',
        JSON.stringify(jsn)
    );
}

function logMessage(message) {
    console.log(
        "%c%s",
        'color: white; background: magenta;',
        message
    );
}

function logLegend(){
    console.log(
        "%c%s",
        'color: white; background: magenta;',
        "Purple is a log from the plugin logic"
    );
    console.log(
        "%c%s",
        'color: white; background: blue;',
        "Blue is a log from the Home Assistant WebSocket API"
    );
    console.log(
        "%c%s",
        'color: white; background: green;',
        "Green is a log from the Stream Deck WebSocket API"
    );
}
logLegend();