import type { NextFunction, Response } from 'express';
import type { IRequestWithAuthenticatedUser } from '../types/requestTypes';
import {
    cloudinaryAPI,
    convertBufferToImageURI,
    setFlashMessage,
} from '../utilities';
import db from '../database';
import { matchedData } from 'express-validator';
import { CART_STATES } from '../constants';

const User = db.users;
const Cart = db.carts;
const Coupon = db.coupons;
const CartItem = db.cartItems;
const Product = db.products;

export async function getProfile(
    req: IRequestWithAuthenticatedUser,
    res: Response
): Promise<void> {
    const carts = await Cart.findAll({
        where: {
            userId: req.user.id,
        },
        include: [Coupon, CartItem],
        limit: 5,
        order: [['updatedAt', 'DESC']],
    });

    const cartWithCartItems = carts.map(async (cart) => {
        const cartItems = await cart.getCartItems({
            include: Product,
            attributes: ['Product.name'],
        });

        const productNames: string[] = [];
        cartItems.forEach((cartItem) => {
            productNames.push(
                (cartItem.Product.name as string).replace(/&#x27;/g, "'")
            );
        });

        return {
            ...cart.toJSON(),
            productNames: productNames.join(', '),
        };
    });

    res.render('user/user-profile', {
        carts: await Promise.all(cartWithCartItems),
    });
}

export async function postUpdateProfileInformation(req, res): Promise<void> {
    const { name, phoneNumber, street, state, country, activeCartNote } =
        matchedData(req);

    const user = await User.findByPk(req.user.id);

    if (user === null) {
        setFlashMessage(req, [{ message: 'User not found', type: 'danger' }]);
        res.redirect('/');
        return;
    }

    let address = await user.getAddress({ where: { userId: user.id } });
    if (address === null) {
        address = await user.createAddress({
            state,
            street,
            country,
        });
    } else {
        await address.update({ ...address, street, state, country });
    }

    await user.update({ ...user, name, phoneNumber });
    setFlashMessage(req, [
        {
            type: 'success',
            message: 'Your details were updated successfully!',
        },
    ]);

    const userActiveCart = await Cart.findOne({
        where: {
            state: CART_STATES.PENDING,
            userId: user.id,
        },
    });

    if (!['', undefined].includes(activeCartNote) && userActiveCart != null) {
        await userActiveCart.update({ orderNote: activeCartNote });
    }

    res.redirect('back');
}

export async function postUploadProfileImage(
    req: IRequestWithAuthenticatedUser,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (req.file === undefined) {
            setFlashMessage(req, {
                type: 'info',
                message: 'No file was detected. Choose a file',
            });
            res.redirect('/user/profile');
            return;
        }

        const userImage = convertBufferToImageURI(
            req.file.originalname,
            req.file.buffer
        );
        const uploadedImg = await cloudinaryAPI().uploader.upload(
            userImage as string,
            {
                public_id: req.user.email,
                overwrite: true,
                folder: '/trendtrove/profile-image',
                resource_type: 'image',
            }
        );

        const user = await User.findByPk(req?.user.id);
        await user?.update({ profileImageURL: uploadedImg.url });

        setFlashMessage(req, {
            type: 'success',
            message: 'Profile image uploaded succesfully!',
        });
        res.redirect('/user/profile');
    } catch (error) {
        if (typeof error.message === 'string' && error.message.length > 0) {
            setFlashMessage(req, {
                type: 'danger',
                message: error.message,
            });
            res.redirect('./');
            return;
        }
        next(error);
    }
}
