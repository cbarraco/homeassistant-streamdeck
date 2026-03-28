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
- Action that can call a service

See the Projects tab for upcoming features

## Building

1. `cd src/ca.barraco.carlo.homeassistant.sdPlugin`
2. Install dependencies once: `npm install`
3. (Optional) Compile the TypeScript sources for quick iteration: `npm run build`
4. Package the plugin: `npm run export` (this command always runs the TypeScript build first)

All JavaScript inside `lib/`, `plugin/js/`, and `pi/js/` is generated from TypeScript and ignored by git. Make sure you run `npm run build` (or `npm run export`) before testing or distributing changes so the runtime artifacts are up to date. The resulting `.streamDeckPlugin` bundle will be generated under the `build/` directory.
