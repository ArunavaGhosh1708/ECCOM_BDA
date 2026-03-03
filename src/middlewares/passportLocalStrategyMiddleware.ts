import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { User } from '../models';
import { setFlashMessage } from '../utilities';
import { logTelemetry } from '../telemetry/logger';
import type { RequestWithTelemetry } from '../types/telemetry';

export default (): void => {
    passport.use(
        new LocalStrategy(
            {
                usernameField: 'email',
                passReqToCallback: true,
            },
            async function (req: RequestWithTelemetry, email, password, done) {
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
                    logTelemetry(
                        req,
                        null,
                        'WARN',
                        'user_session',
                        'user.login.failure',
                        'Login failed: incorrect password',
                        {
                            user_session: {
                                auth_method: 'password',
                                failure_reason: 'invalid_credentials',
                                ip_address: req.ip,
                                device_type: 'web',
                            },
                        }
                    );
                    done(null, false);
                    return;
                }

                done(null, user);
            }
        )
    );
};
