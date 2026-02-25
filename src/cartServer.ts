import 'dotenv/config';
import { appConfig } from './config';
import db from './database';
import cartApp from './cartApp';

(async () => {
    try {
        await db.sequelize.authenticate();
        console.log('📖[Database] connected succesfully!');
    } catch (err) {
        console.log('[DB Connection Error]:', err);
    }
})();

cartApp.listen(appConfig.PORT, () => {
    console.log(`🛒 [Cart Server] listening on port ${appConfig.PORT}`);
});
