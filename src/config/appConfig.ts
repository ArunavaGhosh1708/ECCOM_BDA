export default {
    ENV: process.env.NODE_ENV,
    PORT: process.env.PORT ?? 3000,
    APP_DOMAIN: process.env.APP_DOMAIN ?? 'http://localhost:3000',
    STRIPE_API_KEY: process.env.STRIPE_API_KEY,
};
