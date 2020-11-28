let websocket: WebSocket | null = null;
let pluginUUID: string = "";
let settingsCache = {};

const showAlert = function (context: any) {
  const json = {
    event: "showAlert",
    context: context,
  };
  websocket?.send(JSON.stringify(json));
};

const setTitle = function (context: any) {
  const json = {
    event: "setTitle",
    context: context,
    title: "CarloB"
  };
  websocket?.send(JSON.stringify(json));
};

const toggleSwitchAction = new ToggleSwitchAction(websocket);
const actionMap: {[x:string]: BaseAction} = {
  "ca.barraco.carlo.homeassistant.toggleSwitch.action": toggleSwitchAction,
};
function connectSocket(inPort: string, inPluginUUID: string, inRegisterEvent: any, _inInfo: any) {
  pluginUUID = inPluginUUID;

  websocket = new WebSocket("ws://127.0.0.1:" + inPort);

  function registerPlugin(inPluginUUID: string) {
    const json = {
      event: inRegisterEvent,
      uuid: inPluginUUID,
    };
    websocket?.send(JSON.stringify(json));
  }

  websocket.onopen = function () {
    registerPlugin(pluginUUID);
  };

  websocket.onmessage = function (e) {
    const eventData = JSON.parse(e.data);
    const event = eventData["event"];
    const action = eventData["action"];
    const context = eventData["context"];
    const payload = eventData["payload"];

    if (event == "keyUp") {
      const settings = payload["settings"];
      const coordinates = payload["coordinates"];
      const userDesiredState = payload["userDesiredState"];
      showAlert(context);
      actionMap[action].onKeyUp(
        context,
        settings,
        coordinates,
        userDesiredState
      );
    } else if (event == "willAppear") {
      const settings = payload["settings"];
      const coordinates = payload["coordinates"];
      actionMap[action].onWillAppear(context, settings, coordinates);
    } else if (event == "sendToPlugin") {
      if (payload["type"] == "updateSettings") {
        actionMap[action].onUpdateSettings(context, payload);
        settingsCache[context] = payload;
      } else if (payload["type"] == "requestSettings") {
        actionMap[action].onRequestSettings(action, context);
      }
    }
  };
}
