/* global $CC, Utils, $SD */

$SD.on("connected", (jsonObj) => connected(jsonObj));

function connected(jsn) {
    $SD.on("com.elgato.template.action.willAppear", (jsonObj) =>
        action.onWillAppear(jsonObj)
    );
    $SD.on("com.elgato.template.action.keyUp", (jsonObj) =>
        action.onKeyUp(jsonObj)
    );
    $SD.on("com.elgato.template.action.sendToPlugin", (jsonObj) =>
        action.onSendToPlugin(jsonObj)
    );
    $SD.on("com.elgato.template.action.didReceiveSettings", (jsonObj) =>
        action.onDidReceiveSettings(jsonObj)
    );
    $SD.on(
        "com.elgato.template.action.propertyInspectorDidAppear",
        (jsonObj) => {
            console.log(
                "%c%s",
                "color: white; background: black; font-size: 13px;",
                "[app.js]propertyInspectorDidAppear:"
            );
        }
    );
    $SD.on(
        "com.elgato.template.action.propertyInspectorDidDisappear",
        (jsonObj) => {
            console.log(
                "%c%s",
                "color: white; background: red; font-size: 13px;",
                "[app.js]propertyInspectorDidDisappear:"
            );
        }
    );
}

const action = {
    settings: {},
    onDidReceiveSettings: function (jsn) {
        console.log(
            "%c%s",
            "color: white; background: red; font-size: 15px;",
            "[app.js]onDidReceiveSettings:"
        );

        this.settings = Utils.getProp(jsn, "payload.settings", {});
        this.logStuff(this.settings, "onDidReceiveSettings", "orange");
        this.setTitle(jsn);
    },

    onWillAppear: function (jsn) {
        console.log(
            "You can cache your settings in 'onWillAppear'",
            jsn.payload.settings
        );

        this.settings = jsn.payload.settings;
        var arequest = {
            contentType: "application/json",
            url: `${ip}/api/states/switch.office_lamp_msl120_main_channel`, // ip from secrets.js
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", `Bearer ${authtoken}`); // authtoken from secrets.js
            },
            type: "GET",
            success: function (result) {
                $SD.api.setTitle(jsn.context, result.state);
            },
        };
        $.ajax(arequest);
    },

    onKeyUp: function (jsn) {
        const domain = "homeassistant";
        const service = "toggle";
        const data = '{"entity_id":"switch.office_lamp_msl120_main_channel"}';
        const url = `${ip}/api/services/${domain}/${service}`; // ip from secrets.js
        const request = new XMLHttpRequest();
        request.open("POST", url, false);
        request.setRequestHeader("Authorization", `Bearer ${authtoken}`); // authtoken from secrets.js
        if (data !== "") {
            request.setRequestHeader("Content-Type", "application/json");
            request.send(data);
        } else {
            request.send();
        }

        var arequest = {
            contentType: "application/json",
            url: `${ip}/api/states/switch.office_lamp_msl120_main_channel`, // ip from secrets.js
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", `Bearer ${authtoken}`); // authtoken from secrets.js
            },
            type: "GET",
            success: function (result) {
                $SD.api.setTitle(jsn.context, result.state);
            },
        };
        $.ajax(arequest);
    },

    onSendToPlugin: function (jsn) {
        const sdpi_collection = Utils.getProp(
            jsn,
            "payload.sdpi_collection",
            {}
        );
        if (sdpi_collection.value && sdpi_collection.value !== undefined) {
            this.logStuff(
                { [sdpi_collection.key]: sdpi_collection.value },
                "onSendToPlugin",
                "fuchsia"
            );
        }
    },

    saveSettings: function (jsn, sdpi_collection) {
        console.log("saveSettings:", jsn);
        if (
            sdpi_collection.hasOwnProperty("key") &&
            sdpi_collection.key != ""
        ) {
            if (sdpi_collection.value && sdpi_collection.value !== undefined) {
                this.settings[sdpi_collection.key] = sdpi_collection.value;
                console.log("setSettings....", this.settings);
                $SD.api.setSettings(jsn.context, this.settings);
            }
        }
    },

    setTitle: function (jsn) {
        if (this.settings && this.settings.hasOwnProperty("mynameinput")) {
            console.log(
                "watch the key on your StreamDeck - it got a new title...",
                this.settings.mynameinput
            );
            $SD.api.setTitle(jsn.context, this.settings.mynameinput);
        }
    },

    logStuff: function (inJsonData, caller, tagColor) {
        console.log(
            "%c%s",
            `color: white; background: ${tagColor || "grey"}; font-size: 15px;`,
            `[app.js]logStuff from: ${caller}`
        );
    },
};
