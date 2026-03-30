import type { HomeAssistantEntityAttributes } from "../../shared/types";

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
