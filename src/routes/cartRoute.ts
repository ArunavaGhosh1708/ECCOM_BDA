import router from 'express';
import type { Router } from 'express';
import * as cartController from '../controllers/cartController';
import * as userController from '../controllers/userController';
import validationErrorHandlerMiddleware from '../middlewares/validationErrorHandlerMiddleware';
import { addProductToCartValidator, billingInfoValidator } from '../validators';
import { ensureLoggedInMiddleware } from '../middlewares/authenticationMiddlewares';

const cartRouter: Router = router();

cartRouter.get('/', cartController.getCart);

cartRouter.post(
    '/product/:productId/create',
    addProductToCartValidator,
    validationErrorHandlerMiddleware,
    cartController.addProductToCart
);

cartRouter.get(
    '/product/:cartItemId/delete',
    cartController.removeProductFromCart
);

cartRouter.get('/:cartId/update', cartController.updateCartState);

cartRouter.post('/update', ensureLoggedInMiddleware, cartController.updateCart);

cartRouter.get('/:cartId/clear', cartController.getClearCart);

// add validator to route
cartRouter.post('/coupon/add', cartController.addCouponToCart);

cartRouter.get('/checkout', cartController.getCheckout);

cartRouter.post(
    '/billing/update',
    billingInfoValidator,
    validationErrorHandlerMiddleware,
    userController.postUpdateProfileInformation
);

cartRouter.post('/checkout', cartController.postCheckout);

cartRouter.get('/checkout/success', cartController.getCheckoutSuccess);

cartRouter.get('/checkout/cancel', cartController.getCheckoutCancel);

export default cartRouter;
