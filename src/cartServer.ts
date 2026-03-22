import { initTracing } from './tracing';
initTracing(process.env.SERVICE_NAME ?? 'cart-service');

import 'dotenv/config';
import { appConfig } from './config';
import db from './database';
import cartApp from './cartApp';

async function bootstrap(): Promise<void> {
    try {
        await db.sequelize.authenticate();
        console.log('[Database] connected succesfully!');

        cartApp.listen(appConfig.PORT, () => {
            console.log(`[Cart Server] listening on port ${appConfig.PORT}`);
        });
    } catch (err) {
        console.error('[Cart Startup Error]:', err);
        process.exit(1);
    }
}

void bootstrap();
