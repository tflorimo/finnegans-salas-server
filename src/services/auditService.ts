import Audit from '../models/audit';
import { Op } from 'sequelize';
import { AuditListResponseDTO } from '../dtos/auditDTO';
import { mapAuditsToDTO } from '../utils/mappers/auditMapper';

class AuditService {
  // funciones de guardado de auditoria segun corresponda 
  async recordLogin(userEmail?: string | null): Promise<void> {
    try {
      await Audit.create({
        userEmail: userEmail ?? null,
        action: 'LOGIN_SUCCESS',
      });
    } catch (err) {
      console.error("Audit error (recordLogin):", err);
    }
  }

  async recordLoginFailed(userEmail?: string | null, reason?: string | null): Promise<void> {
    try {
      await Audit.create({
        userEmail: userEmail ?? null,
        action: 'LOGIN_FAILED',
        reason: reason ?? null,
      });
    } catch (err) {
      console.error("Audit error (recordLoginFailed):", err);
    }
  }

  async recordLogout(userEmail?: string | null): Promise<void> {
    try {
      await Audit.create({
        userEmail: userEmail ?? null,
        action: 'LOGOUT',
      });
    } catch (err) {
      console.error("Audit error (recordLogout):", err);
    }
  }

  async recordCheckin(userEmail?: string | null, eventId?: string | null): Promise<void> {
    try {
      await Audit.create({
        userEmail: userEmail ?? null,
        action: 'CHECKIN_SUCCESS',
        eventId: eventId ?? null,
      });
    } catch (err) {
      console.error("Audit error (recordCheckin):", err);
    }
  }

  async recordCheckinFailed(
    userEmail?: string | null,
    eventId?: string | null,
    reason?: string | null
  ): Promise<void> {
    try {
      await Audit.create({
        userEmail: userEmail ?? null,
        action: 'CHECKIN_FAILED',
        eventId: eventId ?? null,
        reason: reason ?? null,
      });
    } catch (err) {
      console.error("Audit error (recordCheckinFailed):", err);
    }
  }

  // Listado de auditorias por paginado
  async listAudits(queryParams: any): Promise<AuditListResponseDTO> {
    // Mapeo  y validacion de parámetros
    const params = {
      ...(queryParams.page && { page: Number(queryParams.page) }),
      ...(queryParams.perPage && { perPage: Number(queryParams.perPage) }),
      ...(queryParams.action && { action: String(queryParams.action) }),
      ...(queryParams.reason && { reason: String(queryParams.reason) }),
      ...(queryParams.userEmail && { userEmail: String(queryParams.userEmail) }),
      ...(queryParams.startDate && { startDate: String(queryParams.startDate) }),
      ...(queryParams.endDate && { endDate: String(queryParams.endDate) })
    };

    const page = Math.max(1, params.page ?? 1);
    const perPage = Math.min(200, Math.max(1, params.perPage ?? 25));

    const where: any = {};

    if (params.action) where.action = params.action;
    if (params.reason) where.reason = params.reason;
    if (params.userEmail) where.userEmail = params.userEmail;

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt[Op.gte] = new Date(params.startDate);
      if (params.endDate) where.createdAt[Op.lte] = new Date(params.endDate);
    }

    const offset = (page - 1) * perPage;

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
      totalPages: Math.ceil(result.count / perPage),
    };
  }
}

export const auditService = new AuditService();