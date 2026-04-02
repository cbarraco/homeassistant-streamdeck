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
import { AlarmControlPanelAction } from "./alarmControlPanel";
import { DisplayStateAction } from "./displayState";
import { ControlCoverAction } from "./controlCover";
import { ClimateControlAction } from "./climateControl";
import { LockControlAction } from "./lockControl";
import { TimerControlAction } from "./timerControl";
import { FanControlAction } from "./fanControl";
import { DisplayAttributeAction } from "./displayAttribute";
import { WeatherDisplayAction } from "./weatherDisplay";
import { VacuumControlAction } from "./vacuumControl";

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
    streamDeck.actions.registerAction(new AlarmControlPanelAction());
    streamDeck.actions.registerAction(new DisplayStateAction());
    streamDeck.actions.registerAction(new ControlCoverAction());
    streamDeck.actions.registerAction(new ClimateControlAction());
    streamDeck.actions.registerAction(new LockControlAction());
    streamDeck.actions.registerAction(new TimerControlAction());
    streamDeck.actions.registerAction(new FanControlAction());
    streamDeck.actions.registerAction(new DisplayAttributeAction());
    streamDeck.actions.registerAction(new WeatherDisplayAction());
    streamDeck.actions.registerAction(new VacuumControlAction());
}
