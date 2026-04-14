import type { Request, Response, NextFunction } from 'express';
import { logTelemetry } from '../telemetry/logger';
import type { RequestWithTelemetry } from '../types/telemetry';

const FAIL_MODE = process.env.FAIL_MODE ?? 'none';
const AUTH_PATH_PREFIXES = ['/login', '/signup', '/logout', '/google'];

function getPathname(req: Request): string {
    return (req.originalUrl ?? req.url ?? req.path ?? 'unknown').split('?')[0];
}

function isAuthRequest(req: Request): boolean {
    const path = getPathname(req);
    return (
        path.startsWith('/auth') ||
        AUTH_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
    );
}

export default function failureInjectionMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    if (FAIL_MODE === 'auth' && isAuthRequest(req)) {
        logTelemetry(
            req as RequestWithTelemetry,
            res,
            'ERROR',
            'system',
            'service.unavailable',
            'Auth service unavailable (FAIL_MODE=auth)',
            { error: { name: 'ServiceUnavailable', message: 'Auth service unavailable' } }
        );
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Auth service unavailable',
        });
        return;
    }

    if (FAIL_MODE === 'cart' && req.path.startsWith('/cart')) {
        logTelemetry(
            req as RequestWithTelemetry,
            res,
            'ERROR',
            'system',
            'service.unavailable',
            'Cart service unavailable (FAIL_MODE=cart)',
            { error: { name: 'ServiceUnavailable', message: 'Cart service unavailable' } }
        );
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Cart service unavailable',
        });
        return;
    }

    next();
}
