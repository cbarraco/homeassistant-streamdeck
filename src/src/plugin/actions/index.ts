import streamDeck from "@elgato/streamdeck";

import { CallServiceAction } from "./callServiceAction";
import { CameraFeedAction } from "./cameraFeedAction";
import { MediaPlayerAction } from "./mediaPlayerAction";
import { SetLightColorAction } from "./setLightColorAction";
import { StepLightBrightnessAction } from "./stepLightBrightnessAction";
import { ToggleLightAction } from "./toggleLightAction";
import { ToggleSwitchAction } from "./toggleSwitchAction";

export function registerActions(): void {
    streamDeck.actions.registerAction(new ToggleSwitchAction());
    streamDeck.actions.registerAction(new CallServiceAction());
    streamDeck.actions.registerAction(new ToggleLightAction());
    streamDeck.actions.registerAction(new SetLightColorAction());
    streamDeck.actions.registerAction(new StepLightBrightnessAction());
    streamDeck.actions.registerAction(new CameraFeedAction());
    streamDeck.actions.registerAction(new MediaPlayerAction());
}
