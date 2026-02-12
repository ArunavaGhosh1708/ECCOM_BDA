import type { NextFunction, Response } from 'express';
import { validationResult } from 'express-validator';
import type { IRequestWithFlashMessages } from '../types/requestTypes';
import { setFlashMessage } from '../utilities';
import type { flashMessage } from '../types/flashMessageType';

export default (
    req: IRequestWithFlashMessages,
    res: Response,
    next: NextFunction
): void => {
    const result = validationResult(req);
    if (result.isEmpty()) {
        next();
        return;
    }

    const errors = result.array().map((error): flashMessage => {
        return { type: 'warning', message: error.msg };
    });
    setFlashMessage(req, errors);
    res.redirect('back');
};
