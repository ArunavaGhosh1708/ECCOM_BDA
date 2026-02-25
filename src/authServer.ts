import 'dotenv/config';
import { appConfig } from './config';
import db from './database';
import authApp from './authApp';

(async () => {
    try {
        await db.sequelize.authenticate();
        console.log('📖[Database] connected succesfully!');
    } catch (err) {
        console.log('[DB Connection Error]:', err);
    }
})();

authApp.listen(appConfig.PORT, () => {
    console.log(`🔐[Auth Server] listening on port ${appConfig.PORT}`);
});
