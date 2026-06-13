export class CreateAuditLogDto {
  userId?: number;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  actionType: string;
  description: string;
  status?: string;
  ipAddress?: string;
  userAgent?: string;
  entityType?: string;
  entityId?: string;
  metadata?: any;
  actionDetails?: any;
}

export class GetAuditLogsQueryDto {
  page?: number;
  limit?: number;
  userId?: number;
  userEmail?: string;
  userRole?: string;
  actionType?: string;
  status?: string;
  entityType?: string;
  entityId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}