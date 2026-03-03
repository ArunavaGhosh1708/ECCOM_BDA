import type { TelemetryContext } from './telemetry';

declare global {
    namespace Express {
        // Attach telemetry context set by telemetryMiddleware
        // Optional so existing handlers without telemetry still type-check
        interface Request {
            telemetry?: TelemetryContext;
        }
    }
}

export {};
