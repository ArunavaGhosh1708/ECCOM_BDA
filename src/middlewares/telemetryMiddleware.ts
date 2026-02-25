import type { NextFunction, Response } from 'express';
import crypto from 'crypto';
import type { RequestWithTelemetry } from '../types/telemetry';

function parseTraceParent(headerValue?: string): {
    traceId: string;
    spanId: string;
} {
    if (!headerValue) {
        return {
            traceId: crypto.randomBytes(16).toString('hex'),
            spanId: crypto.randomBytes(8).toString('hex'),
        };
    }
    const parts = headerValue.split('-');
    if (parts.length >= 4) {
        return {
            traceId: parts[1],
            spanId: parts[2],
        };
    }
    return {
        traceId: crypto.randomBytes(16).toString('hex'),
        spanId: crypto.randomBytes(8).toString('hex'),
    };
}

export default function telemetryMiddleware(
    req: RequestWithTelemetry,
    _res: Response,
    next: NextFunction
): void {
    const { traceId, spanId } = parseTraceParent(
        req.headers['traceparent'] as string
    );

    const env =
        (process.env.NODE_ENV as
            | 'local'
            | 'dev'
            | 'staging'
            | 'production') ?? 'local';

    req.telemetry = {
        requestId: crypto.randomUUID(),
        traceId,
        spanId,
        userId: (req.user as any)?.id ?? null,
        sessionId: (req.session as any)?.id ?? null,
        environment: env,
    };
    next();
}
