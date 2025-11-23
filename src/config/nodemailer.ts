import nodemailer, { Transporter } from 'nodemailer';
import { google } from 'googleapis';
import path from 'path';

const SERVICE_ACCOUNT_FILE = path.join(__dirname, '../../auth/service_account_key.json');
const ADMIN_ACCOUNT_IMPERSONATE = process.env.ADMIN_EMAIL_FOR_SERVICE_ACCOUNT!;

class NodemailerConfig {
  async getEmailTransporter(): Promise<Transporter> {
    const auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_FILE,
      scopes: ['https://www.googleapis.com/auth/gmail.send'],
      clientOptions: {
        subject: ADMIN_ACCOUNT_IMPERSONATE,
      },
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    if(!accessToken) {
      throw new Error('No se pudo generar el Access Token para enviar correos.');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: ADMIN_ACCOUNT_IMPERSONATE,
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        accessToken: accessToken.token || ''
      },
    } as nodemailer.TransportOptions);

    return transporter;
  }

  async verifyEmailConnection(): Promise<boolean> {
    try {
      const transporter = await this.getEmailTransporter();
      await transporter.verify();
      console.log('[NodemailerConfig] Conexión SMTP verificada correctamente.');
      return true;
    } catch (error) {
      console.error('[NodemailerConfig] Error al verificar conexión SMTP:', error);
      return false;
    }
  }
}

const nodemailerConfig = new NodemailerConfig();

export const getEmailTransporter = () => nodemailerConfig.getEmailTransporter();
export const verifyEmailConnection = () => nodemailerConfig.verifyEmailConnection();
export const EMAIL_FROM = ADMIN_ACCOUNT_IMPERSONATE;
