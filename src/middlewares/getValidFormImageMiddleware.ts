import type { NextFunction, Request, Response } from 'express';
import { setFlashMessage } from '../utilities';
import multer, { MulterError } from 'multer';
import {
    ALLOWED_IMAGE_TYPES,
    fileUploadLimit,
    ONE_MB_IN_BYTES,
} from '../constants';

const getImage = multer({
    limits: { fileSize: fileUploadLimit * ONE_MB_IN_BYTES },
}).single('image');

export default function getValidFormImage(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    getImage(req, res, async (err) => {
        if (err !== undefined && err?.code === 'LIMIT_FILE_SIZE') {
            setFlashMessage(req, {
                type: 'warning',
                message: `Upload failed because the size is greater than ${fileUploadLimit} MB. Try another file.`,
            });
            res.redirect('back');
            return;
        } else if (err instanceof MulterError) {
            setFlashMessage(req, {
                type: 'warning',
                message: err.message,
            });
            res.redirect('back');
            return;
        }

        if (req.file !== undefined) {
            const imageType = req.file.mimetype.split('/').at(-1) ?? '';
            if (!ALLOWED_IMAGE_TYPES.includes(imageType)) {
                setFlashMessage(req, {
                    type: 'warning',
                    message: `Unallowed file type. Only pictures of "${ALLOWED_IMAGE_TYPES.join(
                        ', '
                    )}" type are allowed`,
                });
                res.redirect('back');
                return;
            }
        }
        next();
    });
}
