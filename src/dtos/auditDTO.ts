export interface AuditDTO {
  id: number;
  userEmail: string | null;
  action: string;
  eventId: string | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditListResponseDTO {
  items: AuditDTO[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}