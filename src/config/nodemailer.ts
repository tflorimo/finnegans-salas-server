import nodemailer, { Transporter } from 'nodemailer';

export interface EmailOAuth2Config {
  service: string;
  auth: {
    type: 'OAuth2';
    user: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  };
}

class NodemailerConfig {
  private emailConfig: EmailOAuth2Config;
  private transporter: Transporter | null = null;

  constructor() {
    this.emailConfig = {
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER || '',
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN || '',
      },
    };
  }

  getEmailTransporter(): Transporter {
    if (!this.transporter) {
      if (
        !this.emailConfig.auth.user ||
        !this.emailConfig.auth.clientId ||
        !this.emailConfig.auth.clientSecret ||
        !this.emailConfig.auth.refreshToken
      ) {
        throw new Error(
          'Configuración de correo incompleta.\n' +
            'Verifica EMAIL_USER, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REFRESH_TOKEN en .env'
        );
      }

      this.transporter = nodemailer.createTransport(this.emailConfig);
    }

    return this.transporter;
  }

  async verifyEmailConnection(): Promise<boolean> {
    try {
      const transporter = this.getEmailTransporter();
      await transporter.verify();
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
export const EMAIL_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER || '';
