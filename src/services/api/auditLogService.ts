import { apiClient } from './client';
import type { AuditLog } from '@/types/auditLog.types';

export interface AuditLogFilters {
  search?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedAuditLogs {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const auditLogService = {
  getAll: async (filters?: AuditLogFilters): Promise<PaginatedAuditLogs> => {
    const response = await apiClient.get('/audit-logs', { params: filters });
    const body = response.data;
    if (Array.isArray(body)) {
      return {
        data: body,
        total: body.length,
        page: filters?.page ?? 1,
        pageSize: filters?.pageSize ?? body.length,
        totalPages: 1,
      };
    }
    return body;
  },
};
