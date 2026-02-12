import { Op } from 'sequelize';
import { CART_STATES, PRODUCT_CATEGORIES, PRODUCT_SIZES } from '../constants';
import db from '../database';
import { getPagination } from '../utilities';
import type { Response, NextFunction } from 'express';
import { type IReqWithDashboard } from '../types/requestTypes';
import { CartItem } from '../models';

const Product = db.products;
const User = db.users;
const Cart = db.carts;
const Coupon = db.coupons;

export async function getDashboard(
    req: IReqWithDashboard,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { limit, offset } = getPagination(1, parseInt(''));
        const { rows: products, count: productCount } =
            await Product.findAndCountAll({
                limit,
                offset,
                order: [['updatedAt', 'DESC']],
            });

        const { rows: coupons, count: couponCount } =
            await Coupon.findAndCountAll({
                limit,
                offset,
                order: [['updatedAt', 'DESC']],
            });

        const orders = await Cart.findAll({
            where: {
                state: CART_STATES.PROCESSING,
            },
            order: [['updatedAt', 'DESC']],
            include: CartItem,
        });

        const totalUsers = await User.count();

        let now = new Date();
        const offsetInMinutes = now.getTimezoneOffset();
        const offsetInMilliseconds = Math.abs(offsetInMinutes) * 60000;
        now = new Date(now.getTime() + offsetInMilliseconds);

        const oneWeekInSecs = 1000 * 60 * 60 * 24 * 7;
        const oneWeekAgo = new Date(now.getTime() - oneWeekInSecs);

        const currentMonthRevenue = await Cart.sum('cartTotal', {
            where: {
                state: CART_STATES.DELIVERED,
                updatedAt: {
                    [Op.lte]: now,
                    [Op.gt]: new Date(oneWeekAgo),
                },
            },
        });
        const currentWeekOrders = await Cart.count({
            where: {
                state: CART_STATES.DELIVERED,
                updatedAt: {
                    [Op.lte]: now,
                    [Op.gt]: new Date(oneWeekAgo),
                },
            },
        });

        res.render('admin/dashboard', {
            products,
            productCount,
            coupons,
            couponCount,
            orders,
            currentPage: 1,
            productCategories: PRODUCT_CATEGORIES,
            productSizes: PRODUCT_SIZES,
            totalUsers: totalUsers ?? 0,
            currentMonthRevenue: currentMonthRevenue ?? 0,
            currentWeekOrders: currentWeekOrders ?? 0,
            qAdminSearchProductName: '',
            qAdminSearchCouponCode: '',
        });
    } catch (err) {
        console.log(err);
        next(err);
    }
}

export async function getDashboardProducts(
    req: IReqWithDashboard,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { page } = req.query;
        const qAdminSearchProductName: string =
            req.query.qAdminSearchProductName ?? '';
        const { limit, offset, currentPage } = getPagination(
            parseInt(page),
            parseInt('')
        );

        const products = await Product.findAll({
            where: {
                name: {
                    [Op.iLike]: `%${qAdminSearchProductName}%`,
                },
            },
            limit,
            offset,
            order: [['updatedAt', 'DESC']],
        });

        res.render('admin/table-products.ejs', {
            products,
            currentPage,
            qAdminSearchProductName,
        });
    } catch (err) {
        console.log(err);
        next(err);
    }
}

export async function getDashboardCoupons(
    req: IReqWithDashboard,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { page } = req.query;
        const qAdminSearchCouponCode: string =
            req.query.qAdminSearchCouponCode?.toString() ?? '';
        const { limit, offset, currentPage } = getPagination(
            parseInt(page),
            parseInt('')
        );

        const coupons = await Coupon.findAll({
            where: {
                code: {
                    [Op.iLike]: `%${qAdminSearchCouponCode}%`,
                },
            },
            limit,
            offset,
            order: [['updatedAt', 'DESC']],
        });

        res.render('admin/table-coupons.ejs', {
            coupons,
            currentPage,
            qAdminSearchCouponCode,
        });
    } catch (err) {
        console.log(err);
        next(err);
    }
}
