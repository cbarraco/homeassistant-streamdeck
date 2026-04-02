export function buildVacuumServiceCall(
    command: string,
    entityId: string,
): { domain: string; service: string; serviceData: Record<string, unknown> } {
    const validCommands = ["start", "stop", "pause", "return_to_base"];
    const service = validCommands.includes(command) ? command : "start";
    return {
        domain: "vacuum",
        service,
        serviceData: { entity_id: entityId },
    };
}
