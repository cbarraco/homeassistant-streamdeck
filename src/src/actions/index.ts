import streamDeck from "@elgato/streamdeck";

import { CallServiceAction } from "./callServiceAction";
import { SetLightColorAction } from "./setLightColorAction";
import { ToggleLightAction } from "./toggleLightAction";
import { ToggleSwitchAction } from "./toggleSwitchAction";

export function registerActions(): void {
    streamDeck.actions.registerAction(new ToggleSwitchAction());
    streamDeck.actions.registerAction(new CallServiceAction());
    streamDeck.actions.registerAction(new ToggleLightAction());
    streamDeck.actions.registerAction(new SetLightColorAction());
}
