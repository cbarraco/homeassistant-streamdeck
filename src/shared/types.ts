import type { JsonObject, JsonValue } from "@elgato/utils";

export interface HomeAssistantEntityAttributes extends JsonObject {
    color_mode?: string;
    rgb_color?: [number, number, number];
    color_temp?: number;
    min_mireds?: number;
    max_mireds?: number;
    supported_features?: number;
    supported_color_modes?: string[];
    [key: string]: JsonValue | undefined;
}

export interface HomeAssistantEntity extends JsonObject {
    entity_id: string;
    state: string;
    attributes: HomeAssistantEntityAttributes;
    [key: string]: JsonValue | undefined;
}

export interface HomeAssistantCache extends JsonObject {
    entities: Record<string, HomeAssistantEntity[]>;
    services: Record<string, string[]>;
    [key: string]: JsonValue | undefined;
}

export interface GlobalSettings extends JsonObject {
    homeAssistantAddress?: string;
    accessToken?: string;
    encrypted?: boolean;
}

export type ColorType = "RGB" | "Temperature" | "None" | undefined;

export type BrightnessDirection = "up" | "down";

export interface ActionSettings extends JsonObject {
    entityId?: string;
    serviceId?: string;
    payload?: string;
    brightness?: number;
    color?: string;
    colorType?: ColorType;
    temperature?: number;
    brightnessStep?: number;
    direction?: BrightnessDirection;
    refreshInterval?: number;
    mediaCommand?: string;
    alarmCommand?: string;
    coverCommand?: string;
}
