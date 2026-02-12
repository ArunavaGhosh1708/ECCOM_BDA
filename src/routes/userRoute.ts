import { Router } from 'express';
import validationErrorHandlerMiddleware from '../middlewares/validationErrorHandlerMiddleware';
import * as UserController from '../controllers/userController';
import getValidFormImage from '../middlewares/getValidFormImageMiddleware';
import { userProfileFormValidator } from '../validators';

const userRouter = Router();

userRouter.get('/', (req, res) => {
    res.redirect('/user/profile');
});
userRouter.get('/profile', UserController.getProfile);

userRouter.post(
    '/profile/img-upload',
    getValidFormImage,
    UserController.postUploadProfileImage
);

userRouter.post(
    '/profile',
    userProfileFormValidator,
    validationErrorHandlerMiddleware,
    UserController.postUpdateProfileInformation
);
export default userRouter;
