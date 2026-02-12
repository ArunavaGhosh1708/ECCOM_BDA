export enum UserRoleEnum {
    admin = 'admin',
    customer = 'customer',
}

export interface UserAttributes {
    id?: number;
    name: string;
    email: string;
    password: string | null;
    phoneNumber: string | null;
    profileImageURL: string | null;
    providerIdentity?: string | null;
    wishlist?: number[];
    role?: UserRoleEnum;
    Address?: Record<string, string>;
    createdAt?: Date;
    updatedAt?: Date;

    cartItemsCount?: number;
    wishlistCount?: number;
}
