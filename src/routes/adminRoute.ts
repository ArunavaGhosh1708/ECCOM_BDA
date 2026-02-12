import router, { type Router } from 'express';
import * as adminController from '../controllers/adminController';

const adminRouter: Router = router();

adminRouter.get('/', (req, res) => {
    res.redirect('/admin/dashboard');
});

adminRouter.get('/dashboard', adminController.getDashboard);

adminRouter.get('/dashboard/products', adminController.getDashboardProducts);

adminRouter.get('/dashboard/coupons', adminController.getDashboardCoupons);

export default adminRouter;
