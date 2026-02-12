import type { CouponAttributes } from './couponTypes';
import type { UserAttributes } from './userTypes';

export interface CartItemAttributes {
    id?: number;
    size: string;
    quantity: number;
    totalPrice: number;
    productId?: number;
    cartId?: number;
    Product?: Record<string, string | number | null>;
}

export interface CartAttributes {
    id?: number;
    couponId?: number;
    cartTotal: number;
    userId?: number;
    state: string;
    address?: string;
    orderNote?: string;
    Coupon?: CouponAttributes;
    User?: UserAttributes;
    createdAt?: Date;
    updatedAt?: Date;
    CartItems?: CartItemAttributes[];
}
