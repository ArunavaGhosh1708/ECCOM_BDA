import { type SessionOptions } from 'express-session';
import MongoStore from 'connect-mongo';

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

const baseConfig: SessionOptions = {
    secret: process.env.SESSION_SECRET ?? '',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: ONE_WEEK },
};

const productionConfig: SessionOptions = {
    ...baseConfig,
    cookie: {
        ...baseConfig.cookie,
        secure: true,
    },
};
if (process.env.NODE_ENV === 'production') {
    productionConfig.store = MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        dbName: 'trendtrove-session-db',
        stringify: true,
    });
}

const config: SessionOptions =
    process.env.NODE_ENV === 'production' ? productionConfig : baseConfig;

export default config;
