import type { PropertyInspectorCommand } from "./enums.js";
import type { GlobalSettings } from "./state/store.js";
export {
    appStore,
    type AppState,
    type Dictionary,
    type GlobalSettings,
    type HomeAssistantCache,
    type HomeAssistantEntity,
    type HomeAssistantEntityAttributes,
} from "./state/store.js";

declare global {
    interface Window {
        connectElgatoStreamDeckSocket?: (...args: unknown[]) => void;
        sendCredentialsToPropertyInspector?: (message: {
            command: PropertyInspectorCommand;
            data: GlobalSettings;
        }) => void;
    }
}
