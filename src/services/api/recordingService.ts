import { apiClient } from './client';
import type { Recording } from '@/types/recording.types';

export interface RecordingFilters {
  cameraId?: string;
  classroomId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export const recordingService = {
  getAll: async (filters?: RecordingFilters): Promise<Recording[]> => {
    const response = await apiClient.get('/recordings', { params: filters });
    const body = response.data;
    return Array.isArray(body) ? body : (body?.data ?? []);
  },

  getById: async (id: string): Promise<Recording> => {
    const response = await apiClient.get(`/recordings/${id}`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/recordings/${id}`);
  },

  getStorageStats: async (): Promise<{ totalSize: number; count: number }> => {
    const response = await apiClient.get('/recordings/stats/storage');
    return response.data;
  },
};
