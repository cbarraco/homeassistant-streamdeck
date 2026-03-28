import { PluginController } from "./controllers/pluginController.js";

const controller = new PluginController();

const connectElgatoStreamDeckSocketPlugin = (
    inPort: string,
    inPluginUUID: string,
    inRegisterEvent: string,
    inInfo: string
): void => {
    controller.initialize(inPort, inPluginUUID, inRegisterEvent, inInfo);
};

window.connectElgatoStreamDeckSocket = connectElgatoStreamDeckSocketPlugin as unknown as
    typeof window.connectElgatoStreamDeckSocket;
