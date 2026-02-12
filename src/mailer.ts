import nodemailer from 'nodemailer';
import fs from 'fs';
import ejs from 'ejs';

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
}: {
    receivers: string[];
    subject: string;
    textFilePath: string;
    htmlFilePath: string;
    htmlData: Record<string, any>;
    cc?: string[];
}): Promise<void> {
    const bodyText = fs.readFileSync(textFilePath);

    void ejs.renderFile(htmlFilePath, htmlData, async (err, htmlContent) => {
        if (err != null) {
            console.log('Could not send mail');
            return;
        }

        const info = await mailer.sendMail({
            from: `Trendtrove Wears <${process.env.MAILER_USER ?? ''}>`,
            to: receivers,
            subject,
            html: htmlContent,
            text: bodyText,
            cc,
        });
        console.log('Message info: ', info);
    });
}
