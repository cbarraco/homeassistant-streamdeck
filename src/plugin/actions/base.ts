import {
  KeyAction,
  KeyDownEvent,
  KeyUpEvent,
  DidReceiveSettingsEvent,
  PropertyInspectorDidAppearEvent,
  PropertyInspectorDidDisappearEvent,
  SendToPluginEvent,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
} from "@elgato/streamdeck";
import type { JsonValue } from "@elgato/utils";
import streamDeck from "@elgato/streamdeck";

import {
  PluginCommands,
  PropertyInspectorCommands,
} from "../../shared/commands";
import type { ActionSettings, HomeAssistantCache } from "../../shared/types";
import { cacheManager } from "../state/cache";
import { homeAssistantClient } from "../services/homeAssistant";

interface RegisteredContext<TSettings extends ActionSettings> {
  action: KeyAction<TSettings>;
  settings: TSettings;
}

type SendToPluginPayload = {
  command?: string;
};

export abstract class BaseAction<
  TSettings extends ActionSettings = ActionSettings,
> extends SingletonAction<TSettings> {
  private contexts = new Map<string, RegisteredContext<TSettings>>();
  private inspectorVisible = false;
  private unsubscribeFromCache: (() => void) | null = null;

  constructor() {
    super();
    this.unsubscribeFromCache = cacheManager.subscribe((cache) =>
      this.broadcastCache(cache),
    );
  }

  override async onWillAppear(ev: WillAppearEvent<TSettings>): Promise<void> {
    if (!ev.action.isKey()) {
      return;
    }
    this.contexts.set(ev.action.id, {
      action: ev.action,
      settings: (ev.payload?.settings ?? {}) as TSettings,
    });
    await this.handleWillAppear(ev);
  }

  override async onWillDisappear(
    ev: WillDisappearEvent<TSettings>,
  ): Promise<void> {
    this.contexts.delete(ev.action.id);
    this.inspectorVisible = false;
    await this.handleWillDisappear(ev);
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<TSettings>,
  ): Promise<void> {
    const context = this.contexts.get(ev.action.id);
    if (context) {
      context.settings = (ev.payload?.settings ?? {}) as TSettings;
    }
    await this.handleSettingsChanged(ev);
  }

  override async onKeyDown(ev: KeyDownEvent<TSettings>): Promise<void> {
    const context = this.contexts.get(ev.action.id);
    if (context) {
      context.settings = (ev.payload?.settings ?? {}) as TSettings;
    }
    await this.handleKeyDown(ev);
  }

  override async onKeyUp(ev: KeyUpEvent<TSettings>): Promise<void> {
    await this.handleKeyUp(ev);
  }

  override async onPropertyInspectorDidAppear(
    ev: PropertyInspectorDidAppearEvent<TSettings>,
  ): Promise<void> {
    this.inspectorVisible = true;
    await this.sendCacheUpdate();
    await this.handlePropertyInspectorDidAppear(ev);
  }

  override async onPropertyInspectorDidDisappear(
    ev: PropertyInspectorDidDisappearEvent<TSettings>,
  ): Promise<void> {
    this.inspectorVisible = false;
    await this.handlePropertyInspectorDidDisappear(ev);
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, TSettings>,
  ): Promise<void> {
    const payload = ev.payload as SendToPluginPayload | undefined;
    if (!payload?.command) {
      return;
    }

    if (payload.command === PluginCommands.REQUEST_CACHE_UPDATE) {
      await this.sendCacheUpdate();
      return;
    }

    if (payload.command === PluginCommands.REQUEST_RECONNECT) {
      homeAssistantClient.requestReconnect();
    }
  }

  protected getContextSettings(contextId: string): TSettings | undefined {
    return this.contexts.get(contextId)?.settings;
  }

  protected getAllContexts(): Iterable<[string, RegisteredContext<TSettings>]> {
    return this.contexts.entries();
  }

  protected async sendCacheUpdate(): Promise<void> {
    if (!this.inspectorVisible) {
      return;
    }
    await streamDeck.ui.sendToPropertyInspector({
      command: PropertyInspectorCommands.UPDATE_CACHE,
      data: cacheManager.getSnapshot(),
    });
  }

  protected handleWillAppear(
    _ev: WillAppearEvent<TSettings>,
  ): void | Promise<void> {
    // optional override
  }

  protected handleWillDisappear(
    _ev: WillDisappearEvent<TSettings>,
  ): void | Promise<void> {
    // optional override
  }

  protected handleSettingsChanged(
    _ev: DidReceiveSettingsEvent<TSettings>,
  ): void | Promise<void> {
    // optional override
  }

  protected handleKeyDown(_ev: KeyDownEvent<TSettings>): void | Promise<void> {
    // optional override
  }

  protected handleKeyUp(_ev: KeyUpEvent<TSettings>): void | Promise<void> {
    // optional override
  }

  protected handlePropertyInspectorDidAppear(
    _ev: PropertyInspectorDidAppearEvent<TSettings>,
  ): void | Promise<void> {
    // optional override
  }

  protected handlePropertyInspectorDidDisappear(
    _ev: PropertyInspectorDidDisappearEvent<TSettings>,
  ): void | Promise<void> {
    // optional override
  }

  protected onCacheUpdated(_cache: HomeAssistantCache): void | Promise<void> {
    // optional override
  }

  private async broadcastCache(cache: HomeAssistantCache): Promise<void> {
    if (this.inspectorVisible) {
      await streamDeck.ui.sendToPropertyInspector({
        command: PropertyInspectorCommands.UPDATE_CACHE,
        data: cache,
      });
    }
    await this.onCacheUpdated(cache);
  }
}
