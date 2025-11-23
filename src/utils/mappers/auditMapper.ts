import { AuditDTO } from '../../dtos/auditDTO';
import Audit from '../../models/audit';

export const mapAuditToDTO = (audit: Audit): AuditDTO => {
  return {
    id: audit.id,
    userEmail: audit.userEmail,
    action: audit.action,
    eventId: audit.eventId,
    reason: audit.reason,
    createdAt: audit.createdAt,
    updatedAt: audit.updatedAt
  };
};

export const mapAuditsToDTO = (audits: Audit[]): AuditDTO[] => {
  return audits.map(audit => mapAuditToDTO(audit));
};