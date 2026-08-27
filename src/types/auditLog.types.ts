export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  result: 'success' | 'failure';
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}
