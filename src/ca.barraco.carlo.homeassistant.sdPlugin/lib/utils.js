//==============================================================================
/**
@file       utils.js
@brief      Twitch Plugin
@copyright  (c) 2020, Corsair Memory, Inc.
            This source code is licensed under the MIT-style license found in the LICENSE file.
**/
//==============================================================================

// Register the plugin or PI
function registerPluginOrPI(inEvent, inUUID) {
    if (streamDeckWebSocket) {
        var json = {
            event: inEvent,
            uuid: inUUID,
        };

        streamDeckWebSocket.send(JSON.stringify(json));
    }
}

function saveSettings(inAction, inUUID, inSettings) {
    if (streamDeckWebSocket) {
        const json = {
            action: inAction,
            event: "setSettings",
            context: inUUID,
            payload: inSettings,
        };
        streamDeckWebSocket.send(JSON.stringify(json));
    }
}

// Save global settings
function saveGlobalSettings(inUUID) {
    if (streamDeckWebSocket) {
        const json = {
            event: "setGlobalSettings",
            context: inUUID,
            payload: globalSettings,
        };
        streamDeckWebSocket.send(JSON.stringify(json));
    }
}

// Request global settings for the plugin
function requestGlobalSettings(inUUID) {
    if (streamDeckWebSocket) {
        var json = {
            event: "getGlobalSettings",
            context: inUUID,
        };

        streamDeckWebSocket.send(JSON.stringify(json));
    }
}

// Add a Twitch account to the configured accounts
function addAccount(inUUID) {
    if (streamDeckWebSocket) {
        var json = {
            event: "addAccount",
            context: inUUID,
        };
        streamDeckWebSocket.send(JSON.stringify(json));
    }
}

// Open a web page
function openUrl(inUrl) {
    if (streamDeckWebSocket) {
        var json = {
            event: "openUrl",
            payload: {
                url: inUrl,
            },
        };
        streamDeckWebSocket.send(JSON.stringify(json));
    }
}

// Log to the global log file
function log(inMessage) {
    // Log to the developer console
    var time = new Date();
    var timeString =
        time.toLocaleDateString() + " " + time.toLocaleTimeString();
    console.log(timeString + ": " + inMessage);

    try {
        // Log to the Stream Deck log file
        if (streamDeckWebSocket) {
            var json = {
                event: "logMessage",
                payload: {
                    message: inMessage,
                },
            };
            streamDeckWebSocket.send(JSON.stringify(json));
        }
    } catch (e) {
        console.log("Websocket not defined");
    }
}

// Show ok icon on the key
function showOk(inUUID) {
    if (streamDeckWebSocket) {
        var json = {
            event: "showOk",
            context: inUUID,
        };

        streamDeckWebSocket.send(JSON.stringify(json));
    }
}

// Show alert icon on the key
function showAlert(inUUID) {
    if (streamDeckWebSocket) {
        var json = {
            event: "showAlert",
            context: inUUID,
        };

        streamDeckWebSocket.send(JSON.stringify(json));
    }
}

// Set the title of a key
function setTitle(inUUID, inTitle, inTarget, inState) {
    if (streamDeckWebSocket) {
        var json = {
            event: "setTitle",
            context: inUUID,
            payload: {
                title: inTitle,
                target: inTarget,
                state: inState,
            },
        };

        streamDeckWebSocket.send(JSON.stringify(json));
    }
}

// Set the image of a key
function setImage(inUUID, inImage, inTarget, inState) {
    if (streamDeckWebSocket) {
        var json = {
            event: "setImage",
            context: inUUID,
            payload: {
                image: inImage,
                target: inTarget,
                state: inState,
            },
        };

        streamDeckWebSocket.send(JSON.stringify(json));
    }
}

// Set the state of a key
function setState(inUUID, inState) {
    if (streamDeckWebSocket) {
        var json = {
            event: "setState",
            context: inUUID,
            payload: {
                state: inState,
            },
        };

        streamDeckWebSocket.send(JSON.stringify(json));
    }
}

// Set data to PI
function sendToPropertyInspector(inAction, inContext, inData) {
    if (streamDeckWebSocket) {
        var json = {
            action: inAction,
            event: "sendToPropertyInspector",
            context: inContext,
            payload: inData,
        };

        streamDeckWebSocket.send(JSON.stringify(json));
    }
}

// Set data to plugin
function sendToPlugin(inAction, inContext, inData) {
    if (streamDeckWebSocket) {
        var json = {
            action: inAction,
            event: "sendToPlugin",
            context: inContext,
            payload: inData,
        };

        streamDeckWebSocket.send(JSON.stringify(json));
    }
}

// Load the localizations
function getLocalization(inLanguage, inCallback) {
    var url = "../" + inLanguage + ".json";
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onload = function () {
        if (xhr.readyState == XMLHttpRequest.DONE) {
            try {
                data = JSON.parse(xhr.responseText);
                var localization = data["Localization"];
                inCallback(true, localization);
            } catch (e) {
                inCallback(false, "Localizations is not a valid json.");
            }
        } else {
            inCallback(false, "Could not load the localizations.");
        }
    };
    xhr.onerror = function () {
        inCallback(false, "An error occurred while loading the localizations.");
    };
    xhr.ontimeout = function () {
        inCallback(false, "Localization timed out.");
    };
    xhr.send();
}
