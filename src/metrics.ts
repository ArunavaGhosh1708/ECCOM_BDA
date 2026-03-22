import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

export const register = new Registry();

collectDefaultMetrics({ register });

const serviceName = process.env.SERVICE_NAME ?? 'app-service';

export const httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'service'],
    registers: [register],
});

export const httpRequestDurationSeconds = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code', 'service'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [register],
});

export function metricsMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const start = Date.now();

    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = (req.route?.path as string | undefined) ?? req.path ?? 'unknown';
        const labels = {
            method: req.method,
            route,
            status_code: String(res.statusCode),
            service: serviceName,
        };
        httpRequestsTotal.inc(labels);
        httpRequestDurationSeconds.observe(labels, duration);
    });

    next();
}

export async function metricsHandler(_req: Request, res: Response): Promise<void> {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
}
