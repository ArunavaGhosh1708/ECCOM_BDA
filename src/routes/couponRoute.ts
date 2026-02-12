import router, { type Router } from 'express';
import * as couponController from '../controllers/couponController';
import { newCouponFormValidator } from '../validators';
import validationErrorHandlerMiddleware from '../middlewares/validationErrorHandlerMiddleware';

const couponRouter: Router = router();

couponRouter.post(
    '/',
    newCouponFormValidator,
    validationErrorHandlerMiddleware,
    couponController.postCreateCoupon
);

couponRouter.get('/:couponId/delete/', couponController.getDeleteCouponById);

couponRouter.get('/:couponId/update/', couponController.getUpdateCouponById);

couponRouter.post('/:couponId/update/', couponController.postUpdateCouponById);

export default couponRouter;
