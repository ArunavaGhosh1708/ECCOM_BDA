import { type ValidationChain, body, param } from 'express-validator';
import { PRODUCT_SIZES } from './constants';

export const newProductFormValidators: ValidationChain[] = [
    body('name')
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Product name is required'),
    body('price')
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Product price is required')
        .toFloat()
        .isFloat({ min: 0 })
        .withMessage('Product price cannot be less than zero'),
    body('category')
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Product category is required'),
    body('sizes')
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Choose at least one size'),
    body('shortDescription')
        .trim()
        .escape()
        .notEmpty()
        .withMessage('A short description of the product is required'),
];

export const userProfileFormValidator: ValidationChain[] = [
    body('name', 'Name is invalid or empty').trim().escape().notEmpty(),
    body('phoneNumber', 'Phone number cannot be empty')
        .trim()
        .escape()
        .notEmpty(),
    body('street', 'Street cannot be empty').trim().escape().notEmpty(),
    body('state', 'State cannot be empty').trim().escape().notEmpty(),
    body('country', 'Country cannot be empty').trim().escape().notEmpty(),
];

export const addProductToCartValidator = [
    param('productId').toInt(),
    body('quantity')
        .toInt()
        .notEmpty()
        .isInt({ min: 0 })
        .withMessage('Product quantity should be greater than zero'),
    body('size')
        .isIn(Object.keys(PRODUCT_SIZES))
        .withMessage('Select a valid size'),
];

export const billingInfoValidator = [
    ...userProfileFormValidator,
    body('activeCartNote').trim(),
];

export const newCouponFormValidator: ValidationChain[] = [
    body('code')
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Coupon code is required'),
    body('amount')
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Coupon amount is required')
        .toFloat()
        .isFloat({ min: 1 })
        .withMessage('Coupon should be a number greater than zero'),
    body('maxUsage')
        .trim()
        .escape()
        .notEmpty()
        .withMessage('Max Usage is required')
        .toInt()
        .isInt({ min: 1 })
        .withMessage('Coupon should be a number greater than zero'),
];
