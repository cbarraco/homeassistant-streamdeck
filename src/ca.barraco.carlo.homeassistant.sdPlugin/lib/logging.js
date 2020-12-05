function logStreamDeckEvent(jsn) {
    console.log(
        "%c%s",
        'color: white; background: green;',
        `${arguments.callee.caller.name || 'SD callback'}: ${JSON.stringify(jsn)}`
    );
}

function logHomeAssistantEvent(jsn) {
    console.log(
        "%c%s",
        'color: white; background: blue;',
        `${arguments.callee.caller.name || 'HA callback'}: ${JSON.stringify(jsn)}`
    );
}

function logMessage(message) {
    console.log(
        "%c%s",
        'color: white; background: magenta;',
        `${arguments.callee.caller.name || 'callback'}: ${message}`
    );
}