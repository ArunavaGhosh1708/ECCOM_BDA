import nodemailer from 'nodemailer';
import fs from 'fs';
import ejs from 'ejs';
import { appConfig } from './config';
import type { RequestWithTelemetry } from './types/telemetry';
import { logTelemetry } from './telemetry/logger';

export const mailer = nodemailer.createTransport({
    pool: true,
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use TLS
    auth: {
        user: process.env.MAILER_USER,
        pass: process.env.MAILER_PASSWORD,
    },
});

export async function sendEmail({
    receivers,
    subject,
    textFilePath,
    htmlFilePath,
    htmlData = {},
    cc = [],
    req,
}: {
    receivers: string[];
    subject: string;
    textFilePath: string;
    htmlFilePath: string;
    htmlData: Record<string, any>;
    cc?: string[];
    req?: RequestWithTelemetry;
}): Promise<void> {
    const bodyText = fs.readFileSync(textFilePath, 'utf8');

    void ejs.renderFile(htmlFilePath, htmlData, async (err, htmlContent) => {
        if (err != null) {
            console.log('Could not send mail');
            return;
        }

        if (appConfig.MAIL_SERVICE_URL) {
            try {
                const response = await fetch(
                    `${appConfig.MAIL_SERVICE_URL}/notify/email`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            receivers,
                            subject,
                            html: htmlContent,
                            text: bodyText,
                            cc,
                        }),
                    }
                );
                if (!response.ok) {
                    console.log(
                        `[Mail Service] failed with status ${response.status}`
                    );
                }
            } catch (serviceError) {
                console.log('[Mail Service] error: ', serviceError);
            }
            if (req) {
                logTelemetry(
                    req,
                    null,
                    'INFO',
                    'integration',
                    'mail.sent',
                    `Mail forwarded to mail-service for ${receivers.length} recipients`,
                    {
                        integration: {
                            target: 'mail-service',
                            receivers_count: receivers.length.toString(),
                        },
                    }
                );
            }
            return;
        }

        await sendEmailLocal({
            receivers,
            subject,
            html: htmlContent ?? '',
            text: bodyText,
            cc,
        });
        if (req) {
            logTelemetry(
                req,
                null,
                'INFO',
                'integration',
                'mail.sent.local',
                `Mail sent directly via SMTP to ${receivers.length} recipients`,
                {
                    integration: {
                        target: 'smtp',
                        receivers_count: receivers.length.toString(),
                    },
                }
            );
        }
    });
}

export async function sendEmailLocal({
    receivers,
    subject,
    html,
    text,
    cc = [],
}: {
    receivers: string[];
    subject: string;
    html: string;
    text: string;
    cc?: string[];
}): Promise<void> {
    const info = await mailer.sendMail({
        from: `Trendtrove Wears <${process.env.MAILER_USER ?? ''}>`,
        to: receivers,
        subject,
        html,
        text,
        cc,
    });
    console.log('Message info: ', info);
}
