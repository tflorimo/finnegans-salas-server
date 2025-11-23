import path from 'path';
import fs from 'fs';
import { getEmailTransporter, EMAIL_FROM } from '../config/nodemailer';
import {
  getUserCreatedTemplate,
  getCheckInReminderTemplate,
  getCheckInSuccessTemplate,
  getUserCreatedTextTemplate,
  getCheckInReminderTextTemplate,
  getCheckInSuccessTextTemplate,
} from '../templates/emailTemplates';
import userService from './userService';
import eventService from './eventService';
import roomService from './roomService';

type NotificationInput =
  | {
      type: 'USER_CREATED';
      userId: number;
    }
  | {
      type: 'CHECK_IN_REMINDER';
      userEmail: string;
      roomEmail: string;
      eventId: string;
    }
  | {
      type: 'CHECK_IN_SUCCESS';
      userEmail: string;
      eventId: string;
      roomEmail: string;
      checkInTime: Date;
    };

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: any[];
}

export class NodemailerService {
  private getLogoAttachment() {
    const logoPath = path.join(__dirname, '../assets/images/finnegansLogoMainLightblue.svg');
    if (!fs.existsSync(logoPath)) return [];
    return [
      {
        filename: 'finnegansLogoMainLightblue.svg',
        path: logoPath,
        cid: 'company-logo',
      },
    ];
  }

  private async sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
      const transporter = getEmailTransporter();
      await transporter.sendMail({
        from: EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments || [],
        headers: {
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          Importance: 'Normal',
        },
      });
      return true;
    } catch (error) {
      console.error('[NodemailerEmailService] Error enviando email', error);
      return false;
    }
  }

  private async sendUserCreated(userId: number): Promise<boolean> {
    const user = await userService.findUserById(userId);
    if (!user) return false;

    const displayName = user.name ?? user.email;
    const html = getUserCreatedTemplate({
      userName: displayName,
      userEmail: user.email,
      role: user.role,
    });
    const text = getUserCreatedTextTemplate({
      userName: displayName,
      userEmail: user.email,
      role: user.role,
    });

    return this.sendEmail({
      to: user.email,
      subject: 'Bienvenido a Finnegans Salas',
      html,
      text,
      attachments: this.getLogoAttachment(),
    });
  }

  private async sendCheckInReminder(
    userEmail: string,
    roomEmail: string,
    eventId: string
  ): Promise<boolean> {
    const [user, event] = await Promise.all([
      userService.findUserByEmail(userEmail),
      eventService.getEventById(eventId),
    ]);
    if (!user || !event) return false;

    const room = await roomService.fetchRoom(roomEmail);
    const displayName = user.name ?? user.email;
    const eventName = event.title;
    const roomName = room?.name ?? 'Sala';
    const startTime = event.startTime.toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    const html = getCheckInReminderTemplate({
      userName: displayName,
      eventName,
      roomName,
      startTime,
    });
    const text = getCheckInReminderTextTemplate({
      userName: displayName,
      eventName,
      roomName,
      startTime,
    });

    return this.sendEmail({
      to: user.email,
      subject: `Recordatorio de check-in: "${eventName}"`,
      html,
      text,
      attachments: this.getLogoAttachment(),
    });
  }

  private async sendCheckInSuccess(
    userEmail: string,
    eventId: string,
    roomEmail: string,
    checkInTime: Date
  ): Promise<boolean> {
    const [user, event] = await Promise.all([
      userService.findUserByEmail(userEmail),
      eventService.getEventById(eventId),
    ]);
    if (!user || !event) return false;

    const room = await roomService.fetchRoom(roomEmail);
    const displayName = user.name ?? user.email;
    const eventName = event.title;
    const roomName = room?.name ?? 'Sala';
    const checkInTimeText = checkInTime.toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    const html = getCheckInSuccessTemplate({
      userName: displayName,
      eventName,
      roomName,
      checkInTime: checkInTimeText,
    });
    const text = getCheckInSuccessTextTemplate({
      userName: displayName,
      eventName,
      roomName,
      checkInTime: checkInTimeText,
    });

    return this.sendEmail({
      to: user.email,
      subject: `Check-in confirmado: "${eventName}"`,
      html,
      text,
      attachments: this.getLogoAttachment(),
    });
  }

  async sendNotificationEmail(input: NotificationInput): Promise<boolean> {
    if (input.type === 'USER_CREATED') {
      return this.sendUserCreated(input.userId);
    }
    if (input.type === 'CHECK_IN_REMINDER') {
      return this.sendCheckInReminder(input.userEmail, input.roomEmail, input.eventId);
    }
    if (input.type === 'CHECK_IN_SUCCESS') {
      return this.sendCheckInSuccess(
        input.userEmail,
        input.eventId,
        input.roomEmail,
        input.checkInTime
      );
    }
    return false;
  }
}

export default new NodemailerService();
