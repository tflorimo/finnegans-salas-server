import { AuditAction } from '../constants/auditActions';
import { Optional } from 'sequelize';

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

export type AuditCreationAttributes = Optional<AuditAttributes, 'id' | 'userEmail' | 'eventId' | 'roomEmail' | 'info'>;
