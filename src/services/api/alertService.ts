import { apiClient } from './client';
import type { Alert, AlertStatus } from '@/types/alert.types';

export const alertService = {
  getAll: async (status?: AlertStatus): Promise<Alert[]> => {
    const response = await apiClient.get('/alerts', { params: { status } });
    return response.data;
  },
  getById: async (id: string): Promise<Alert> => {
    const response = await apiClient.get(`/alerts/${id}`);
    return response.data;
  },
  acknowledge: async (id: string): Promise<Alert> => {
    const response = await apiClient.post(`/alerts/${id}/acknowledge`);
    return response.data;
  },
  resolve: async (id: string): Promise<Alert> => {
    const response = await apiClient.post(`/alerts/${id}/resolve`);
    return response.data;
  },
  assign: async (id: string, userId: string): Promise<Alert> => {
    const response = await apiClient.post(`/alerts/${id}/assign`, { userId });
    return response.data;
  }
};
