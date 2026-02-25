import type { Request } from 'express';

export type TelemetryLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export type TelemetryCategory =
    | 'user_session'
    | 'cart_checkout'
    | 'payment_fraud'
    | 'system'
    | 'integration';

export interface TelemetryContext {
    requestId: string;
    traceId: string;
    spanId: string;
    userId?: string | null;
    sessionId?: string | null;
    environment: 'local' | 'dev' | 'staging' | 'production';
}

export type TelemetryBase = {
    timestamp: string;
    level: TelemetryLevel;
    service: string;
    version: string;
    environment: TelemetryContext['environment'];
    trace_id: string;
    span_id: string;
    request_id: string;
    user_id: string | null;
    session_id: string | null;
    category: TelemetryCategory;
    event: string;
    message: string;
    duration_ms?: number | null;
    http?: {
        method?: string;
        path?: string;
        status_code?: number;
        user_agent?: string;
    } | null;
    error?: {
        type?: string;
        message?: string;
        stacktrace?: string;
        code?: string | null;
    } | null;
    tags?: Record<string, string>;
};

export interface RequestWithTelemetry extends Request {
    telemetry?: TelemetryContext;
}
