import type { Application, Request, Response, NextFunction } from 'express';
import express from 'express';
import passport from 'passport';
import session from 'express-session';
import { appConfig, sessionConfig } from './config';
import authRouter from './routes/authRoute';
import userRouter from './routes/userRoute';
import bodyParser from 'body-parser';
import type { IRequestWithFlashMessages } from './types/requestTypes';
import appErrorHandlerMiddleware from './middlewares/appErrorHandlerMiddleware';
import productRouter from './routes/productRoute';
import adminRouter from './routes/adminRoute';
import {
    ensureAdminUserMiddleware,
    ensureLoggedInMiddleware,
} from './middlewares/authenticationMiddlewares';
import cartRouter from './routes/cartRoute';
import couponRouter from './routes/couponRoute';
import wishlistRouter from './routes/wishlistRoute';
import db from './database';
import cors from 'cors';

const app: Application = express();

app.use(cors({ credentials: true }));
app.set('view engine', 'ejs');

if (appConfig.ENV === 'production') {
    app.set('trust proxy', 1);
}

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(session(sessionConfig));

app.use(passport.initialize());
app.use(passport.session());

app.use((req: IRequestWithFlashMessages, res, next) => {
    // middleware to enable usage of req object in ejs conditional tag
    // for checking authenticated with the req.isAuthenticated() method
    res.locals.req = req;

    // handle flash messages
    res.locals.flashMessages = req.session.flashMessages;
    delete req.session.flashMessages;

    // set default vaue for search word
    res.locals.searchWord = null;
    next();
});

app.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const featuredProducts = await db.products.findAll({
            limit: 5,
            order: [['price', 'DESC']],
        });
        res.render('index', { featuredProducts });
    } catch (err) {
        console.log(err);
        next(err);
    }
});

app.use('/auth', authRouter);
app.use('/user', ensureLoggedInMiddleware, userRouter);
app.use('/products', productRouter);
app.use('/cart', ensureLoggedInMiddleware, cartRouter);
app.use('/wishlist', ensureLoggedInMiddleware, wishlistRouter);
app.use(
    '/coupons',
    ensureLoggedInMiddleware,
    ensureAdminUserMiddleware,
    couponRouter
);
app.use(
    '/admin',
    ensureLoggedInMiddleware,
    ensureAdminUserMiddleware,
    adminRouter
);

app.get('/about', (req, res) => {
    res.render('about');
});

app.use((req, res) => {
    res.status(404).render('error', {
        error: {
            title: 'Page not found.',
            message: 'Click the link below :)',
        },
    });
});

app.use(appErrorHandlerMiddleware);

export default app;
