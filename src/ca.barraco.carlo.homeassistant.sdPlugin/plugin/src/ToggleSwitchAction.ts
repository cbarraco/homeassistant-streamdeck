class ToggleSwitchAction implements BaseAction {
  type: string = "ca.barraco.carlo.toggleSwitch.action";
  settingsCache: { [x: string]: any } = {};
  webSocket: WebSocket;

  constructor(ws: WebSocket) {
      this.webSocket = ws;
  }

  onWillAppear(context: string, settings: any, _coordinates: any) {
    settingsCache[context] = settings;
  }

  onUpdateSettings(context: any, settings: any) {
    const json = {
      event: "setSettings",
      context: context,
      payload: settings,
    };
    websocket.send(JSON.stringify(json));
  }

  onRequestSettings(action: any, context: string) {
    const json = {
      action: action,
      event: "sendToPropertyInspector",
      context: context,
      payload: settingsCache[context],
    };

    websocket.send(JSON.stringify(json));
  }

  onKeyUp(
    context: any,
    settings: {
      [x: string]: any;
    },
    _coordinates: any,
    _userDesiredState: any
  ) {
    if (settings["ip"] == null) {
      showAlert(context);
    } else if (settings["authtoken"] == null) {
      showAlert(context);
    } else if (settings["domain"] == null) {
      showAlert(context);
    } else if (settings["service"] == null) {
      showAlert(context);
    } else if (settings["data"] == null) {
      showAlert(context);
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
  }
}
