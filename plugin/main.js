let websocket = null;
let pluginUUID = null;
let settingsCache = {};

const baseAction = {
  onWillAppear: function (context, settings, coordinates) {
    settingsCache[context] = settings;
  },

  showAlert: function (context) {
    const json = {
      event: "showAlert",
      context: context,
    };
    websocket.send(JSON.stringify(json));
  },

  onUpdateSettings: function (context, settings) {
    const json = {
      event: "setSettings",
      context: context,
      payload: settings,
    };
    websocket.send(JSON.stringify(json));
  },

  onRequestSettings: function (action, context) {
    const json = {
      action: action,
      event: "sendToPropertyInspector",
      context: context,
      payload: settingsCache[context],
    };

    websocket.send(JSON.stringify(json));
  },
};

const webhookAction = {
  type: "ca.barraco.carlo.toggleEntity.action",

  callService: function (context, settings, coordinates, userDesiredState) {
    if (settings["ip"] == null) {
      this.showAlert(context);
    } else if (settings["authtoken"] == null) {
      this.showAlert(context);
    } else if (settings["domain"] == null) {
      this.showAlert(context);
    } else if (settings["service"] == null) {
      this.showAlert(context);
    } else if (settings["data"] == null) {
      this.showAlert(context);
    } else {
      const request = new XMLHttpRequest();
      const url = `${settings["ip"]}/api/services/${settings["domain"]}/${settings["service"]}`;
      request.open("POST", url);
      request.setRequestHeader(
        "Authorization",
        `Bearer ${settings["authtoken"]}`
      );
      if (settings["data"] !== "") {
        request.setRequestHeader("Content-Type", "application/json");
        request.send(settings["data"]);
      } else {
        request.send();
      }
    }
  },
};

function connectSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) {
  pluginUUID = inPluginUUID;

  websocket = new WebSocket("ws://localhost:" + inPort);

  function registerPlugin(inPluginUUID) {
    const json = {
      event: inRegisterEvent,
      uuid: inPluginUUID,
    };
    websocket.send(JSON.stringify(json));
  }

  websocket.onopen = function () {
    registerPlugin(pluginUUID);
  };

  websocket.onmessage = function (event) {
    // Received message from Stream Deck
    const eventData = JSON.parse(event.data);
    const event = eventData["event"];
    const action = eventData["action"];
    const context = eventData["context"];
    const payload = eventData["payload"];

    if (event == "keyUp") {
      const settings = payload["settings"];
      const coordinates = payload["coordinates"];
      const userDesiredState = payload["userDesiredState"];
      webhookAction.callService(
        context,
        settings,
        coordinates,
        userDesiredState
      );
    } else if (event == "willAppear") {
      const settings = payload["settings"];
      const coordinates = payload["coordinates"];
      baseAction.onWillAppear(context, settings, coordinates);
    } else if (event == "sendToPlugin") {
      if (payload["type"] == "updateSettings") {
        baseAction.onUpdateSettings(context, payload);
        settingsCache[context] = payload;
      } else if (payload["type"] == "requestSettings") {
        baseAction.onRequestSettings(action, context);
      }
    }
  };
}
