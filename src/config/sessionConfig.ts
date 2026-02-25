import { type SessionOptions } from 'express-session';
import MongoStore from 'connect-mongo';

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

const baseConfig: SessionOptions = {
    secret: process.env.SESSION_SECRET ?? '',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: ONE_WEEK },
};

const config: SessionOptions = { ...baseConfig };

if (process.env.MONGO_URI) {
    config.store = MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        dbName: 'trendtrove-session-db',
        stringify: true,
    });
}

if (process.env.NODE_ENV === 'production') {
    config.cookie = {
        ...config.cookie,
        secure: true,
    };
}

if (process.env.SESSION_COOKIE_SECURE) {
    config.cookie = {
        ...config.cookie,
        secure: process.env.SESSION_COOKIE_SECURE === 'true',
    };
}

if (process.env.SESSION_COOKIE_DOMAIN) {
    config.cookie = {
        ...config.cookie,
        domain: process.env.SESSION_COOKIE_DOMAIN,
    };
}

if (process.env.SESSION_COOKIE_SAME_SITE) {
    config.cookie = {
        ...config.cookie,
        sameSite: process.env.SESSION_COOKIE_SAME_SITE as
            | 'lax'
            | 'strict'
            | 'none'
            | boolean,
    };
}

export default config;
