import router, { type Router } from 'express';
import * as productController from '../controllers/productController';
import { ensureAdminUserMiddleware } from '../middlewares/authenticationMiddlewares';
import validationErrorHandlerMiddleware from '../middlewares/validationErrorHandlerMiddleware';
import getValidFormImage from '../middlewares/getValidFormImageMiddleware';
import { newProductFormValidators } from '../validators';
import { query } from 'express-validator';

const productRouter: Router = router();

productRouter.get(
    '/',
    query([
        'page',
        'size',
        'orderBy',
        'sortBy',
        'category',
        'latest',
        'priceMin',
        'priceMax',
        'productSizes',
    ])
        .trim()
        .customSanitizer(async (value) => {
            return value !== '' ? value : undefined;
        }),
    productController.getAllProducts
);

productRouter.post(
    '/',
    getValidFormImage,
    newProductFormValidators,
    validationErrorHandlerMiddleware,
    productController.postCreateProduct
);

productRouter.get('/:productId', productController.getProductById);

productRouter.get(
    '/:productId/update',
    ensureAdminUserMiddleware,
    productController.getUpdateProductById
);

productRouter.post(
    '/:productId/update',
    ensureAdminUserMiddleware,
    getValidFormImage,
    newProductFormValidators,
    validationErrorHandlerMiddleware,
    productController.postUpdateProductById
);

productRouter.get(
    '/:productId/delete',
    ensureAdminUserMiddleware,
    productController.getDeleteProductById
);

export default productRouter;
