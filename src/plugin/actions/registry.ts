import streamDeck from "@elgato/streamdeck";
import type { SingletonAction } from "@elgato/streamdeck";

const pending: SingletonAction[] = [];

export function selfRegister(action: SingletonAction): void {
    pending.push(action);
}

export function registerActions(): void {
    for (const action of pending) {
        streamDeck.actions.registerAction(action);
    }
}
