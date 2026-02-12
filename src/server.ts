import 'dotenv/config';
import { appConfig } from './config';

import app from './app';
import db from './database';
import { mailer } from './mailer';

(async () => {
    await db.sequelize.sync({ alter: true });
    console.log('📖[Database] connected succesfully!');
})().catch((err) => {
    console.log('[DB Connection Error]:', err);
});

(async () => {
    await mailer.verify();
    console.log('📭 Server is ready to send mails');
})().catch((err) => {
    console.log('[Mailer Connection Error]:', err);
});

app.listen(appConfig.PORT, () => {
    console.log(`🔥[Server] listening on port ${appConfig.PORT}`);
});
