import type { Response, NextFunction } from 'express';
import db from '../database';
import { setFlashMessage } from '../utilities';
import type { IRequestWithAuthenticatedUser } from '../types/requestTypes';

const Coupon = db.coupons;

export async function postCreateCoupon(
    req: IRequestWithAuthenticatedUser,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const couponExists = await Coupon.findOne({
            where: {
                code: req.body.code,
            },
        });
        if (couponExists != null) {
            setFlashMessage(req, {
                message: 'Coupon already exists',
                type: 'info',
            });
            res.redirect('back');
            return;
        }

        await Coupon.create({
            ...req.body,
        });

        setFlashMessage(req, {
            message: 'Coupon created succesfully!',
            type: 'success',
        });
        res.redirect('back');
    } catch (err) {
        console.log(err);
        next(err);
    }
}

export async function getDeleteCouponById(
    req: IRequestWithAuthenticatedUser,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { couponId } = req.params;
        await Coupon.destroy({ where: { id: couponId } });
        setFlashMessage(req, { type: 'success', message: 'Coupon deleted!' });
        res.redirect('back');
    } catch (err) {
        console.log(err);
        next(err);
    }
}

export async function getUpdateCouponById(
    req: IRequestWithAuthenticatedUser,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { couponId } = req.params;
        const coupon = await Coupon.findByPk(couponId);
        res.render('admin/update-coupon.ejs', { coupon });
    } catch (err) {
        console.log(err);
        next(err);
    }
}

export async function postUpdateCouponById(
    req: IRequestWithAuthenticatedUser,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { couponId } = req.params;
        await Coupon.update({ ...req.body }, { where: { id: couponId } });

        setFlashMessage(req, {
            type: 'success',
            message: 'Coupon updated succesfully',
        });
        res.redirect('back');
    } catch (err) {
        console.log(err);
        next(err);
    }
}
