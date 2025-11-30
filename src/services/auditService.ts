import { AuditAction } from '../constants/auditActions';
import { AuditListResponseDTO } from '../dtos/auditDTO';
import { InternalServerError } from '../errors/AppError';
import { Audit } from "../models";
import { mapAuditsToDTO } from '../utils/mappers/auditMapper';
import { buildAuditFilters, calculateOffset, calculateTotalPages, normalizePage, normalizePerPage } from '../utils/paginationUtils';

class AuditService {
  // Método genérico para registrar eventos de auditoría
  async record(
    action: AuditAction,
    userEmail?: string | null,
    eventId?: string | null,
    roomEmail?: string | null,
    info?: string | null
  ): Promise<void> {
    try {
      await Audit.create({
        userEmail: userEmail ?? null,
        action,
        eventId: eventId ?? null,
        roomEmail: roomEmail ?? null,
        info: info ?? null,
      });
    } catch (err) {
      console.error(`[AuditService] Error al registrar auditoría (${action}):`, err);
    }
  }

  // ======= Auditorías de login/logout =======
  async recordLogin(userEmail?: string | null, userName?: string | null): Promise<void> {
    const details = `Usuario: ${userName || userEmail}`;
    return this.record(AuditAction.LOGIN_SUCCESS, userEmail, null, null, details);
  }

  async recordLoginFailed(userEmail?: string | null, info?: string | null, userName?: string | null): Promise<void> {
    const details = `Usuario: ${userName || userEmail}${info ? `, Razón: ${info}` : ''}`;
    return this.record(AuditAction.LOGIN_FAILED, userEmail, null, null, details);
  }

  async recordLogout(userEmail?: string | null, userName?: string | null): Promise<void> {
    const details = `Usuario: ${userName || userEmail}`;
    return this.record(AuditAction.LOGOUT, userEmail, null, null, details);
  }

  async recordAuthInvalidToken(userEmail?: string | null, reason?: string | null): Promise<void> {
    const details = `Razón: ${reason || 'Token inválido'}`;
    return this.record(AuditAction.AUTH_INVALID_TOKEN, userEmail, null, null, details);
  }

  async recordAuthUserRejected(userId?: string | null, reason?: string | null): Promise<void> {
    const details = `Usuario ID: ${userId}, Razón: ${reason || 'Usuario no existe en BD'}`;
    return this.record(AuditAction.AUTH_USER_REJECTED, null, null, null, details);
  }

  // ======= Auditorías de check-in =======
  async recordCheckin(
    userEmail?: string | null,
    userName?: string | null,
    eventId?: string | null,
    eventTitle?: string | null,
    roomEmail?: string | null,
    roomName?: string | null
  ): Promise<void> {
    const details = `Usuario: ${userName || userEmail}, Evento: ${eventTitle || 'Sin título'}${roomName ? `, Sala: ${roomName}` : ''}`;
    return this.record(AuditAction.CHECKIN_SUCCESS, userEmail, eventId, roomEmail, details);
  }

  async recordCheckinFailed(
    userEmail?: string | null,
    userName?: string | null,
    eventId?: string | null,
    info?: string | null
  ): Promise<void> {
    const details = `Usuario: ${userName || userEmail}${info ? `, Razón: ${info}` : ''}`;
    return this.record(AuditAction.CHECKIN_FAILED, userEmail, eventId, null, details);
  }

  // ======= Auditorías de usuarios =======
  async recordUserCreated(userEmail: string, userName?: string | null): Promise<void> {
    const details = `Usuario creado: ${userName || userEmail}`;
    return this.record(AuditAction.USER_CREATED, userEmail, null, null, details);
  }

  async recordUserUpdated(userEmail: string, info?: string | null): Promise<void> {
    const details = `Usuario: ${userEmail}${info ? `, ${info}` : ''}`;
    return this.record(AuditAction.USER_UPDATED, userEmail, null, null, details);
  }

