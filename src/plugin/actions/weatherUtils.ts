import type { HomeAssistantEntity } from "../../shared/types";

export function formatWeatherTitle(entity: HomeAssistantEntity): string {
    const condition = entity.state;
    const temperature = entity.attributes["temperature"];
    const temperatureUnit = entity.attributes["temperature_unit"] as string | undefined;

    if (temperature === undefined || temperature === null) {
        return condition;
    }

    const unit = temperatureUnit ?? "°";
    return `${condition}\n${temperature}${unit}`;
}
