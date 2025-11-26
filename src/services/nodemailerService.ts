import { sendEmail } from '../config/nodemailer';
import {
  getUserCreatedTemplate,
  getCheckInReminderTemplate,
  getCheckInSuccessTemplate,
} from '../templates/emailTemplates';
import { removeAccents } from '../utils/stringUtils';
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
}

export class NodemailerService {
  private async sendEmailInternal(options: SendEmailOptions): Promise<boolean> {
    try {
      await sendEmail({
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      return true;
    } catch (error) {
      console.error('[NodemailerEmailService] Error al enviar email', error);
      return false;
    }
  }

  private async sendUserCreated(userId: number): Promise<boolean> {
    try {
      const user = await userService.findUserById(userId);
      if (!user) return false;

      const displayName = user.name ?? user.email;
      const html = getUserCreatedTemplate({
        userName: displayName,
        userEmail: user.email,
        role: user.role,
      });

      return this.sendEmailInternal({
        to: user.email,
        subject: 'Bienvenido a Finnegans Salas',
        html,
      });
    } catch (error) {
      console.error(`[NodemailerService] Error enviando email de usuario creado: ${userId}`, error);
      throw error;
    }
  }

  private async sendCheckInReminder(
    userEmail: string,
    roomEmail: string,
    eventId: string
  ): Promise<boolean> {
    try {
      const [user, event] = await Promise.all([
        userService.findUserByEmail(userEmail),
        eventService.getEventById(eventId),
      ]);
      if (!user || !event) return false;

      const room = await roomService.fetchRoom(roomEmail);
      const displayName = user.name ?? user.email;
      const eventName = event.title;
      const eventNameClean = removeAccents(event.title);
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

      return this.sendEmailInternal({
        to: user.email,
        subject: `Recordatorio de check-in: "${eventNameClean}"`,        html,
      });
    } catch (error) {
      console.error(`[NodemailerService] Error enviando recordatorio de check-in: ${eventId}`, error);
      throw error;
    }
  }

  private async sendCheckInSuccess(
    userEmail: string,
    eventId: string,
    roomEmail: string,
    checkInTime: Date
  ): Promise<boolean> {
    try {
      const [user, event] = await Promise.all([
        userService.findUserByEmail(userEmail),
        eventService.getEventById(eventId),
      ]);
      if (!user || !event) return false;

      const room = await roomService.fetchRoom(roomEmail);
      const displayName = user.name ?? user.email;
      const eventName = event.title;
      const eventNameClean = removeAccents(event.title);
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

      return this.sendEmailInternal({
        to: user.email,
        subject: `Check-in exitoso: "${eventNameClean}"`,
        html,
      });
    } catch (error) {
      console.error(`[NodemailerService] Error enviando confirmación de check-in: ${eventId}`, error);
      throw error;
    }
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
