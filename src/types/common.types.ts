export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ProcessingState = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type UserRole = 'super_admin' | 'admin' | 'faculty' | 'security' | 'viewer';
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export type CameraStatus = 'online' | 'offline' | 'connecting' | 'error';
export type SystemStatus = 'online' | 'degraded' | 'offline' | 'maintenance';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, string>;
}

export interface DateRange {
  from: Date;
  to: Date;
}
