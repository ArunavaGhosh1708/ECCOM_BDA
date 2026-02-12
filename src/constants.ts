import { UserRoleEnum } from './types/models/userTypes';
import path from 'path';

export const USER_ROLES = {} as const as Record<UserRoleEnum, string>;
const userRoles = Object.keys(UserRoleEnum) as UserRoleEnum[];
userRoles.forEach((role) => {
    USER_ROLES[role] = role.toLowerCase();
});

export const PRODUCT_SIZES = {
    S: 'SMALL',
    M: 'MEDIUM',
    L: 'LARGE',
};

export const PRODUCT_CATEGORIES = ['MEN', 'WOMEN', 'CHILDREN'];

export const CART_STATES = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
};

export const ONE_MB_IN_BYTES: number = 1000000;
export const fileUploadLimit: number = 5;
export const ALLOWED_IMAGE_TYPES: string[] = ['jpg', 'jpeg', 'png', 'gif'];

export const successfulCheckoutAdminHtmlFilePath = path.resolve(
    './views/mails/placedOrder.ejs'
);
export const successfulCheckoutAdminTextFilePath = path.resolve(
    './views/mails/placedOrder.txt'
);

export const thankYouCustomerHtmlFilePath = path.resolve(
    './views/mails/orderDelivered.ejs'
);
export const thankYouCustomerTextFilePath = path.resolve(
    './views/mails/orderDelivered.txt'
);
