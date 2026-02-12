import passport from 'passport';
import { Strategy } from 'passport-google-oauth2';
import { User } from '../models';
import { googleOAuthConfig } from '../config';
import mailerConfig from '../config/mailerConfig';
import { UserRoleEnum } from '../types/models/userTypes';

export default (): void => {
    passport.use(
        new Strategy(
            {
                clientID: googleOAuthConfig.CLIENT_ID,
                clientSecret: googleOAuthConfig.CLIENT_SECRET,
                callbackURL: googleOAuthConfig.CALLBACK_URL,
            },
            async function (accessToken, refreshToken, profile, done) {
                try {
                    const {
                        displayName: name,
                        email,
                        provider: providerIdentity,
                        picture: profileImageURL,
                    } = profile;
                    const [user] = await User.findOrCreate({
                        where: { email },
                        defaults: {
                            name,
                            email,
                            providerIdentity,
                            profileImageURL,
                            role:
                                email === mailerConfig.MAILER_USER
                                    ? UserRoleEnum.admin
                                    : UserRoleEnum.customer,
                        },
                    });

                    return done(null, user);
                } catch (error) {
                    return done(error, profile);
                }
            }
        )
    );
};
