import { initTracing } from './tracing';
initTracing(process.env.SERVICE_NAME ?? 'product-service');

import 'dotenv/config';
import { appConfig } from './config';
import db from './database';
import productApp from './productApp';

async function bootstrap(): Promise<void> {
    try {
        await db.sequelize.authenticate();
        console.log('[Database] connected succesfully!');

        productApp.listen(appConfig.PORT, () => {
            console.log(`[Product Server] listening on port ${appConfig.PORT}`);
        });
    } catch (err) {
        console.error('[Product Startup Error]:', err);
        process.exit(1);
    }
}

void bootstrap();
