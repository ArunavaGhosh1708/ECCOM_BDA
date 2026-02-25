import type { NextFunction, Request, Response } from 'express';
import type {
    IRequestWithAuthenticatedUser,
    IRequestWithUserSignupForm,
} from '../types/requestTypes';
import { matchedData } from 'express-validator';
import { setFlashMessage } from '../utilities';
import db from '../database';
import mailerConfig from '../config/mailerConfig';
import { UserRoleEnum } from '../types/models/userTypes';
import { logTelemetry } from '../telemetry/logger';
import type { RequestWithTelemetry } from '../types/telemetry';

const User = db.users;

export function getSignup(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    try {
        res.render('auth/signup');
    } catch (error) {
        next(error);
    }
}

export async function postSignup(
    req: IRequestWithUserSignupForm & RequestWithTelemetry,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (req.isAuthenticated()) {
            res.redirect('/products');
            return;
        }

        const { name, email, password } = matchedData(req);
        const newAccount = (
            await User.findOrCreate({
                where: {
                    email,
                },
                defaults: {
                    name,
                    email,
                    password,
                    role:
                        email === mailerConfig.MAILER_USER
                            ? UserRoleEnum.admin
                            : UserRoleEnum.customer,
                },
            })
        ).at(-1) as boolean;

        if (!newAccount) {
            setFlashMessage(req, {
                type: 'danger',
                message: 'User account exists!',
            });
            res.redirect('/auth/login');
            return;
        }

        setFlashMessage(req, {
            type: 'success',
            message: `Account created!. We've reserved a space for you in our store :) `,
        });
        logTelemetry(
            req,
            res,
            'INFO',
            'user_session',
            'user.signup',
            `User ${email} signed up`,
            {
                user_session: {
                    auth_method: 'password',
                    device_type: 'web',
                },
            }
        );
        res.redirect('/auth/login');
    } catch (error) {
        next(error);
    }
}

export function getLogin(
    req: RequestWithTelemetry,
    res: Response,
    next: NextFunction
): void {
    try {
        if (req.isAuthenticated()) {
            res.redirect('/products');
            return;
        }
        res.render('auth/login');
    } catch (error) {
        next(error);
    }
}

export function getLogout(
    req: IRequestWithAuthenticatedUser & RequestWithTelemetry,
    res: Response,
    next: NextFunction
): void {
    try {
        req.session.destroy((err: Error) => {
            if (err !== undefined) {
                next(err);
            }
            logTelemetry(
                req,
                res,
                'INFO',
                'user_session',
                'user.logout',
                'User logged out',
                {
                    user_session: {
                        auth_method: 'password',
                        device_type: 'web',
                    },
                }
            );
            res.redirect('/products');
        });
    } catch (error) {
        next(error);
    }
}
