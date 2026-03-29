import streamDeck from "@elgato/streamdeck";

import { CallServiceAction } from "./callService";
import { CameraFeedAction } from "./cameraFeed";
import { MediaPlayerAction } from "./mediaPlayer";
import { SetLightColorAction } from "./setLightColor";
import { StepLightBrightnessAction } from "./stepLightBrightness";
import { ToggleLightAction } from "./toggleLight";
import { ToggleSwitchAction } from "./toggleSwitch";
import { TriggerAutomationAction } from "./triggerAutomation";
import { RunScriptAction } from "./runScript";

export function registerActions(): void {
    streamDeck.actions.registerAction(new ToggleSwitchAction());
    streamDeck.actions.registerAction(new CallServiceAction());
    streamDeck.actions.registerAction(new ToggleLightAction());
    streamDeck.actions.registerAction(new SetLightColorAction());
    streamDeck.actions.registerAction(new StepLightBrightnessAction());
    streamDeck.actions.registerAction(new CameraFeedAction());
    streamDeck.actions.registerAction(new MediaPlayerAction());
    streamDeck.actions.registerAction(new TriggerAutomationAction());
    streamDeck.actions.registerAction(new RunScriptAction());
}
