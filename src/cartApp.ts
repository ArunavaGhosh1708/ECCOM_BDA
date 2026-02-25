import type { Application } from 'express';
import express from 'express';
import passport from 'passport';
import session from 'express-session';
import bodyParser from 'body-parser';
import type { IRequestWithFlashMessages } from './types/requestTypes';
import { appConfig, sessionConfig } from './config';
import setupPassport from './auth/passportSetup';
import cartRouter from './routes/cartRoute';
import { ensureLoggedInMiddleware } from './middlewares/authenticationMiddlewares';
import appErrorHandlerMiddleware from './middlewares/appErrorHandlerMiddleware';
import telemetryMiddleware from './middlewares/telemetryMiddleware';

const app: Application = express();

app.set('view engine', 'ejs');

if (appConfig.ENV === 'production') {
    app.set('trust proxy', 1);
}

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(session(sessionConfig));
app.use(telemetryMiddleware);

setupPassport();
app.use(passport.initialize());
app.use(passport.session());

app.use((req: IRequestWithFlashMessages, res, next) => {
    res.locals.req = req;
    res.locals.flashMessages = req.session.flashMessages;
    delete req.session.flashMessages;
    res.locals.searchWord = null;
    next();
});

app.use('/cart', ensureLoggedInMiddleware, cartRouter);

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
