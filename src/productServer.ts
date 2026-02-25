import 'dotenv/config';
import { appConfig } from './config';
import db from './database';
import productApp from './productApp';

(async () => {
    try {
        await db.sequelize.authenticate();
        console.log('📖[Database] connected succesfully!');
    } catch (err) {
        console.log('[DB Connection Error]:', err);
    }
})();

productApp.listen(appConfig.PORT, () => {
    console.log(`🛍️ [Product Server] listening on port ${appConfig.PORT}`);
});
