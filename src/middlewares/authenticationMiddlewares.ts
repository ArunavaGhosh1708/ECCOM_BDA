import type { NextFunction, Request, Response } from 'express';
import { setFlashMessage } from '../utilities';
import type { IRequestWithAuthenticatedUser } from '../types/requestTypes';
import { USER_ROLES } from '../constants';

export function ensureLoggedInMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    if (req.user === undefined) {
        setFlashMessage(req, {
            type: 'info',
            message: 'You need to login to continue',
        });
        res.redirect('/auth/login');
        return;
    }
    next();
}

export async function ensureAdminUserMiddleware(
    req: IRequestWithAuthenticatedUser,
    res: Response,
    next: NextFunction
): Promise<void> {
    if (req.user === undefined || req.user.role !== USER_ROLES.admin) {
        setFlashMessage(req, {
            type: 'warning',
            message: 'You are not authorized to access this feature',
        });
        res.redirect('back');
        return;
    }
    next();
}
