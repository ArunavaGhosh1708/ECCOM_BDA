import DataURIParser from 'datauri/parser';
import { cloudinaryConfig } from './config';
import type { flashMessage } from './types/flashMessageType';
import type { IRequestWithFlashMessages } from './types/requestTypes';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import type { CategoryAndSizeCount } from './types/models/productTypes';
import { PRODUCT_CATEGORIES, PRODUCT_SIZES } from './constants';

export function setFlashMessage(
    req: IRequestWithFlashMessages,
    message: flashMessage | flashMessage[]
): void {
    if (Array.isArray(message)) {
        req.session.flashMessages = message;
    } else {
        req.session.flashMessages = [message];
    }
}

export function cloudinaryAPI(): typeof cloudinary {
    cloudinary.config({
        cloud_name: cloudinaryConfig.CLOUD_NAME,
        api_key: cloudinaryConfig.API_KEY,
        api_secret: cloudinaryConfig.API_SECRET,
    });

    return cloudinary;
}

export function convertBufferToImageURI(filename, buffer): string | undefined {
    const dUri = new DataURIParser();
    const image = dUri.format(path.extname(filename).toString(), buffer);
    return image.content;
}

export function getPagination(
    page: number,
    size: number
): { limit: number; offset: number; currentPage: number } {
    const limit = isNaN(size) ? 6 : +size;
    const offset = isNaN(page) ? 0 : (+page - 1) * limit;
    const currentPage = isNaN(page) ? 1 : page;
    return { limit, offset, currentPage };
}

export function getCategoryAndSizeCount(allProducts): CategoryAndSizeCount {
    const categoriesCount = PRODUCT_CATEGORIES.reduce((acc, val) => {
        acc[val] = 0;
        return acc;
    }, {});

    const sizesCount = Object.values(PRODUCT_SIZES).reduce((acc, val) => {
        acc[val] = 0;
        return acc;
    }, {});

    for (const product of allProducts) {
        categoriesCount[product.category] =
            parseInt(categoriesCount[product.category]) + 1;

        product.sizes.forEach((size) => {
            if (PRODUCT_SIZES[size] === PRODUCT_SIZES.S) {
                sizesCount[PRODUCT_SIZES.S] =
                    parseInt(sizesCount[PRODUCT_SIZES.S]) + 1;
            }

            if (PRODUCT_SIZES[size] === PRODUCT_SIZES.M) {
                sizesCount[PRODUCT_SIZES.M] =
                    parseInt(sizesCount[PRODUCT_SIZES.M]) + 1;
            }

            if (PRODUCT_SIZES[size] === PRODUCT_SIZES.L) {
                sizesCount[PRODUCT_SIZES.L] =
                    parseInt(sizesCount[PRODUCT_SIZES.L]) + 1;
            }
        });
    }

    return { categoriesCount, sizesCount };
}
