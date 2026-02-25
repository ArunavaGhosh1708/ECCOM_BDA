import passport from 'passport';
import googleAuthStrategyMiddleware from '../middlewares/googleAuthStrategyMiddleware';
import passportLocalStrategyMiddleware from '../middlewares/passportLocalStrategyMiddleware';
import type { UserAttributes } from '../types/models/userTypes';
import db from '../database';
import { CART_STATES } from '../constants';
import { CartItem } from '../models';

const Address = db.addresses;
const User = db.users;
const Cart = db.carts;

export default function setupPassport(): void {
    googleAuthStrategyMiddleware();
    passportLocalStrategyMiddleware();

    passport.serializeUser(function (user: UserAttributes, cb) {
        process.nextTick(function () {
            cb(null, user.id);
        });
    });

    passport.deserializeUser(function (userId: string, cb) {
        process.nextTick(async function () {
            try {
                const user = await User.findOne({
                    where: { id: userId },
                    include: Address,
                });
                if (user === null) {
                    cb(new Error('User is not logged in.'));
                    return;
                }

                const cartCount = await Cart.findOne({
                    where: {
                        state: CART_STATES.PENDING,
                        userId: user?.id,
                    },
                    include: CartItem,
                });

                const userObj = user.toJSON();
                userObj.cartItemsCount =
                    cartCount !== null ? cartCount.CartItems.length : 0;
                userObj.wishlistCount = Array.isArray(user.wishlist)
                    ? user.wishlist.length
                    : 0;

                cb(null, userObj);
            } catch (error) {
                cb(error);
            }
        });
    });
}
