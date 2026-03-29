import { PropertyInspectorController } from "./controller";

const controller = new PropertyInspectorController();

const connectElgatoStreamDeckSocketPI = (
    inPort: string,
    inUUID: string,
    inRegisterEvent: string,
    inInfo: string,
    inActionInfo: string
): void => {
    controller.initialize(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo);
};

window.connectElgatoStreamDeckSocket = connectElgatoStreamDeckSocketPI as unknown as
    typeof window.connectElgatoStreamDeckSocket;
window.sendCredentialsToPropertyInspector = controller.sendCredentialsToPropertyInspector.bind(controller);

