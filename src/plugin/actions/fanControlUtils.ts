export function buildFanServiceCall(
    command: string,
    entityId: string,
    percentageStep: number,
): { domain: string; service: string; serviceData: Record<string, unknown> } {
    if (command === "increase_speed" || command === "decrease_speed") {
        return {
            domain: "fan",
            service: command,
            serviceData: { entity_id: entityId, percentage_step: percentageStep },
        };
    }
    return {
        domain: "fan",
        service: "toggle",
        serviceData: { entity_id: entityId },
    };
}
