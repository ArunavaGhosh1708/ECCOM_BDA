import 'dotenv/config';
import { appConfig } from './config';
import mailApp from './mailApp';

mailApp.listen(appConfig.PORT, () => {
    console.log(`✉️  [Mail Server] listening on port ${appConfig.PORT}`);
});
