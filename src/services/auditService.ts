import Audit from "../models/audit";
import { AuditDTO } from "../dtos/auditDTO";

type AuditPayload = {
  userEmail?: string | null;
  action: "LOGIN" | "LOGOUT" | "CHECKIN";
  eventId?: string | null;
};

const log = async (payload: AuditPayload): Promise<void> => {
  try {
    await Audit.create({
      userEmail: payload.userEmail ?? null,
      action: payload.action,
      eventId: payload.eventId ?? null,
    });
  } catch (err) {
    // No romper el flujo de la app si falla la auditoría
    // eslint-disable-next-line no-console
    console.error("auditService.log error:", err);
  }
};

const recordLogin = async (userEmail?: string | null): Promise<void> => {
  await log({ userEmail: userEmail ?? null, action: "LOGIN" });
};

const recordLogout = async (userEmail?: string | null): Promise<void> => {
  await log({ userEmail: userEmail ?? null, action: "LOGOUT" });
};

const recordCheckin = async (userEmail?: string | null, eventId?: string | null): Promise<void> => {
  await log({ userEmail: userEmail ?? null, action: "CHECKIN", eventId: eventId ?? null });
};

/**
 * getAllAudits: devuelve hasta `limit` registros ordenados por createdAt desc.
 */
const getAllAudits = async (limit?: number): Promise<AuditDTO[]> => {
  const maxLimit = 200;
  const safeLimit = Math.min(Number(limit ?? 100), maxLimit);

  const rows = await Audit.findAll({
    order: [["createdAt", "DESC"]],
    limit: safeLimit,
    raw: true,
  });

  return (rows as any[]).map((r) => ({
    id: r.id,
    userEmail: r.userEmail ?? null,
    action: r.action,
    eventId: r.eventId ?? null,
    createdAt: (r.createdAt instanceof Date) ? r.createdAt.toISOString() : String(r.createdAt),
    updatedAt: (r.updatedAt instanceof Date) ? r.updatedAt.toISOString() : String(r.updatedAt),
  }));
};

export default {
  log,
  recordLogin,
  recordLogout,
  recordCheckin,
  getAllAudits,
};