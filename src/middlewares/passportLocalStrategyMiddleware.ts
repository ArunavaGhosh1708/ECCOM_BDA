import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { User } from '../models';
import { setFlashMessage } from '../utilities';

export default (): void => {
    passport.use(
        new LocalStrategy(
            {
                usernameField: 'email',
                passReqToCallback: true,
            },
            async function (req, email, password, done) {
                const user = await User.findOne({
                    where: {
                        email,
                    },
                });

                if (user === null) {
                    setFlashMessage(req, {
                        type: 'danger',
                        message: `We couldn't find an account with that email. Signup to continue`,
                    });
                    done(null, false);
                    return;
                }

                if (user.providerIdentity === 'google') {
                    setFlashMessage(req, {
                        type: 'info',
                        message: `Your google account is linked already. Log in with Google instead.`,
                    });
                    done(null, false);
                    return;
                }

                if (!(await user.verifyPassword(password))) {
                    setFlashMessage(req, {
                        type: 'warning',
                        message: 'Incorrect password',
                    });
                    done(null, false);
                    return;
                }

                done(null, user);
            }
        )
    );
};
