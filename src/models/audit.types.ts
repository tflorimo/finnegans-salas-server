import { AuditAction } from '../constants/auditActions';

export interface AuditAttributes {
  id: number;
  userEmail?: string | null;
  action: AuditAction;
  eventId?: string | null;
  roomEmail?: string | null;
  info?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}
