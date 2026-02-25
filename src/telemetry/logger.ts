import type { Response } from 'express';
import {
    TelemetryCategory,
    TelemetryLevel,
    RequestWithTelemetry,
    TelemetryContext,
    TelemetryBase,
} from '../types/telemetry';

type Extra =
    | Record<string, unknown>
    | null
    | undefined
    | {
          error?: Error & { code?: string };
          tags?: Record<string, string>;
          duration_ms?: number;
      };

function baseEnvelope(
    req: RequestWithTelemetry,
    res: Response | null,
    level: TelemetryLevel,
    category: TelemetryCategory,
    event: string,
    message: string
): TelemetryBase {
    const ctx: TelemetryContext = req.telemetry ?? {
        requestId: 'unknown',
        traceId: 'unknown',
        spanId: 'unknown',
        userId: null,
        sessionId: null,
        environment:
            (process.env.NODE_ENV as TelemetryBase['environment']) ?? 'local',
    };

    return {
        timestamp: new Date().toISOString(),
        level,
        service:
            process.env.SERVICE_NAME ??
            process.env.npm_package_name ??
            'app-service',
        version: process.env.SERVICE_VERSION ?? '0.0.0',
        environment: ctx.environment,
        trace_id: ctx.traceId,
        span_id: ctx.spanId,
        request_id: ctx.requestId,
        user_id: ctx.userId ?? null,
        session_id: ctx.sessionId ?? null,
        category,
        event,
        message,
        http:
            req.method && req.originalUrl
                ? {
                      method: req.method,
                      path: req.originalUrl,
                      status_code: res?.statusCode,
                      user_agent: req.headers['user-agent'] as string,
                  }
                : null,
        error: null,
        duration_ms: null,
        tags: {},
    };
}

export function logTelemetry(
    req: RequestWithTelemetry,
    res: Response | null,
    level: TelemetryLevel,
    category: TelemetryCategory,
    event: string,
    message: string,
    extra: Extra = {}
): void {
    const entry = baseEnvelope(req, res, level, category, event, message);

    if (extra && typeof extra === 'object') {
        if ('error' in extra && extra.error instanceof Error) {
            entry.error = {
                type: extra.error.name,
                message: extra.error.message,
                stacktrace: extra.error.stack,
                code: (extra.error as any)?.code ?? null,
            };
        }
        if ('duration_ms' in extra && typeof extra.duration_ms === 'number') {
            entry.duration_ms = extra.duration_ms;
        }
        if ('tags' in extra && typeof extra.tags === 'object') {
            entry.tags = {
                ...(entry.tags ?? {}),
                ...(extra.tags as Record<string, string>),
            };
        }
    }

    const categoryPayload =
        extra && typeof extra === 'object'
            ? Object.fromEntries(
                  Object.entries(extra).filter(
                      ([key]) =>
                          key !== 'error' &&
                          key !== 'duration_ms' &&
                          key !== 'tags'
                  )
              )
            : {};

    if (Object.keys(categoryPayload).length > 0) {
        (entry as any)[entry.category] = categoryPayload;
    }

    // Single-line JSON for log ingestion systems
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
}
