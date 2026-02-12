import { dbConfig } from '../config';
import { Sequelize } from 'sequelize';
import {
    userFactory,
    productFactory,
    addressFactory,
    cartItemFactory,
    cartFactory,
    couponFactory,
} from '../models';

let sequelize;

if (typeof dbConfig.url !== 'undefined') {
    sequelize = new Sequelize(dbConfig.url, dbConfig.options);
} else {
    sequelize = new Sequelize(dbConfig);
}

const db = {
    sequelize,
    users: userFactory(sequelize),
    products: productFactory(sequelize),
    addresses: addressFactory(sequelize),
    cartItems: cartItemFactory(sequelize),
    carts: cartFactory(sequelize),
    coupons: couponFactory(sequelize),
};

// MODEL RELATIONSHIPS
// User <=> Product
db.users.hasMany(db.products, { foreignKey: 'userId' });
db.products.belongsTo(db.users, { foreignKey: 'userId' });

// User <=> Cart
db.users.hasMany(db.carts, { foreignKey: 'userId' });
db.carts.belongsTo(db.users, { foreignKey: 'userId' });

// User <=> Address
db.users.hasOne(db.addresses, { foreignKey: 'userId' });
db.addresses.belongsTo(db.users, { foreignKey: 'userId' });

// Product <=> CartItem
db.products.hasMany(db.cartItems, { foreignKey: 'productId' });
db.cartItems.belongsTo(db.products, { foreignKey: 'productId' });

// Cart <=> CartItem
db.carts.hasMany(db.cartItems, { foreignKey: 'cartId' });
db.cartItems.belongsTo(db.carts, { foreignKey: 'cartId' });

// Coupon <=> Cart
db.coupons.hasMany(db.carts, { foreignKey: 'couponId' });
db.carts.belongsTo(db.coupons, { foreignKey: 'couponId' });

export default db;
