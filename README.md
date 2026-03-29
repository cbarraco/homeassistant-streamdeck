# homeassistant-streamdeck

Home Assistant integration with the Elgato Stream Deck

![GitHub](https://img.shields.io/github/license/cbarraco/homeassistant-streamdeck)

## Feature List

- Store authentication details in secure global settings
- Buttons are updated in realtime with feedback from Home Assistant
- Suggestions based on entities in Home Assistant
- Action that can toggle a switch
- Action that can toggle a light
- Action that set a light to a specific color
- Action that can step a light's brightness up or down
- Action that can call a service
- Action that can trigger an automation
- Action that can run a script
- Action that can arm or disarm an alarm control panel
- Action that displays the current state of any entity on the button
- Action that can open, close, stop, or toggle a cover (blinds, garage door, etc.)
- Action that shows a live camera thumbnail
- Action that controls a media player

See the Projects tab for upcoming features

## Building

1. `cd src`
2. Install dependencies: `npm install`
3. Build the plugin and property inspector bundles: `npm run build`
4. For rapid iteration on the plugin runtime, use `npm run watch`

The Rollup build emits the plugin runtime at `ca.barraco.carlo.homeassistant.sdPlugin/bin/plugin.js`. Property inspector bundles are generated under `ca.barraco.carlo.homeassistant.sdPlugin/ui/js/`. Run `streamdeck plugin pack` (or `npm run build && streamdeck plugin pack`) to produce a `.streamDeckPlugin` when you are ready to test or distribute.
