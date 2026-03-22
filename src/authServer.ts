import { initTracing } from './tracing';
initTracing(process.env.SERVICE_NAME ?? 'auth-service');

import 'dotenv/config';
import { appConfig } from './config';
import db from './database';
import authApp from './authApp';

async function bootstrap(): Promise<void> {
    try {
        await db.sequelize.authenticate();
        console.log('[Database] connected succesfully!');

        authApp.listen(appConfig.PORT, () => {
            console.log(`[Auth Server] listening on port ${appConfig.PORT}`);
        });
    } catch (err) {
        console.error('[Auth Startup Error]:', err);
        process.exit(1);
    }
}

void bootstrap();