  // ======= Auditorías de eventos =======
  async recordEventCreated(
    eventId: string,
    eventTitle?: string | null,
    roomName?: string | null
  ): Promise<void> {
    const details = `Evento: ${eventTitle || 'Sin título'}${roomName ? `, Sala: ${roomName}` : ''}`;
    return this.record(AuditAction.EVENT_CREATED, null, eventId, null, details);
  }

  async recordEventUpdated(
    eventId: string,
    eventTitle?: string | null
  ): Promise<void> {
    const details = `Evento: ${eventTitle || 'Sin título'}`;
    return this.record(AuditAction.EVENT_UPDATED, null, eventId, null, details);
  }

  async recordEventDeleted(
    eventId: string,
    eventTitle?: string | null,
    info?: string | null
  ): Promise<void> {
    const details = `Evento: ${eventTitle || 'Sin título'}${info ? `, ${info}` : ''}`;
    return this.record(AuditAction.EVENT_DELETED, null, eventId, null, details);
  }

  async recordEventMarkedOverlap(
    eventId: string,
    eventTitle?: string | null,
    info?: string | null
  ): Promise<void> {
    const details = `Evento: ${eventTitle || 'Sin título'}${info ? `, ${info}` : ''}`;
    return this.record(AuditAction.EVENT_MARKED_OVERLAP, null, eventId, null, details);
  }

  async recordCheckInExpired(
    eventId: string,
    eventTitle?: string | null,
    roomName?: string | null
  ): Promise<void> {
    const details = `Evento: ${eventTitle || 'Sin título'}${roomName ? `, Sala: ${roomName}` : ''}, Check-in expirado`;
    return this.record(AuditAction.CHECKIN_EXPIRED, null, eventId, null, details);
  }

  // ======= Auditorías de salas =======
  async recordRoomAdded(roomEmail: string, roomName?: string | null): Promise<void> {
    const details = `Sala: ${roomName || roomEmail}`;
    return this.record(AuditAction.ROOM_ADDED, null, null, roomEmail, details);
  }

  async recordRoomDeleted(roomEmail: string, roomName?: string | null): Promise<void> {
    const details = `Sala: ${roomName || roomEmail}`;
    return this.record(AuditAction.ROOM_DELETED, null, null, roomEmail, details);
  }

  async recordRoomRestored(roomEmail: string, roomName?: string | null): Promise<void> {
    const details = `Sala: ${roomName || roomEmail}`;
    return this.record(AuditAction.ROOM_RESTORED, null, null, roomEmail, details);
  }

  async recordRoomBusy(roomEmail: string, eventId?: string | null, eventTitle?: string | null, roomName?: string | null): Promise<void> {
    const details = `Sala: ${roomName || roomEmail}${eventTitle ? `, Evento: ${eventTitle}` : ''}`;
    return this.record(AuditAction.ROOM_BUSY, null, eventId, roomEmail, details);
  }

  async recordRoomAvailable(roomEmail: string, roomName?: string | null): Promise<void> {
    const details = `Sala: ${roomName || roomEmail}`;
    return this.record(AuditAction.ROOM_AVAILABLE, null, null, roomEmail, details);
  }

  async listAudits(queryParams: any): Promise<AuditListResponseDTO> {
    try {
      const page = normalizePage(queryParams.page);
      const perPage = normalizePerPage(queryParams.perPage);
      const offset = calculateOffset(page, perPage);
      const where = buildAuditFilters(queryParams);

      const result = await Audit.findAndCountAll({
        where,
        limit: perPage,
        offset,
        order: [['createdAt', 'DESC']],
      });

      return {
        items: mapAuditsToDTO(result.rows),
        total: result.count,
        page,
        perPage,
        totalPages: calculateTotalPages(result.count, perPage),
      };
    } catch (error) {
      console.error('[AuditService] Error al listar auditorías:', error);
      throw new InternalServerError('Error al obtener auditorías');
    }
  }
}

export default new AuditService();