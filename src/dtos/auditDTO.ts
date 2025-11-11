export interface AuditDTO {
  id?: number;
  userEmail?: string | null;
  action: "LOGIN" | "LOGOUT" | "CHECKIN";
  eventId?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export default AuditDTO;