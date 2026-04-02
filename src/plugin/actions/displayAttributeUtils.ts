import type { HomeAssistantEntity, HomeAssistantEntityAttributes } from "../../shared/types";

export function getAttributeValue(entity: HomeAssistantEntity, attributeKey: string): string | null {
    if (!attributeKey) {
        return null;
    }
    const value = entity.attributes[attributeKey];
    if (value === undefined || value === null) {
        return null;
    }
    if (Array.isArray(value)) {
        return value.join(", ");
    }
    return String(value);
}

export function getAttributeDisplayValue(
    attributes: HomeAssistantEntityAttributes,
    attributeKey: string,
): string {
    if (!attributeKey) {
        return "";
    }
    const value = attributes[attributeKey];
    if (value === undefined || value === null) {
        return "";
    }
    if (Array.isArray(value)) {
        return value.join(", ");
    }
    return String(value);
}
