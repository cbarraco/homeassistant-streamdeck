import type { PropertyInspectorCommand } from "./propertyInspector/commands";
import type { GlobalSettings } from "./state/store";
export {
    appStore,
    type AppState,
    type Dictionary,
    type GlobalSettings,
    type HomeAssistantCache,
    type HomeAssistantEntity,
    type HomeAssistantEntityAttributes,
} from "./state/store";

declare global {
    interface Window {
        connectElgatoStreamDeckSocket?: (...args: unknown[]) => void;
        sendCredentialsToPropertyInspector?: (message: {
            command: PropertyInspectorCommand;
            data: GlobalSettings;
        }) => void;
    }
}
