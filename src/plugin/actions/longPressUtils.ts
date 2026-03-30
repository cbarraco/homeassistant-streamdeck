export const LONG_PRESS_THRESHOLD_MS = 500;

export type LongPressServiceCall = {
    domain: string;
    service: string;
    serviceData: Record<string, unknown>;
};

export type LongPressParseError = {
    error: string;
};

/**
 * Returns true if the hold duration meets the long-press threshold.
 */
export function isLongPress(holdDurationMs: number): boolean {
    return holdDurationMs >= LONG_PRESS_THRESHOLD_MS;
}

/**
 * Parses a service ID ("domain.service") and JSON payload string into the
 * components needed to call a Home Assistant service.
 *
 * Returns an error object when the service ID is invalid or the payload is
 * not valid JSON.
 */
export function parseLongPressServiceCall(
    serviceId: string,
    payloadString: string,
): LongPressServiceCall | LongPressParseError {
    const dotIndex = serviceId.indexOf(".");
    if (dotIndex <= 0 || dotIndex === serviceId.length - 1) {
        return { error: `Invalid service id: ${serviceId}` };
    }

    const domain = serviceId.slice(0, dotIndex);
    const service = serviceId.slice(dotIndex + 1);

    let serviceData: Record<string, unknown>;
    try {
        serviceData = JSON.parse(payloadString || "{}");
    } catch {
        return { error: `Invalid JSON payload: ${payloadString}` };
    }

    if (typeof serviceData !== "object" || serviceData === null || Array.isArray(serviceData)) {
        return { error: `Payload must be a JSON object, got: ${payloadString}` };
    }

    return { domain, service, serviceData };
}

/**
 * Type guard to check if a parse result is an error.
 */
export function isLongPressParseError(
    result: LongPressServiceCall | LongPressParseError,
): result is LongPressParseError {
    return "error" in result;
}
