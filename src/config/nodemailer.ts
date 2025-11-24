import { google } from 'googleapis';
import path from 'path';

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

const SERVICE_ACCOUNT_FILE = path.join(__dirname, '../../auth/service_account_key.json');
const ADMIN_ACCOUNT_IMPERSONATE = process.env.ADMIN_EMAIL_FOR_SERVICE_ACCOUNT || 'admin@finndevort.net.ar';

class NodemailerConfig {
  private gmail: any;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_FILE,
      scopes: ['https://www.googleapis.com/auth/gmail.send'],
      clientOptions: {
        subject: ADMIN_ACCOUNT_IMPERSONATE,
      },
    });

    this.gmail = google.gmail({ version: 'v1', auth });
  }

  async sendEmail(params: EmailParams): Promise<void> {
    const { to, subject, html } = params;

    const message = [
      `From: ${ADMIN_ACCOUNT_IMPERSONATE}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      html,
    ].join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
  }

  async verifyEmailConnection(): Promise<boolean> {
    try {
      await this.gmail.users.getProfile({ userId: 'me' });
      return true;
    } catch (error) {
      console.error('[NodemailerConfig] Error al verificar Gmail API:', error);
      return false;
    }
  }
}

const nodemailerConfig = new NodemailerConfig();

export const sendEmail = (params: EmailParams) => nodemailerConfig.sendEmail(params);
export const verifyEmailConnection = () => nodemailerConfig.verifyEmailConnection();
export const EMAIL_FROM = ADMIN_ACCOUNT_IMPERSONATE;
