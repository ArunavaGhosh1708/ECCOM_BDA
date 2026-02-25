export default {
    ENV: process.env.NODE_ENV,
    PORT: process.env.PORT ?? 3000,
    APP_DOMAIN: process.env.APP_DOMAIN ?? 'http://localhost:3000',
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL ?? '',
    PRODUCT_SERVICE_URL: process.env.PRODUCT_SERVICE_URL ?? '',
    CART_SERVICE_URL: process.env.CART_SERVICE_URL ?? '',
    MAIL_SERVICE_URL: process.env.MAIL_SERVICE_URL ?? '',
    STRIPE_API_KEY: process.env.STRIPE_API_KEY,
};
