import express from 'express';
import bodyParser from 'body-parser';
import { sendEmailLocal } from './mailer';
import appErrorHandlerMiddleware from './middlewares/appErrorHandlerMiddleware';
import telemetryMiddleware from './middlewares/telemetryMiddleware';

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(telemetryMiddleware);

app.post('/notify/email', async (req, res, next) => {
    try {
        const { receivers, subject, html, text, cc } = req.body;
        if (
            !Array.isArray(receivers) ||
            typeof subject !== 'string' ||
            typeof html !== 'string' ||
            typeof text !== 'string'
        ) {
            res.status(400).json({ error: 'Invalid payload' });
            return;
        }
        await sendEmailLocal({
            receivers,
            subject,
            html,
            text,
            cc,
        });
        // telemetry
        req.telemetry &&
            console.log(
                JSON.stringify({
                    timestamp: new Date().toISOString(),
                    level: 'INFO',
                    service:
                        process.env.SERVICE_NAME ?? 'mail-service',
                    version: process.env.SERVICE_VERSION ?? '0.0.0',
                    environment: req.telemetry.environment,
                    trace_id: req.telemetry.traceId,
                    span_id: req.telemetry.spanId,
                    request_id: req.telemetry.requestId,
                    user_id: null,
                    session_id: null,
                    category: 'integration',
                    event: 'mail.sent',
                    message: `Mail enqueued to ${receivers.length} recipient(s)`,
                    integration: {
                        target: 'mail-service',
                        receivers_count: receivers.length,
                    },
                })
            );
        res.status(202).json({ status: 'queued' });
    } catch (err) {
        next(err);
    }
});

app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.use(appErrorHandlerMiddleware);

export default app;
