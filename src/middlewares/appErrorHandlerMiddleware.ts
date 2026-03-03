import type { NextFunction, Request, Response } from 'express';
import { setFlashMessage } from '../utilities';

export default (
    error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (res.headersSent) {
        next(error);
        return;
    }

    if (error.name === 'TimeoutError' && error.http_code === 499) {
        setFlashMessage(req, {
            type: 'info',
            message: 'You might be experiencing some network issues...',
        });
        res.status(500).send('Network timeout. Please retry.');
        return;
    }

    if (typeof error.message === 'string' && error.message.length > 0) {
        // If session isn't available, avoid redirect loops; just send text.
        if (req.session) {
            setFlashMessage(req, {
                type: 'danger',
                message: error.message,
            });
            res.status(500).send(error.message);
        } else {
            res.status(500).send(error.message);
        }
        return;
    }

    console.log(error);
    res.status(500).send(
        'Something went wrong. If this persists, contact support.'
    );
};
