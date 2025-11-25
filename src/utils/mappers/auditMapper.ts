import { AuditDTO } from '../../dtos/auditDTO';
import Audit from '../../models/audit';

export const mapAuditToDTO = (audit: Audit): AuditDTO => {
  return {
    id: audit.id,
    userEmail: audit.userEmail ?? null,
    action: audit.action,
    eventId: audit.eventId ?? null,
    reason: audit.reason ?? null,
    createdAt: new Date(audit.createdAt),
    updatedAt: new Date(audit.updatedAt),
  };
};

export const mapAuditsToDTO = (audits: Audit[]): AuditDTO[] => {
  return audits.map(mapAuditToDTO);
};
