import router, { type Router } from 'express';
import * as wishlistController from '../controllers/wishlistController';

const wishlistRouter: Router = router();

wishlistRouter.get('/', wishlistController.getWishlist);

wishlistRouter.get(
    '/:productId/add',
    wishlistController.getAddProductToWishlist
);

wishlistRouter.get(
    '/:productId/remove',
    wishlistController.getRemoveProductFromWishlist
);

export default wishlistRouter;
