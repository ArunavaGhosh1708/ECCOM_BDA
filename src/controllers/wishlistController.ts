import type { Response, NextFunction } from 'express';
import { type IRequestWithAuthenticatedUser } from '../types/requestTypes';
import db from '../database';
import { type ProductAttributes } from '../types/models/productTypes';
import { setFlashMessage } from '../utilities';

const User = db.users;
const Product = db.products;

export async function getWishlist(
    req: IRequestWithAuthenticatedUser,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const user = await User.findByPk(req.user.id);
        const productsIds = user?.wishlist ?? [];
        const productsIdsLength = productsIds.length;

        // TODO: refactor code
        const wishlistPromises: Array<
            [number, Promise<ProductAttributes | null>]
        > = productsIds.map((productId) => [
            productId,
            Product.findByPk(productId),
        ]);
        const wishlist: any = [];

        for (const promise of wishlistPromises) {
            const product = await promise[1];
            wishlist.push(product);

            if (product === null) {
                productsIds.splice(productsIds.indexOf(promise[0]), 1);
            }
        }

        if (productsIdsLength !== productsIds.length) {
            await User.update(
                { wishlist: productsIds },
                {
                    where: {
                        id: req.user.id,
                    },
                }
            );
        }

        res.render('wishlist', { wishlist });
    } catch (err) {
        console.log(err);
        next(err);
    }
}

export async function getAddProductToWishlist(
    req: IRequestWithAuthenticatedUser,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const productId = parseInt(req.params.productId);

        const user = await User.findByPk(req.user.id);

        let userWishlist = user?.wishlist;
        if (user === null || (userWishlist?.includes(productId) ?? false)) {
            res.redirect('back');
            return;
        }

        if (!Array.isArray(userWishlist)) {
            userWishlist = [productId];
        } else {
            userWishlist = [...userWishlist, productId];
        }

        await User.update(
            { wishlist: userWishlist },
            {
                where: {
                    id: req.user.id,
                },
            }
        );
        setFlashMessage(req, {
            type: 'success',
            message: 'Product added to wishlist!',
        });
        res.redirect('back');
    } catch (err) {
        console.log(err);
        next(err);
    }
}

export async function getRemoveProductFromWishlist(
    req: IRequestWithAuthenticatedUser,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const productId = parseInt(req.params.productId);

        const user = await User.findByPk(req.user.id);
        const userWishlist = user?.wishlist;
        if (user === null || !Array.isArray(userWishlist)) {
            res.redirect('back');
            return;
        }

        const productIdx = userWishlist.indexOf(productId);
        if (typeof productIdx !== 'number' || productIdx === -1) {
            res.redirect('back');
            return;
        }

        userWishlist.splice(productIdx, 1);
        await User.update(
            { wishlist: userWishlist },
            {
                where: {
                    id: req.user.id,
                },
            }
        );

        setFlashMessage(req, {
            type: 'success',
            message: 'Product removed from wishlist!',
        });
        res.redirect('back');
    } catch (err) {
        console.log(err);
        next(err);
    }
}
